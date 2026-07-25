#!/usr/bin/env python3
"""Personal Telegram interface for running Codex in this repository.

The implementation intentionally uses only Python's standard library. Codex is
started as a subprocess and Telegram is accessed through its HTTPS Bot API.
"""

from __future__ import annotations

import fcntl
import base64
import json
import mimetypes
import os
import re
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


TELEGRAM_MESSAGE_LIMIT = 4096
MAX_TELEGRAM_UPLOAD_BYTES = 49 * 1024 * 1024
DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"
DEFAULT_VISION_MODEL = "gpt-5.6-luna"
DEFAULT_IMAGE_MODEL = "gpt-image-2"
DEFAULT_IMAGE_SIZE = "1024x1024"
DEFAULT_IMAGE_QUALITY = "medium"
PROJECT_INSTRUCTIONS = """Работай только над проектом Dimohod Trade в текущем каталоге.
Перед изменениями прочитай PROJECT_CONTEXT.md и NEXT_STEPS.md.
Сохраняй существующие пользовательские незакоммиченные изменения. Не изменяй prices/ и
backend/configurator/chimney-configurator-png.html, если задача явно этого не требует.
Выполни запрос, проверь результат подходящими тестами и кратко сообщи итог.
Финальный ответ оформляй Telegram-совместимым Markdown: *жирный текст*, списки, `inline code`
и блоки кода. Не используй Markdown-таблицы и HTML.
Если пользователь просит прислать файл из проекта, в финальном ответе добавь отдельной строкой
[[send_file:relative/path/to/file]] — бот отправит этот файл в Telegram.
Git commit/push и production deploy выполняются отдельными командами Telegram-бота:
/commit, /push, /deploy или /ship. Не пытайся обходить sandbox ради записи в .git, сети или Docker.

Запрос пользователя из Telegram:
"""

DEPLOY_BRANCH = "ui/replit-port"
PENDING_ACTION_TTL_SECONDS = 300
PROTECTED_COMMIT_PATHS = (
    "prices/",
    "backend/configurator/chimney-configurator-png.html",
    ".codex-telegram/",
    ".env",
)
RELEASE_CONFIRM_KEYBOARD = {
    "inline_keyboard": [
        [
            {"text": "✅ Подтвердить", "callback_data": "release:confirm"},
            {"text": "❌ Отмена", "callback_data": "release:abort"},
        ]
    ]
}


def load_dotenv(path: Path) -> None:
    """Load simple KEY=VALUE entries without overriding the process environment."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if value and value[0:1] == value[-1:] and value.startswith(("'", '"')):
            value = value[1:-1]
        if key:
            os.environ.setdefault(key, value)


def split_message(text: str, limit: int = 3800) -> list[str]:
    """Split long text on line boundaries while respecting Telegram's limit."""
    text = text.strip()
    if not text:
        return []
    chunks: list[str] = []
    while len(text) > limit:
        split_at = text.rfind("\n", 0, limit + 1)
        if split_at < limit // 2:
            split_at = text.rfind(" ", 0, limit + 1)
        if split_at < limit // 2:
            split_at = limit
        chunks.append(text[:split_at].rstrip())
        text = text[split_at:].lstrip()
    if text:
        chunks.append(text)
    return chunks


def guess_mime_type(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def encode_multipart_payload(
    fields: dict[str, str],
    files: list[tuple[str, Path, str, str]],
) -> tuple[bytes, str]:
    boundary = f"codex-telegram-{uuid.uuid4().hex}"
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(value.encode("utf-8"))
        body.extend(b"\r\n")
    for field_name, file_path, filename, mime_type in files:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(
            (
                f'Content-Disposition: form-data; name="{field_name}"; '
                f'filename="{filename}"\r\n'
            ).encode()
        )
        body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode())
        body.extend(file_path.read_bytes())
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def safe_project_file(project_root: Path, requested_path: str) -> Path:
    path_text = requested_path.strip().strip("\"'")
    if not path_text:
        raise ValueError("Укажите путь к файлу")
    candidate = (project_root / path_text).resolve()
    root = project_root.resolve()
    if candidate == root or root not in candidate.parents:
        raise ValueError("Можно отправлять только файлы внутри проекта")
    if not candidate.exists():
        raise FileNotFoundError(path_text)
    if not candidate.is_file():
        raise ValueError("Это не файл")
    if candidate.stat().st_size > MAX_TELEGRAM_UPLOAD_BYTES:
        raise ValueError("Файл слишком большой для отправки в Telegram")
    return candidate


SEND_FILE_RE = re.compile(r"^\s*\[\[send_file:(?P<path>[^\]]+)]]\s*$", re.MULTILINE)
IMAGE_REQUEST_RE = re.compile(
    r"^\s*(?:сгенерируй|создай|нарисуй|сделай)\s+"
    r"(?:мне\s+)?(?:фото|картинку|изображение|рендер|иллюстрацию)\s*(?P<prompt>.*)$",
    re.IGNORECASE,
)


def extract_file_requests(text: str) -> tuple[str, list[str]]:
    paths = [match.group("path").strip() for match in SEND_FILE_RE.finditer(text)]
    clean_text = SEND_FILE_RE.sub("", text).strip()
    return clean_text, paths


def natural_image_prompt(text: str) -> str | None:
    match = IMAGE_REQUEST_RE.match(text.strip())
    if not match:
        return None
    prompt = (match.group("prompt") or "").strip(" :—-")
    return prompt or text.strip()


class TelegramError(RuntimeError):
    pass


class TelegramAPI:
    def __init__(self, token: str, timeout: int = 70) -> None:
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.file_base_url = f"https://api.telegram.org/file/bot{token}"
        self.timeout = timeout

    def call(self, method: str, payload: dict[str, Any] | None = None) -> Any:
        encoded = urllib.parse.urlencode(payload or {}).encode()
        request = urllib.request.Request(f"{self.base_url}/{method}", data=encoded)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                result = json.loads(response.read())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise TelegramError(f"Telegram API {method}: {exc}") from exc
        if not result.get("ok"):
            raise TelegramError(f"Telegram API {method}: {result.get('description', 'unknown error')}")
        return result.get("result")

    def call_multipart(
        self,
        method: str,
        fields: dict[str, str],
        file_field: str,
        file_path: Path,
        filename: str | None = None,
        mime_type: str | None = None,
    ) -> Any:
        body, content_type = encode_multipart_payload(
            fields,
            [
                (
                    file_field,
                    file_path,
                    filename or file_path.name,
                    mime_type or guess_mime_type(file_path),
                )
            ],
        )
        request = urllib.request.Request(
            f"{self.base_url}/{method}",
            data=body,
            headers={"Content-Type": content_type},
        )
        try:
            with urllib.request.urlopen(request, timeout=max(self.timeout, 180)) as response:
                result = json.loads(response.read())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise TelegramError(f"Telegram API {method}: {exc}") from exc
        if not result.get("ok"):
            raise TelegramError(f"Telegram API {method}: {result.get('description', 'unknown error')}")
        return result.get("result")

    def get_updates(self, offset: int | None) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {
            "timeout": 50,
            "allowed_updates": json.dumps(["message", "callback_query"]),
        }
        if offset is not None:
            payload["offset"] = offset
        return self.call("getUpdates", payload)

    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_to: int | None = None,
        *,
        markdown: bool = False,
        reply_markup: dict[str, Any] | None = None,
    ) -> int:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text[:TELEGRAM_MESSAGE_LIMIT],
            "disable_web_page_preview": "true",
        }
        if reply_to is not None:
            payload["reply_parameters"] = json.dumps({"message_id": reply_to})
        if markdown:
            payload["parse_mode"] = "Markdown"
        if reply_markup:
            payload["reply_markup"] = json.dumps(reply_markup, ensure_ascii=False)
        try:
            result = self.call("sendMessage", payload)
        except TelegramError:
            if not markdown:
                raise
            payload.pop("parse_mode", None)
            result = self.call("sendMessage", payload)
        return int(result["message_id"])

    def send_long_message(
        self, chat_id: int, text: str, reply_to: int | None = None, *, markdown: bool = False
    ) -> None:
        for index, chunk in enumerate(split_message(text)):
            self.send_message(
                chat_id,
                chunk,
                reply_to if index == 0 else None,
                markdown=markdown,
            )

    def answer_callback_query(self, callback_query_id: str, text: str = "") -> None:
        payload = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text[:200]
        self.call("answerCallbackQuery", payload)

    def clear_inline_keyboard(self, chat_id: int, message_id: int) -> None:
        self.call(
            "editMessageReplyMarkup",
            {
                "chat_id": chat_id,
                "message_id": message_id,
                "reply_markup": json.dumps({"inline_keyboard": []}),
            },
        )

    def send_document(self, chat_id: int, path: Path, caption: str = "") -> int:
        result = self.call_multipart(
            "sendDocument",
            {"chat_id": str(chat_id), "caption": caption[:1024]},
            "document",
            path,
        )
        return int(result["message_id"])

    def send_photo(self, chat_id: int, path: Path, caption: str = "") -> int:
        result = self.call_multipart(
            "sendPhoto",
            {"chat_id": str(chat_id), "caption": caption[:1024]},
            "photo",
            path,
        )
        return int(result["message_id"])

    def edit_message(self, chat_id: int, message_id: int, text: str) -> None:
        try:
            self.call(
                "editMessageText",
                {"chat_id": chat_id, "message_id": message_id, "text": text[:TELEGRAM_MESSAGE_LIMIT]},
            )
        except TelegramError as exc:
            if "message is not modified" not in str(exc):
                raise

    def send_action(self, chat_id: int, action: str = "typing") -> None:
        self.call("sendChatAction", {"chat_id": chat_id, "action": action})

    def download_file(self, file_id: str, destination: Path) -> None:
        file_info = self.call("getFile", {"file_id": file_id})
        request = urllib.request.Request(f"{self.file_base_url}/{file_info['file_path']}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            destination.write_bytes(response.read())

    def download_voice(self, file_id: str, destination: Path) -> None:
        self.download_file(file_id, destination)


class StateStore:
    def __init__(self, path: Path, configured_users: set[int] | None = None) -> None:
        self.path = path
        self.lock = threading.RLock()
        self.data: dict[str, Any] = {"owner_user_id": None, "threads": {}}
        self.configured_users = configured_users or set()
        if path.exists():
            try:
                saved = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(saved, dict):
                    self.data.update(saved)
            except (OSError, json.JSONDecodeError):
                pass

    def save(self) -> None:
        with self.lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(".tmp")
            temporary.write_text(
                json.dumps(self.data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            os.chmod(temporary, 0o600)
            temporary.replace(self.path)

    def is_authorized(self, user_id: int) -> bool:
        with self.lock:
            owner = self.data.get("owner_user_id")
            return user_id == owner or user_id in self.configured_users

    def claim(self, user_id: int, is_private_chat: bool) -> bool:
        with self.lock:
            if self.is_authorized(user_id):
                return True
            if (
                self.configured_users
                or self.data.get("owner_user_id") is not None
                or not is_private_chat
            ):
                return False
            self.data["owner_user_id"] = user_id
            self.save()
            return True

    def get_thread(self, chat_id: int) -> str | None:
        with self.lock:
            return self.data.setdefault("threads", {}).get(str(chat_id))

    def set_thread(self, chat_id: int, thread_id: str | None) -> None:
        with self.lock:
            threads = self.data.setdefault("threads", {})
            if thread_id:
                threads[str(chat_id)] = thread_id
            else:
                threads.pop(str(chat_id), None)
            self.save()


@dataclass
class RunningTask:
    process: subprocess.Popen[str] | None = None
    cancel_requested: bool = False


@dataclass
class StatusSummary:
    started_at: float = field(default_factory=time.monotonic)
    commands_started: int = 0
    commands_completed: int = 0
    files_changed: int = 0
    last_action: str = "Запускаю Codex…"
    final_response: str = ""
    thread_id: str | None = None
    cancelled: bool = False

    def render(self) -> str:
        elapsed = int(time.monotonic() - self.started_at)
        return (
            "⏳ Codex работает\n"
            f"Время: {elapsed // 60}:{elapsed % 60:02d}\n"
            f"Команды: {self.commands_completed}/{self.commands_started}\n"
            f"Изменения файлов: {self.files_changed}\n"
            f"Сейчас: {self.last_action[:500]}"
        )


def compact_command(command: Any) -> str:
    if isinstance(command, list):
        command = " ".join(str(item) for item in command)
    command = re.sub(r"\s+", " ", str(command or "команда")).strip()
    return command[:240]


def consume_codex_event(event: dict[str, Any], summary: StatusSummary) -> bool:
    """Update a user-facing summary. Returns True when the status materially changed."""
    event_type = event.get("type")
    if event_type == "thread.started":
        summary.thread_id = event.get("thread_id")
        return False
    if event_type in {"turn.failed", "error"}:
        summary.last_action = str(event.get("message") or event.get("error") or "Ошибка Codex")
        return True
    item = event.get("item") or {}
    item_type = item.get("type")
    if event_type == "item.started" and item_type == "command_execution":
        summary.commands_started += 1
        summary.last_action = f"Выполняю: {compact_command(item.get('command'))}"
        return True
    if event_type == "item.completed" and item_type == "command_execution":
        summary.commands_completed += 1
        summary.last_action = f"Готово: {compact_command(item.get('command'))}"
        return True
    if event_type == "item.completed" and item_type in {"file_change", "file_changes"}:
        changes = item.get("changes")
        summary.files_changed += len(changes) if isinstance(changes, list) else 1
        summary.last_action = "Применяю изменения файлов"
        return True
    if event_type == "item.completed" and item_type == "agent_message":
        summary.final_response = str(item.get("text") or "")
        summary.last_action = "Формирую ответ"
        return True
    if event_type == "turn.completed":
        summary.last_action = "Завершаю"
        return True
    return False


class CodexRunner:
    def __init__(self, project_root: Path, codex_binary: str, state: StateStore) -> None:
        self.project_root = project_root
        self.codex_binary = codex_binary
        self.state = state
        self.tasks: dict[int, RunningTask] = {}
        self.lock = threading.RLock()

    def is_running(self, chat_id: int) -> bool:
        with self.lock:
            return chat_id in self.tasks

    def cancel(self, chat_id: int) -> bool:
        with self.lock:
            task = self.tasks.get(chat_id)
            if not task:
                return False
            task.cancel_requested = True
            process = task.process
        if process and process.poll() is None:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        return True

    def build_command(self, chat_id: int, prompt: str) -> list[str]:
        common = [
            self.codex_binary,
            "exec",
            "--json",
            "--color",
            "never",
            "--cd",
            str(self.project_root),
            "--sandbox",
            "workspace-write",
        ]
        thread_id = self.state.get_thread(chat_id)
        if thread_id:
            return [*common, "resume", thread_id, prompt]
        return [*common, PROJECT_INSTRUCTIONS + prompt]

    def run(
        self,
        chat_id: int,
        prompt: str,
        on_status: Any,
    ) -> tuple[StatusSummary, int, str]:
        with self.lock:
            if chat_id in self.tasks:
                raise RuntimeError("Для этого чата уже выполняется задача")
            task = RunningTask()
            self.tasks[chat_id] = task

        summary = StatusSummary()
        diagnostic_lines: list[str] = []
        saved_thread_id = self.state.get_thread(chat_id)
        try:
            process = subprocess.Popen(
                self.build_command(chat_id, prompt),
                cwd=self.project_root,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                start_new_session=True,
            )
            task.process = process
            assert process.stdout is not None
            last_update = 0.0
            for line in process.stdout:
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    event = json.loads(stripped)
                except json.JSONDecodeError:
                    diagnostic_lines.append(stripped)
                    diagnostic_lines = diagnostic_lines[-12:]
                    continue
                changed = consume_codex_event(event, summary)
                if summary.thread_id and summary.thread_id != saved_thread_id:
                    self.state.set_thread(chat_id, summary.thread_id)
                    saved_thread_id = summary.thread_id
                now = time.monotonic()
                if changed and now - last_update >= 2.0:
                    on_status(summary.render())
                    last_update = now
            return_code = process.wait()
            summary.cancelled = task.cancel_requested
            return summary, return_code, "\n".join(diagnostic_lines)
        finally:
            with self.lock:
                self.tasks.pop(chat_id, None)


def encode_multipart(fields: dict[str, str], file_field: str, file_path: Path) -> tuple[bytes, str]:
    return encode_multipart_payload(fields, [(file_field, file_path, "voice.mp3", "audio/mpeg")])


def openai_json_request(openai_key: str, path: str, payload: dict[str, Any], timeout: int = 180) -> Any:
    request = urllib.request.Request(
        f"https://api.openai.com/v1/{path.lstrip('/')}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", "replace")[-1000:]
        raise RuntimeError(f"OpenAI HTTP {exc.code}: {details}") from exc


def extract_openai_output_text(result: dict[str, Any]) -> str:
    output_text = result.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()
    parts: list[str] = []
    for item in result.get("output", []) if isinstance(result.get("output"), list) else []:
        for content in item.get("content", []) if isinstance(item, dict) else []:
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    parts.append(text)
    return "\n".join(parts).strip()


def image_data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{guess_mime_type(path)};base64,{encoded}"


def analyze_photo(path: Path, caption: str, openai_key: str, model: str) -> str:
    prompt = caption.strip() or (
        "Опиши фото подробно по-русски. Если это изделие, чертёж, скриншот или ошибка, "
        "выдели важные детали, текст на изображении и возможные действия для проекта."
    )
    payload = {
        "model": model,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_data_url(path), "detail": "auto"},
                ],
            }
        ],
        "max_output_tokens": 900,
    }
    result = openai_json_request(openai_key, "responses", payload)
    text = extract_openai_output_text(result)
    if not text:
        raise RuntimeError("OpenAI vision вернул пустой ответ")
    return text


def generate_image(prompt: str, openai_key: str, model: str, size: str, quality: str, output_path: Path) -> Path:
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "quality": quality,
        "n": 1,
    }
    result = openai_json_request(openai_key, "images/generations", payload, timeout=300)
    data = result.get("data")
    if not isinstance(data, list) or not data:
        raise RuntimeError("OpenAI image generation вернул пустой результат")
    item = data[0]
    if not isinstance(item, dict):
        raise RuntimeError("OpenAI image generation вернул неожиданный формат")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(item.get("b64_json"), str):
        output_path.write_bytes(base64.b64decode(item["b64_json"]))
        return output_path
    if isinstance(item.get("url"), str):
        request = urllib.request.Request(item["url"])
        with urllib.request.urlopen(request, timeout=180) as response:
            output_path.write_bytes(response.read())
        return output_path
    raise RuntimeError("В ответе OpenAI нет ни b64_json, ни url")


def transcribe_voice(source: Path, openai_key: str, model: str) -> str:
    converted = source.with_suffix(".mp3")
    conversion = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-vn",
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "4",
            str(converted),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if conversion.returncode != 0:
        raise RuntimeError(f"ffmpeg: {conversion.stderr[-500:]}")
    body, content_type = encode_multipart(
        {"model": model, "language": "ru", "response_format": "json"}, "file", converted
    )
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=body,
        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": content_type},
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read())
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", "replace")[-1000:]
        raise RuntimeError(f"OpenAI transcription HTTP {exc.code}: {details}") from exc
    text = str(result.get("text") or "").strip()
    if not text:
        raise RuntimeError("Сервис транскрибации вернул пустой текст")
    return text


HELP_TEXT = """Я управляю Codex в проекте dimohod-trade.

Отправьте текст, голосовое или фото — это станет задачей для Codex.

Команды:
/status — ветка, изменения и активная задача
/file path/to/file — прислать файл из проекта
/image описание — сгенерировать изображение и прислать в чат
/commit сообщение — подготовить commit изменений
/publish сообщение — тесты → commit → push
/push — подготовить push текущей ветки
/deploy — подготовить Docker deploy backend + web
/ship сообщение — тесты → commit → push → deploy
/confirm — подтвердить подготовленное действие
/abort — отменить подготовленное действие
/new — начать новую сессию Codex
/cancel — остановить текущую задачу
/id — показать ваш Telegram user ID
/help — эта справка

Codex работает с sandbox=workspace-write. Одновременно в одном чате выполняется одна задача."""


def is_protected_commit_path(path: str) -> bool:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return any(
        normalized == protected.rstrip("/") or normalized.startswith(protected)
        for protected in PROTECTED_COMMIT_PATHS
    )


def run_host_command(args: list[str], cwd: Path, timeout: int = 1200) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    output = "\n".join(part.strip() for part in (result.stdout, result.stderr) if part.strip())
    if result.returncode != 0:
        raise RuntimeError(
            f"Команда завершилась с кодом {result.returncode}: {' '.join(args)}\n"
            f"{output[-5000:]}"
        )
    return output


@dataclass
class PendingAction:
    kind: str
    argument: str
    created_at: float = field(default_factory=time.monotonic)

    def expired(self) -> bool:
        return time.monotonic() - self.created_at > PENDING_ACTION_TTL_SECONDS


@dataclass(frozen=True)
class NaturalReleaseIntent:
    kind: str
    commit_message: str
    has_project_task: bool


def detect_natural_release_intent(text: str) -> NaturalReleaseIntent | None:
    """Recognize Russian release commands coming from text or speech transcription."""
    normalized = re.sub(r"\s+", " ", text.lower().replace("ё", "е")).strip()
    push_patterns = (
        r"\bзапуш(?:ь|ить|им|те)?\b",
        r"\bпуш(?:ь|ить|им|те)?\b",
        r"\bсделай(?:те)?\s+пуш\b",
        r"\bотправь(?:те)?\s+(?:изменения\s+)?в\s+github\b",
    )
    deploy_patterns = (
        r"\bзадепло(?:й|ить|им|йте)?\b",
        r"\bдепло(?:й|ить|им|йте)?\b",
        r"\bсделай(?:те)?\s+деплой\b",
        r"\bразверни(?:те)?\s+(?:изменения|сайт|проект)?\b",
    )
    commit_patterns = (
        r"\bзакоммит(?:ь|ить|им|ьте)?\b",
        r"\bсделай(?:те)?\s+коммит\b",
        r"\bсоздай(?:те)?\s+коммит\b",
    )
    release_patterns = (
        r"\bсделай(?:те)?\s+(?:полный\s+)?релиз\b",
        r"\bвыполни(?:те)?\s+(?:полный\s+)?релиз\b",
        r"\bполный\s+цикл\s+(?:релиза|публикации)\b",
    )

    def matches(patterns: tuple[str, ...]) -> bool:
        return any(re.search(pattern, normalized) for pattern in patterns)

    wants_push = matches(push_patterns)
    wants_deploy = matches(deploy_patterns)
    wants_commit = matches(commit_patterns)
    wants_release = matches(release_patterns)
    if not any((wants_push, wants_deploy, wants_commit, wants_release)):
        return None

    if wants_release or (wants_push and wants_deploy):
        kind = "ship"
    elif wants_commit and wants_push:
        kind = "publish"
    elif wants_deploy:
        kind = "deploy"
    elif wants_push:
        kind = "push"
    else:
        kind = "commit"

    remainder = normalized
    for pattern in (*push_patterns, *deploy_patterns, *commit_patterns, *release_patterns):
        remainder = re.sub(pattern, " ", remainder)
    remainder = re.sub(
        r"\b(?:пожалуйста|изменения|текущие|готовые|еще|раз|снова|повтори|попытку|"
        r"после|этого|потом|теперь|и|а|все|это|сайт|проект)\b",
        " ",
        remainder,
    )
    remainder = re.sub(r"[\s,.;:!?—-]+", " ", remainder).strip()
    task_verbs = (
        r"\bисправ(?:ь|ьте)\b",
        r"\bдобав(?:ь|ьте)\b",
        r"\bизмени(?:те)?\b",
        r"\bсоздай(?:те)?\b",
        r"\bреализуй(?:те)?\b",
        r"\bсверстай(?:те)?\b",
        r"\bобнови(?:те)?\b",
        r"\bудали(?:те)?\b",
        r"\bпереработай(?:те)?\b",
        r"\bнастрой(?:те)?\b",
        r"\bсделай(?:те)?\b",
    )
    has_project_task = bool(remainder) and any(
        re.search(pattern, remainder) for pattern in task_verbs
    )
    if has_project_task and kind == "push":
        kind = "publish"
    message_source = remainder or "Update dimohod-trade via Telegram"
    commit_message = re.sub(r"\s+", " ", message_source).strip(" .,:;!?—-")[:120]
    if not commit_message:
        commit_message = "Update dimohod-trade via Telegram"
    return NaturalReleaseIntent(kind, commit_message, has_project_task)


def detect_natural_confirmation(text: str) -> str | None:
    normalized = re.sub(r"[\s,.;:!?—-]+", " ", text.lower().replace("ё", "е")).strip()
    confirm_patterns = (
        r"^подтверждаю(?: запускай| выполняй)?$",
        r"^да запускай(?: релиз)?$",
        r"^запускай(?: релиз| публикацию)$",
        r"^выполняй(?: релиз| публикацию)$",
    )
    abort_patterns = (
        r"^отмена$",
        r"^отмени(?: релиз| публикацию| действие)?$",
        r"^не запускай(?: релиз| публикацию)?$",
        r"^не надо(?: запускать)?$",
    )
    if any(re.search(pattern, normalized) for pattern in confirm_patterns):
        return "confirm"
    if any(re.search(pattern, normalized) for pattern in abort_patterns):
        return "abort"
    return None


class ReleaseManager:
    """Narrow host-side Git and Docker operations unavailable inside Codex sandbox."""

    def __init__(self, project_root: Path, branch: str = DEPLOY_BRANCH) -> None:
        self.project_root = project_root
        self.branch = branch
        self.lock = threading.Lock()

    def is_running(self) -> bool:
        return self.lock.locked()

    def current_branch(self) -> str:
        return run_host_command(
            ["git", "branch", "--show-current"], self.project_root, timeout=10
        ).strip()

    def assert_branch(self) -> None:
        current = self.current_branch()
        if current != self.branch:
            raise RuntimeError(
                f"Операция разрешена только в ветке {self.branch}; текущая ветка: {current or '(нет)'}"
            )

    def status(self) -> str:
        return run_host_command(
            ["git", "status", "--short", "--branch", "--untracked-files=all"],
            self.project_root,
            timeout=20,
        )

    def staged_paths(self) -> list[str]:
        output = run_host_command(
            ["git", "diff", "--cached", "--name-only", "-z"],
            self.project_root,
            timeout=20,
        )
        return [path for path in output.split("\0") if path]

    def commit(self, message: str, *, skip_if_empty: bool = False) -> str:
        self.assert_branch()
        message = re.sub(r"\s+", " ", message).strip()
        if not message:
            raise RuntimeError("Нужно указать сообщение commit")
        if len(message) > 160:
            raise RuntimeError("Сообщение commit должно быть не длиннее 160 символов")

        already_staged = self.staged_paths()
        protected_staged = [path for path in already_staged if is_protected_commit_path(path)]
        if protected_staged:
            raise RuntimeError(
                "В index уже находятся защищённые пути; уберите их из staged вручную:\n"
                + "\n".join(protected_staged)
            )

        add_output = run_host_command(
            [
                "git",
                "add",
                "-A",
                "--",
                ".",
                ":(exclude)prices/**",
                ":(exclude)backend/configurator/chimney-configurator-png.html",
            ],
            self.project_root,
            timeout=60,
        )
        staged = self.staged_paths()
        if not staged:
            if skip_if_empty:
                return "Новых разрешённых изменений нет — commit пропущен."
            raise RuntimeError("Нет разрешённых изменений для commit")
        protected = [path for path in staged if is_protected_commit_path(path)]
        if protected:
            raise RuntimeError("Защищённые пути попали в staged:\n" + "\n".join(protected))
        commit_output = run_host_command(
            ["git", "commit", "-m", message], self.project_root, timeout=120
        )
        paths_preview = "\n".join(f"• {path}" for path in staged[:40])
        return "\n".join(part for part in (add_output, commit_output, paths_preview) if part)

    def push(self) -> str:
        self.assert_branch()
        return run_host_command(
            ["git", "push", "origin", f"HEAD:refs/heads/{self.branch}"],
            self.project_root,
            timeout=300,
        )

    def test(self) -> str:
        backend = run_host_command(
            ["docker", "compose", "exec", "-T", "backend", "pytest", "-q"],
            self.project_root,
            timeout=600,
        )
        frontend = run_host_command(
            ["npm", "run", "build:web"], self.project_root, timeout=900
        )
        return f"Backend:\n{backend}\n\nFrontend:\n{frontend}"

    def deploy(self) -> str:
        build = run_host_command(
            ["docker", "compose", "up", "-d", "--build", "backend", "web"],
            self.project_root,
            timeout=1200,
        )
        status = run_host_command(
            ["docker", "compose", "ps", "backend", "web"],
            self.project_root,
            timeout=60,
        )
        return f"{build}\n\n{status}"

    def execute(self, action: PendingAction) -> str:
        with self.lock:
            if action.kind == "commit":
                return self.commit(action.argument)
            if action.kind == "push":
                return self.push()
            if action.kind == "deploy":
                return self.deploy()
            if action.kind == "ship":
                tests = self.test()
                commit = self.commit(action.argument, skip_if_empty=True)
                push = self.push()
                deploy = self.deploy()
                return (
                    f"Тесты:\n{tests}\n\nCommit:\n{commit}\n\n"
                    f"Push:\n{push}\n\nDeploy:\n{deploy}"
                )
            if action.kind == "publish":
                tests = self.test()
                commit = self.commit(action.argument, skip_if_empty=True)
                push = self.push()
                return f"Тесты:\n{tests}\n\nCommit:\n{commit}\n\nPush:\n{push}"
            raise RuntimeError(f"Неизвестное действие: {action.kind}")


class BotApplication:
    def __init__(
        self,
        api: TelegramAPI,
        state: StateStore,
        runner: CodexRunner,
        project_root: Path,
        openai_key: str | None,
        transcribe_model: str,
        vision_model: str,
        image_model: str,
        image_size: str,
        image_quality: str,
        workers: int = 2,
    ) -> None:
        self.api = api
        self.state = state
        self.runner = runner
        self.project_root = project_root
        self.openai_key = openai_key
        self.transcribe_model = transcribe_model
        self.vision_model = vision_model
        self.image_model = image_model
        self.image_size = image_size
        self.image_quality = image_quality
        self.runtime_dir = project_root / ".codex-telegram"
        self.release = ReleaseManager(project_root)
        self.pending_actions: dict[int, PendingAction] = {}
        self.post_codex_actions: dict[int, PendingAction] = {}
        self.pending_lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="codex-bot")

    def project_status(self, chat_id: int) -> str:
        result = subprocess.run(
            ["git", "status", "--short", "--branch"],
            cwd=self.project_root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        thread = self.state.get_thread(chat_id)
        running = "да" if self.runner.is_running(chat_id) else "нет"
        release_running = "да" if self.release.is_running() else "нет"
        env_path = self.project_root / ".env"
        voice_status = (
            f"включены, модель {self.transcribe_model}"
            if self.openai_key
            else "не настроены: OPENAI_API_KEY не загружен"
        )
        photo_status = (
            f"включены, vision {self.vision_model}, image {self.image_model}"
            if self.openai_key
            else "не настроены: OPENAI_API_KEY не загружен"
        )
        return (
            f"Проект: {self.project_root.name}\n"
            f"Задача выполняется: {running}\n"
            f"Release выполняется: {release_running}\n"
            f"Сессия Codex: {thread or 'новая'}\n\n"
            f".env: {env_path} ({'есть' if env_path.exists() else 'нет'})\n"
            f"Голосовые: {voice_status}\n\n"
            f"Фото/OpenAI: {photo_status}\n\n"
            f"{result.stdout.strip() or 'Рабочее дерево чистое'}"
        )

    def prepare_release_action(
        self, chat_id: int, message_id: int, kind: str, argument: str = ""
    ) -> None:
        if self.runner.is_running(chat_id) or self.release.is_running():
            self.api.send_message(
                chat_id, "Сначала дождитесь завершения Codex или используйте /cancel", message_id
            )
            return
        if kind in {"commit", "publish", "ship"} and not argument.strip():
            self.api.send_message(
                chat_id, f"Укажите сообщение: /{kind} краткое описание изменений", message_id
            )
            return
        action = PendingAction(kind=kind, argument=argument.strip())
        with self.pending_lock:
            self.pending_actions[chat_id] = action
        try:
            branch = self.release.current_branch()
            status = self.release.status()
        except Exception as exc:
            with self.pending_lock:
                self.pending_actions.pop(chat_id, None)
            self.api.send_message(chat_id, f"Не удалось подготовить действие: {exc}", message_id)
            return
        descriptions = {
            "commit": f"создать commit «{action.argument}»",
            "push": f"push HEAD → origin/{DEPLOY_BRANCH}",
            "deploy": "пересобрать и перезапустить Docker-сервисы backend + web",
            "publish": (
                f"выполнить тесты, commit «{action.argument}» и push в origin/{DEPLOY_BRANCH}"
            ),
            "ship": (
                f"выполнить тесты, commit «{action.argument}», push в origin/{DEPLOY_BRANCH} "
                "и deploy backend + web"
            ),
        }
        protected = "\n".join(f"• {path}" for path in PROTECTED_COMMIT_PATHS)
        preview = (
            f"⚠️ Подготовлено: {descriptions[kind]}\n"
            f"Текущая ветка: {branch}\n\n"
            f"{status[:2500] or 'Рабочее дерево чистое'}\n\n"
            f"В commit никогда не включаются:\n{protected}\n\n"
            "Подтвердите или отмените действие кнопкой в течение 5 минут."
        )
        self.api.send_message(
            chat_id,
            preview,
            message_id,
            reply_markup=RELEASE_CONFIRM_KEYBOARD,
        )

    def confirm_release_action(self, chat_id: int, message_id: int) -> None:
        with self.pending_lock:
            action = self.pending_actions.pop(chat_id, None)
        if not action:
            self.api.send_message(chat_id, "Нет подготовленного действия.", message_id)
            return
        if action.expired():
            self.api.send_message(chat_id, "Подтверждение истекло. Подготовьте действие заново.", message_id)
            return
        self.executor.submit(self.process_release_action, chat_id, message_id, action)

    def process_release_action(
        self, chat_id: int, message_id: int, action: PendingAction
    ) -> None:
        labels = {
            "commit": "Создаю commit",
            "push": "Отправляю изменения в GitHub",
            "deploy": "Выполняю Docker deploy",
            "publish": "Запускаю тесты, commit и push",
            "ship": "Запускаю полный release pipeline",
        }
        status_id = self.api.send_message(chat_id, f"⏳ {labels[action.kind]}…", message_id)
        try:
            output = self.release.execute(action)
            self.api.edit_message(chat_id, status_id, f"✅ {labels[action.kind]}: готово")
            if output:
                self.api.send_long_message(chat_id, output[-10000:])
        except Exception as exc:
            self.api.edit_message(chat_id, status_id, f"❌ {labels[action.kind]}: ошибка")
            self.api.send_long_message(chat_id, str(exc)[-5000:])

    def abort_release_action(self, chat_id: int, message_id: int) -> None:
        with self.pending_lock:
            cancelled = self.pending_actions.pop(chat_id, None)
        self.api.send_message(
            chat_id,
            "Подготовленное действие отменено." if cancelled else "Нет подготовленного действия.",
            message_id,
        )

    def handle_callback_query(self, callback: dict[str, Any]) -> None:
        callback_id = str(callback.get("id") or "")
        sender = callback.get("from") or {}
        message = callback.get("message") or {}
        chat = message.get("chat") or {}
        if not callback_id or "id" not in sender or "id" not in chat or "message_id" not in message:
            return
        user_id = int(sender["id"])
        chat_id = int(chat["id"])
        message_id = int(message["message_id"])
        if not self.state.is_authorized(user_id):
            self.api.answer_callback_query(callback_id, "Доступ запрещён")
            return
        data = str(callback.get("data") or "")
        if data not in {"release:confirm", "release:abort"}:
            self.api.answer_callback_query(callback_id, "Неизвестное действие")
            return
        self.api.answer_callback_query(
            callback_id, "Запускаю…" if data == "release:confirm" else "Отменено"
        )
        try:
            self.api.clear_inline_keyboard(chat_id, message_id)
        except TelegramError:
            pass
        if data == "release:confirm":
            self.confirm_release_action(chat_id, message_id)
        else:
            self.abort_release_action(chat_id, message_id)

    def handle_update(self, update: dict[str, Any]) -> None:
        callback = update.get("callback_query")
        if isinstance(callback, dict):
            self.handle_callback_query(callback)
            return
        message = update.get("message") or {}
        chat = message.get("chat") or {}
        sender = message.get("from") or {}
        if not message or "id" not in chat or "id" not in sender:
            return
        chat_id = int(chat["id"])
        user_id = int(sender["id"])
        message_id = int(message["message_id"])
        text = str(message.get("text") or "").strip()
        caption = str(message.get("caption") or "").strip()

        if not self.state.is_authorized(user_id):
            is_start = text.split(maxsplit=1)[0].split("@", 1)[0].lower() == "/start" if text else False
            claimed = is_start and self.state.claim(user_id, chat.get("type") == "private")
            if not claimed:
                self.api.send_message(chat_id, "Доступ запрещён. Ваш user ID: " + str(user_id))
                return

        if text.startswith("/"):
            command = text.split(maxsplit=1)[0].split("@", 1)[0].lower()
            if command in {"/start", "/help"}:
                self.api.send_message(chat_id, HELP_TEXT, message_id)
            elif command == "/id":
                self.api.send_message(chat_id, f"Ваш Telegram user ID: {user_id}", message_id)
            elif command == "/status":
                self.api.send_long_message(chat_id, self.project_status(chat_id), message_id)
            elif command == "/file":
                self.send_requested_file(chat_id, message_id, text.partition(" ")[2])
            elif command in {"/image", "/img"}:
                prompt = text.partition(" ")[2].strip()
                if not prompt:
                    self.api.send_message(chat_id, "Напишите так: /image красивый рендер трубы 115/200", message_id)
                elif not self.openai_key:
                    self.api.send_message(chat_id, "Для генерации добавьте OPENAI_API_KEY в .env и перезапустите бота.", message_id)
                else:
                    self.executor.submit(self.process_image_generation, chat_id, message_id, prompt)
            elif command in {"/commit", "/publish", "/ship"}:
                self.prepare_release_action(
                    chat_id, message_id, command.removeprefix("/"), text.partition(" ")[2]
                )
            elif command in {"/push", "/deploy"}:
                self.prepare_release_action(chat_id, message_id, command.removeprefix("/"))
            elif command == "/confirm":
                self.confirm_release_action(chat_id, message_id)
            elif command == "/abort":
                self.abort_release_action(chat_id, message_id)
            elif command == "/new":
                if self.runner.is_running(chat_id):
                    self.api.send_message(chat_id, "Сначала остановите текущую задачу: /cancel")
                else:
                    self.state.set_thread(chat_id, None)
                    self.api.send_message(chat_id, "Новая сессия Codex будет создана со следующей задачей.")
            elif command == "/cancel":
                cancelled = self.runner.cancel(chat_id)
                self.api.send_message(chat_id, "Останавливаю задачу…" if cancelled else "Активной задачи нет.")
            else:
                self.api.send_message(chat_id, "Неизвестная команда. Используйте /help", message_id)
            return

        if message.get("voice"):
            if not self.openai_key:
                self.api.send_message(
                    chat_id,
                    "Для голосовых добавьте OPENAI_API_KEY в .env и перезапустите бота.",
                    message_id,
                )
                return
            if self.runner.is_running(chat_id):
                self.api.send_message(chat_id, "Дождитесь завершения задачи или используйте /cancel")
                return
            self.executor.submit(self.process_voice, chat_id, message_id, message["voice"]["file_id"])
            return

        if message.get("photo"):
            if not self.openai_key:
                self.api.send_message(
                    chat_id,
                    "Для чтения фото добавьте OPENAI_API_KEY в .env и перезапустите бота.",
                    message_id,
                )
                return
            if self.runner.is_running(chat_id):
                self.api.send_message(chat_id, "Дождитесь завершения задачи или используйте /cancel")
                return
            self.executor.submit(self.process_photo, chat_id, message_id, message["photo"], caption)
            return

        if text:
            image_prompt = natural_image_prompt(text)
            if image_prompt:
                if not self.openai_key:
                    self.api.send_message(chat_id, "Для генерации добавьте OPENAI_API_KEY в .env и перезапустите бота.", message_id)
                else:
                    self.executor.submit(self.process_image_generation, chat_id, message_id, image_prompt)
                return
            self.route_user_text(chat_id, message_id, text)

    def send_requested_file(self, chat_id: int, message_id: int | None, requested_path: str) -> None:
        try:
            path = safe_project_file(self.project_root, requested_path)
            self.api.send_document(chat_id, path, f"📎 {path.relative_to(self.project_root)}")
        except Exception as exc:
            self.api.send_message(chat_id, f"Не могу отправить файл: {exc}", message_id)

    def send_codex_requested_files(self, chat_id: int, paths: list[str]) -> None:
        for requested_path in paths:
            try:
                path = safe_project_file(self.project_root, requested_path)
                self.api.send_document(chat_id, path, f"📎 {path.relative_to(self.project_root)}")
            except Exception as exc:
                self.api.send_message(chat_id, f"Не смог отправить {requested_path}: {exc}")

    def process_voice(self, chat_id: int, message_id: int, file_id: str) -> None:
        status_id = self.api.send_message(chat_id, "🎙 Распознаю голосовое…", message_id)
        try:
            with tempfile.TemporaryDirectory(prefix="dimohod-voice-") as temp_dir:
                source = Path(temp_dir) / "voice.ogg"
                self.api.download_voice(file_id, source)
                assert self.openai_key is not None
                text = transcribe_voice(source, self.openai_key, self.transcribe_model)
            self.api.edit_message(chat_id, status_id, f"🎙 Распознано:\n{text[:3500]}")
            self.route_user_text(chat_id, message_id, text)
        except Exception as exc:
            self.api.edit_message(chat_id, status_id, f"Не удалось распознать голосовое:\n{exc}")

    def process_photo(self, chat_id: int, message_id: int, photos: list[dict[str, Any]], caption: str) -> None:
        status_id = self.api.send_message(chat_id, "🖼 Читаю фото…", message_id)
        try:
            largest = max(photos, key=lambda photo: int(photo.get("file_size") or 0))
            saved_path = self.runtime_dir / "uploads" / str(chat_id) / f"photo-{int(time.time())}.jpg"
            self.api.download_file(str(largest["file_id"]), saved_path)
            assert self.openai_key is not None
            analysis = analyze_photo(saved_path, caption, self.openai_key, self.vision_model)
            self.api.edit_message(chat_id, status_id, f"🖼 Фото прочитано:\n{analysis[:3200]}")
            prompt = (
                "Пользователь отправил фото в Telegram.\n"
                f"Локальный путь к фото: {saved_path.relative_to(self.project_root)}\n"
                f"Подпись пользователя: {caption or '(без подписи)'}\n\n"
                "Визуальный анализ OpenAI:\n"
                f"{analysis}\n\n"
                "Используй этот анализ как контекст задачи. Если нужно изменить проект, действуй по обычным правилам."
            )
            self.submit_codex(chat_id, message_id, prompt)
        except Exception as exc:
            self.api.edit_message(chat_id, status_id, f"Не удалось прочитать фото:\n{exc}")

    def process_image_generation(self, chat_id: int, message_id: int, prompt: str) -> None:
        status_id = self.api.send_message(chat_id, "🎨 Генерирую изображение…", message_id)
        try:
            print(
                f"Image generation requested chat={chat_id} model={self.image_model} "
                f"size={self.image_size} quality={self.image_quality}",
                flush=True,
            )
            assert self.openai_key is not None
            output_path = (
                self.runtime_dir
                / "generated"
                / str(chat_id)
                / f"image-{int(time.time())}-{uuid.uuid4().hex[:8]}.png"
            )
            generated = generate_image(
                prompt,
                self.openai_key,
                self.image_model,
                self.image_size,
                self.image_quality,
                output_path,
            )
            self.api.edit_message(chat_id, status_id, "✅ Изображение готово")
            try:
                self.api.send_photo(chat_id, generated, f"🎨 {prompt[:900]}")
            except TelegramError:
                self.api.send_document(chat_id, generated, f"🎨 {prompt[:900]}")
            print(f"Image sent chat={chat_id} path={generated}", flush=True)
        except Exception as exc:
            print(f"Image generation failed chat={chat_id}: {exc}", file=sys.stderr, flush=True)
            self.api.edit_message(chat_id, status_id, f"Не удалось сгенерировать изображение:\n{exc}")

    def submit_codex(self, chat_id: int, message_id: int, prompt: str) -> None:
        if self.runner.is_running(chat_id) or self.release.is_running():
            self.api.send_message(
                chat_id,
                "Уже выполняется задача или release. Дождитесь завершения либо используйте /cancel",
            )
            return
        self.executor.submit(self.process_codex, chat_id, message_id, prompt)

    def route_user_text(self, chat_id: int, message_id: int, text: str) -> None:
        confirmation = detect_natural_confirmation(text)
        if confirmation == "confirm":
            self.confirm_release_action(chat_id, message_id)
            return
        if confirmation == "abort":
            self.abort_release_action(chat_id, message_id)
            return
        intent = detect_natural_release_intent(text)
        if not intent:
            self.submit_codex(chat_id, message_id, text)
            return
        if not intent.has_project_task:
            self.prepare_release_action(
                chat_id, message_id, intent.kind, intent.commit_message
            )
            return
        if self.runner.is_running(chat_id) or self.release.is_running():
            self.submit_codex(chat_id, message_id, text)
            return
        action = PendingAction(intent.kind, intent.commit_message)
        with self.pending_lock:
            self.post_codex_actions[chat_id] = action
        prompt = (
            f"{text}\n\n"
            "Важно: выполни только изменения проекта и проверки. Не выполняй git commit, "
            "git push или Docker deploy — после успешного ответа Telegram-бот отдельно "
            "подготовит подтверждаемый release."
        )
        self.submit_codex(chat_id, message_id, prompt)

    def process_codex(self, chat_id: int, message_id: int, prompt: str) -> None:
        status_id = self.api.send_message(chat_id, "⏳ Запускаю Codex…", message_id)
        last_status = ""

        def update_status(text: str) -> None:
            nonlocal last_status
            if text != last_status:
                try:
                    self.api.edit_message(chat_id, status_id, text)
                    last_status = text
                except TelegramError:
                    pass

        try:
            summary, return_code, diagnostics = self.runner.run(chat_id, prompt, update_status)
            with self.pending_lock:
                post_action = self.post_codex_actions.pop(chat_id, None)
            if return_code == 0 and summary.final_response:
                update_status("✅ Codex завершил задачу")
                response_text, requested_files = extract_file_requests(summary.final_response)
                if response_text:
                    self.api.send_long_message(chat_id, response_text, markdown=True)
                self.send_codex_requested_files(chat_id, requested_files)
                if post_action:
                    self.prepare_release_action(
                        chat_id, message_id, post_action.kind, post_action.argument
                    )
            elif summary.cancelled:
                update_status("⛔ Задача остановлена")
            else:
                update_status("❌ Codex завершился с ошибкой")
                details = diagnostics or "Финальный ответ не получен"
                self.api.send_long_message(chat_id, details[-3500:])
        except Exception as exc:
            with self.pending_lock:
                self.post_codex_actions.pop(chat_id, None)
            update_status("❌ Ошибка запуска Codex")
            self.api.send_long_message(chat_id, str(exc))


def parse_allowed_users(raw: str | None) -> set[int]:
    if not raw:
        return set()
    try:
        return {int(value.strip()) for value in raw.split(",") if value.strip()}
    except ValueError as exc:
        raise SystemExit("CODEX_BOT_ALLOWED_USER_IDS должен содержать числа через запятую") from exc


def acquire_instance_lock(path: Path) -> Any:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("w")
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        raise SystemExit("Бот уже запущен") from exc
    handle.write(str(os.getpid()))
    handle.flush()
    return handle


def main() -> int:
    project_root = Path(__file__).resolve().parents[2]
    load_dotenv(project_root / ".env")
    token = os.getenv("CODEX_BOT_TOKEN")
    if not token:
        print("В .env отсутствует CODEX_BOT_TOKEN", file=sys.stderr)
        return 2

    runtime_dir = project_root / ".codex-telegram"
    _instance_lock = acquire_instance_lock(runtime_dir / "bot.lock")
    state = StateStore(
        runtime_dir / "state.json", parse_allowed_users(os.getenv("CODEX_BOT_ALLOWED_USER_IDS"))
    )
    codex_binary = os.getenv("CODEX_BOT_CODEX_BINARY", "codex")
    api = TelegramAPI(token)
    runner = CodexRunner(project_root, codex_binary, state)
    app = BotApplication(
        api,
        state,
        runner,
        project_root,
        os.getenv("OPENAI_API_KEY"),
        os.getenv("OPENAI_TRANSCRIBE_MODEL", DEFAULT_TRANSCRIBE_MODEL),
        os.getenv("OPENAI_VISION_MODEL", DEFAULT_VISION_MODEL),
        os.getenv("OPENAI_IMAGE_MODEL", DEFAULT_IMAGE_MODEL),
        os.getenv("OPENAI_IMAGE_SIZE", DEFAULT_IMAGE_SIZE),
        os.getenv("OPENAI_IMAGE_QUALITY", DEFAULT_IMAGE_QUALITY),
        int(os.getenv("CODEX_BOT_MAX_WORKERS", "2")),
    )

    identity = api.call("getMe")
    api.call("deleteWebhook", {"drop_pending_updates": "false"})
    print(f"Bot @{identity.get('username')} started for {project_root}", flush=True)
    offset: int | None = None
    while True:
        try:
            for update in api.get_updates(offset):
                offset = int(update["update_id"]) + 1
                try:
                    app.handle_update(update)
                except Exception as exc:
                    print(f"Update error: {exc}", file=sys.stderr, flush=True)
        except TelegramError as exc:
            print(exc, file=sys.stderr, flush=True)
            time.sleep(3)
        except KeyboardInterrupt:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
