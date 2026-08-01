#!/usr/bin/env python3
"""Personal Telegram interface for running Codex in this repository.

The implementation intentionally uses only Python's standard library. Codex is
started as a subprocess and Telegram is accessed through its HTTPS Bot API.
"""

from __future__ import annotations

import fcntl
import base64
import hashlib
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
DEFAULT_CODEX_MODEL_KEY = "sol_medium"
MEDIA_GROUP_SETTLE_SECONDS = 1.2
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

SUNNY_PROJECT_INSTRUCTIONS = """Работай только над проектом Sunny Rentals в текущем каталоге.
Перед изменениями прочитай PROJECT.md и ARCHITECTURE.md. Рабочая ветка — marsel-collab.
В репозитории уже могут быть пользовательские незакоммиченные изменения: сохраняй их и не
перезаписывай. Не изменяй .env, backend/data/, backend/media/, логи и credentials, если задача
явно этого не требует. Выполни запрос, проверь результат подходящими тестами и кратко сообщи итог.
Финальный ответ оформляй Telegram-совместимым Markdown: *жирный текст*, списки, `inline code`
и блоки кода. Не используй Markdown-таблицы и HTML.
Если пользователь просит прислать файл из проекта, в финальном ответе добавь отдельной строкой
[[send_file:relative/path/to/file]] — бот отправит этот файл в Telegram.
Git commit/push и production deploy выполняются отдельными командами Telegram-бота:
/commit, /push, /deploy или /ship. Не пытайся обходить sandbox ради записи в .git или сети.

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


@dataclass(frozen=True)
class ProjectConfig:
    key: str
    label: str
    root: Path
    branch: str
    instructions: str
    protected_paths: tuple[str, ...]
    test_commands: tuple[tuple[str, ...], ...]
    deploy_commands: tuple[tuple[str, ...], ...]


@dataclass(frozen=True)
class ModelConfig:
    key: str
    label: str
    model: str
    reasoning_effort: str


CODEX_MODELS = {
    "gpt55_high": ModelConfig(
        key="gpt55_high",
        label="🧠 GPT-5.5 · high",
        model="gpt-5.5",
        reasoning_effort="high",
    ),
    "sol_medium": ModelConfig(
        key="sol_medium",
        label="⚡ GPT-5.6 Sol · medium",
        model="gpt-5.6-sol",
        reasoning_effort="medium",
    ),
}


def build_project_configs(dimohod_root: Path) -> dict[str, ProjectConfig]:
    return {
        "dimohod": ProjectConfig(
            key="dimohod",
            label="🔥 Дымоходы",
            root=dimohod_root,
            branch=DEPLOY_BRANCH,
            instructions=PROJECT_INSTRUCTIONS,
            protected_paths=PROTECTED_COMMIT_PATHS,
            test_commands=(
                ("docker", "compose", "exec", "-T", "backend", "pytest", "-q"),
                ("npm", "run", "build:web"),
            ),
            deploy_commands=(
                ("docker", "compose", "up", "-d", "--build", "backend", "web"),
                ("docker", "compose", "ps", "backend", "web"),
            ),
        ),
        "sunny": ProjectConfig(
            key="sunny",
            label="☀️ Sunny Rentals",
            root=Path("/home/sunny-rentals"),
            branch="marsel-collab",
            instructions=SUNNY_PROJECT_INSTRUCTIONS,
            protected_paths=(
                ".env",
                "backend/.env",
                "backend/creds.json",
                "backend/data/",
                "backend/media/",
                ".codex-telegram/",
                "graphify-out/",
                "src/graphify-out/",
                "backend/graphify-out/",
            ),
            test_commands=(("npm", "run", "build"),),
            deploy_commands=(
                ("npm", "run", "build"),
                ("systemctl", "restart", "sunny-api.service", "sunny-backend.service"),
                ("systemctl", "is-active", "sunny-api.service", "sunny-backend.service"),
            ),
        ),
    }


def project_keyboard(projects: dict[str, ProjectConfig]) -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [
                {"text": project.label, "callback_data": f"project:{project.key}"}
                for project in projects.values()
            ]
        ]
    }


def model_keyboard() -> dict[str, Any]:
    return {
        "inline_keyboard": [
            [
                {"text": model.label, "callback_data": f"model:{model.key}"}
                for model in CODEX_MODELS.values()
            ]
        ]
    }
RELEASE_CONFIRM_KEYBOARD = {
    "inline_keyboard": [
        [
            {"text": "✅ Подтвердить", "callback_data": "release:confirm"},
            {"text": "❌ Отмена", "callback_data": "release:abort"},
        ]
    ]
}
POST_TASK_KEYBOARD = {
    "inline_keyboard": [
        [
            {"text": "🚀 Пуш и деплой", "callback_data": "posttask:ship"},
            {"text": "➡️ Продолжить", "callback_data": "posttask:continue"},
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
        self.data: dict[str, Any] = {
            "owner_user_id": None,
            "threads": {},
            "active_projects": {},
            "models": {},
        }
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

    def get_active_project(self, chat_id: int, default: str = "dimohod") -> str:
        with self.lock:
            return str(self.data.setdefault("active_projects", {}).get(str(chat_id)) or default)

    def set_active_project(self, chat_id: int, project_key: str) -> None:
        with self.lock:
            self.data.setdefault("active_projects", {})[str(chat_id)] = project_key
            self.save()

    def get_model_key(self, chat_id: int) -> str:
        with self.lock:
            key = str(
                self.data.setdefault("models", {}).get(str(chat_id))
                or DEFAULT_CODEX_MODEL_KEY
            )
            return key if key in CODEX_MODELS else DEFAULT_CODEX_MODEL_KEY

    def set_model_key(self, chat_id: int, model_key: str) -> None:
        if model_key not in CODEX_MODELS:
            raise ValueError(f"Неизвестная модель: {model_key}")
        with self.lock:
            self.data.setdefault("models", {})[str(chat_id)] = model_key
            self.save()

    def thread_slot(self, project_key: str, model_key: str) -> str:
        # Preserve the original project thread for the default Sol profile.
        if model_key == DEFAULT_CODEX_MODEL_KEY:
            return project_key
        return f"{project_key}@{model_key}"

    def get_thread(self, chat_id: int, project_key: str = "dimohod") -> str | None:
        with self.lock:
            threads = self.data.setdefault("threads", {})
            project_threads = threads.get(str(chat_id))
            if isinstance(project_threads, dict):
                value = project_threads.get(project_key)
                return str(value) if value else None
            # Migration from the original one-project state format.
            if project_key == "dimohod" and isinstance(project_threads, str):
                return project_threads
            return None

    def set_thread(
        self, chat_id: int, thread_id: str | None, project_key: str = "dimohod"
    ) -> None:
        with self.lock:
            threads = self.data.setdefault("threads", {})
            existing = threads.get(str(chat_id))
            if isinstance(existing, str):
                existing = {"dimohod": existing}
            project_threads = existing if isinstance(existing, dict) else {}
            if thread_id:
                project_threads[project_key] = thread_id
            else:
                project_threads.pop(project_key, None)
            if project_threads:
                threads[str(chat_id)] = project_threads
            else:
                threads.pop(str(chat_id), None)
            self.save()


@dataclass
class RunningTask:
    process: subprocess.Popen[str] | None = None
    cancel_requested: bool = False


@dataclass
class PhotoAlbum:
    chat_id: int
    first_message_id: int
    project_key: str
    caption: str = ""
    photos: list[list[dict[str, Any]]] = field(default_factory=list)
    timer: threading.Timer | None = None


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
    def __init__(
        self,
        project_root: Path,
        codex_binary: str,
        state: StateStore,
        projects: dict[str, ProjectConfig] | None = None,
    ) -> None:
        self.projects = projects or build_project_configs(project_root)
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

    def build_command(
        self, chat_id: int, prompt: str, project_key: str = "dimohod"
    ) -> list[str]:
        project = self.projects[project_key]
        model_key = self.state.get_model_key(chat_id)
        model = CODEX_MODELS[model_key]
        thread_slot = self.state.thread_slot(project_key, model_key)
        common = [
            self.codex_binary,
            "exec",
            "--json",
            "--color",
            "never",
            "--cd",
            str(project.root),
            "--sandbox",
            "workspace-write",
            "--model",
            model.model,
            "--config",
            f'model_reasoning_effort="{model.reasoning_effort}"',
        ]
        thread_id = self.state.get_thread(chat_id, thread_slot)
        if thread_id:
            return [*common, "resume", thread_id, prompt]
        return [*common, project.instructions + prompt]

    def run(
        self,
        chat_id: int,
        prompt: str,
        on_status: Any,
        project_key: str = "dimohod",
    ) -> tuple[StatusSummary, int, str]:
        with self.lock:
            if chat_id in self.tasks:
                raise RuntimeError("Для этого чата уже выполняется задача")
            task = RunningTask()
            self.tasks[chat_id] = task

        summary = StatusSummary()
        diagnostic_lines: list[str] = []
        project = self.projects[project_key]
        model_key = self.state.get_model_key(chat_id)
        thread_slot = self.state.thread_slot(project_key, model_key)
        saved_thread_id = self.state.get_thread(chat_id, thread_slot)
        try:
            process = subprocess.Popen(
                self.build_command(chat_id, prompt, project_key),
                cwd=project.root,
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
                    self.state.set_thread(chat_id, summary.thread_id, thread_slot)
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


def analyze_photos(
    paths: list[Path], caption: str, openai_key: str, model: str
) -> str:
    if not paths:
        raise ValueError("Не переданы изображения для анализа")
    prompt = caption.strip() or (
        "Проанализируй изображения вместе и подробно ответь по-русски. Если это последовательность "
        "скриншотов, восстанови общий сценарий, выпиши ошибки и весь важный текст. "
        "Укажи возможные действия для проекта."
    )
    content: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
    content.extend(
        {"type": "input_image", "image_url": image_data_url(path), "detail": "high"}
        for path in paths
    )
    payload = {
        "model": model,
        "input": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "max_output_tokens": 1600,
    }
    result = openai_json_request(openai_key, "responses", payload)
    text = extract_openai_output_text(result)
    if not text:
        raise RuntimeError("OpenAI vision вернул пустой ответ")
    return text


def analyze_photo(path: Path, caption: str, openai_key: str, model: str) -> str:
    return analyze_photos([path], caption, openai_key, model)


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


HELP_TEXT = """Я управляю Codex в проектах Dimohod Trade и Sunny Rentals.

Отправьте текст, голосовое или фото — это станет задачей для Codex.

Команды:
/projects — выбрать активный проект
/models — выбрать модель и уровень рассуждений
/status — ветка, изменения и активная задача
/file path/to/file — прислать файл из проекта
/image описание — сгенерировать изображение и прислать в чат
/commit сообщение — подготовить commit изменений
/publish сообщение — тесты → commit → push
/push — подготовить push текущей ветки
/deploy — подготовить production deploy активного проекта
/ship сообщение — тесты → commit → push → deploy
/confirm — подтвердить подготовленное действие
/abort — отменить подготовленное действие
/new — начать новую сессию Codex
/cancel — остановить текущую задачу
/id — показать ваш Telegram user ID
/help — эта справка

Codex работает с sandbox=workspace-write. Одновременно в одном чате выполняется одна задача."""


def is_protected_commit_path(
    path: str, protected_paths: tuple[str, ...] = PROTECTED_COMMIT_PATHS
) -> bool:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return any(
        normalized == protected.rstrip("/") or normalized.startswith(protected)
        for protected in protected_paths
    )


def allowed_changed_paths(
    status_output: str, protected_paths: tuple[str, ...] = PROTECTED_COMMIT_PATHS
) -> list[str]:
    paths: list[str] = []
    for line in status_output.splitlines():
        if len(line) < 4 or line.startswith("## "):
            continue
        path = line[3:].strip().strip('"')
        if " -> " in path:
            path = path.rsplit(" -> ", 1)[1].strip().strip('"')
        if path and not is_protected_commit_path(path, protected_paths):
            paths.append(path)
    return paths


def file_fingerprint(project_root: Path, relative_path: str) -> str:
    path = project_root / relative_path
    if not path.exists() and not path.is_symlink():
        return "missing"
    if path.is_symlink():
        return "symlink:" + os.readlink(path)
    if not path.is_file():
        return "other"
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def worktree_snapshot(
    project_root: Path, protected_paths: tuple[str, ...]
) -> dict[str, str]:
    result = subprocess.run(
        ["git", "status", "--porcelain=v1", "--untracked-files=all"],
        cwd=project_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
        check=True,
    )
    snapshot: dict[str, str] = {}
    for path in allowed_changed_paths(result.stdout, protected_paths):
        snapshot[path] = file_fingerprint(project_root, path)
    return snapshot


def task_changed_paths(before: dict[str, str], after: dict[str, str]) -> list[str]:
    return sorted(path for path in set(before) | set(after) if before.get(path) != after.get(path))


def commit_message_from_prompt(prompt: str) -> str:
    first_line = next((line.strip() for line in prompt.splitlines() if line.strip()), "")
    message = re.sub(r"[*_`#\[\]]", "", first_line)
    message = re.sub(r"\s+", " ", message).strip(" .,:;!?—-")[:120]
    return message or "Update dimohod-trade via Telegram"


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
    project_key: str = "dimohod"
    paths: tuple[str, ...] | None = None
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
    """Narrow host-side Git and deploy operations unavailable inside Codex sandbox."""

    def __init__(
        self,
        project_root: Path,
        branch: str = DEPLOY_BRANCH,
        *,
        config: ProjectConfig | None = None,
    ) -> None:
        self.config = config or build_project_configs(project_root)["dimohod"]
        self.project_root = self.config.root
        self.branch = branch if config is None else self.config.branch
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

    def allowed_changed_paths(self) -> list[str]:
        return allowed_changed_paths(self.status(), self.config.protected_paths)

    def staged_paths(self) -> list[str]:
        output = run_host_command(
            ["git", "diff", "--cached", "--name-only", "-z"],
            self.project_root,
            timeout=20,
        )
        return [path for path in output.split("\0") if path]

    def commit(
        self,
        message: str,
        *,
        skip_if_empty: bool = False,
        paths: tuple[str, ...] | None = None,
    ) -> str:
        self.assert_branch()
        message = re.sub(r"\s+", " ", message).strip()
        if not message:
            raise RuntimeError("Нужно указать сообщение commit")
        if len(message) > 160:
            raise RuntimeError("Сообщение commit должно быть не длиннее 160 символов")

        already_staged = self.staged_paths()
        protected_staged = [
            path
            for path in already_staged
            if is_protected_commit_path(path, self.config.protected_paths)
        ]
        if protected_staged:
            raise RuntimeError(
                "В index уже находятся защищённые пути; уберите их из staged вручную:\n"
                + "\n".join(protected_staged)
            )

        target_paths = list(paths) if paths is not None else self.allowed_changed_paths()
        target_paths = [
            path
            for path in target_paths
            if not is_protected_commit_path(path, self.config.protected_paths)
        ]
        if paths is not None:
            unrelated_staged = [path for path in already_staged if path not in target_paths]
            if unrelated_staged:
                raise RuntimeError(
                    "В Git index уже есть посторонние изменения; безопасный commit остановлен:\n"
                    + "\n".join(unrelated_staged)
                )
        if not target_paths:
            if skip_if_empty:
                return "Новых разрешённых изменений нет — commit пропущен."
            raise RuntimeError("Нет разрешённых изменений для commit")
        add_output = run_host_command(
            ["git", "add", "-A", "--", *target_paths],
            self.project_root,
            timeout=60,
        )
        staged = self.staged_paths()
        if not staged:
            if skip_if_empty:
                return "Новых разрешённых изменений нет — commit пропущен."
            raise RuntimeError("Нет разрешённых изменений для commit")
        protected = [
            path
            for path in staged
            if is_protected_commit_path(path, self.config.protected_paths)
        ]
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
        outputs = []
        for command in self.config.test_commands:
            output = run_host_command(list(command), self.project_root, timeout=900)
            outputs.append(f"$ {' '.join(command)}\n{output or 'OK'}")
        return "\n\n".join(outputs)

    def deploy(
        self,
        *,
        skip_tested_commands: bool = False,
        paths: tuple[str, ...] | None = None,
    ) -> str:
        outputs = []
        backend_changed = paths is None or any(
            path == "backend" or path.startswith("backend/") for path in paths
        )
        for command in self.config.deploy_commands:
            if skip_tested_commands and command in self.config.test_commands:
                continue
            if (
                self.config.key == "sunny"
                and not backend_changed
                and command[:1] == ("systemctl",)
            ):
                continue
            output = run_host_command(list(command), self.project_root, timeout=1200)
            outputs.append(f"$ {' '.join(command)}\n{output or 'OK'}")
        return "\n\n".join(outputs) or "Frontend build опубликован без перезапуска backend."

    def execute(self, action: PendingAction) -> str:
        with self.lock:
            if action.kind == "commit":
                if action.paths is None:
                    return self.commit(action.argument)
                return self.commit(action.argument, paths=action.paths)
            if action.kind == "push":
                return self.push()
            if action.kind == "deploy":
                return self.deploy()
            if action.kind == "ship":
                tests = self.test()
                commit = (
                    self.commit(action.argument, skip_if_empty=True)
                    if action.paths is None
                    else self.commit(
                        action.argument, skip_if_empty=True, paths=action.paths
                    )
                )
                push = self.push()
                has_repeated_deploy_command = any(
                    command in self.config.test_commands
                    for command in self.config.deploy_commands
                )
                deploy = (
                    self.deploy(
                        skip_tested_commands=True,
                        paths=action.paths,
                    )
                    if has_repeated_deploy_command
                    else self.deploy()
                )
                return (
                    f"Тесты:\n{tests}\n\nCommit:\n{commit}\n\n"
                    f"Push:\n{push}\n\nDeploy:\n{deploy}"
                )
            if action.kind == "publish":
                tests = self.test()
                commit = (
                    self.commit(action.argument, skip_if_empty=True)
                    if action.paths is None
                    else self.commit(
                        action.argument, skip_if_empty=True, paths=action.paths
                    )
                )
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
        projects: dict[str, ProjectConfig] | None = None,
    ) -> None:
        self.api = api
        self.state = state
        self.runner = runner
        self.project_root = project_root
        self.projects = projects or build_project_configs(project_root)
        self.openai_key = openai_key
        self.transcribe_model = transcribe_model
        self.vision_model = vision_model
        self.image_model = image_model
        self.image_size = image_size
        self.image_quality = image_quality
        self.runtime_dir = project_root / ".codex-telegram"
        self.releases = {
            key: ReleaseManager(config.root, config=config)
            for key, config in self.projects.items()
        }
        # Compatibility for callers/tests that still access the Dimohod manager directly.
        self.release = self.releases["dimohod"]
        self.pending_actions: dict[int, PendingAction] = {}
        self.post_codex_actions: dict[int, PendingAction] = {}
        self.pending_lock = threading.Lock()
        self.photo_albums: dict[tuple[int, str], PhotoAlbum] = {}
        self.media_processing_chats: set[int] = set()
        self.photo_album_lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="codex-bot")

    def active_project(self, chat_id: int) -> ProjectConfig:
        key = self.state.get_active_project(chat_id)
        return self.projects.get(key, self.projects["dimohod"])

    def release_for(self, project_key: str) -> ReleaseManager:
        return self.releases[project_key]

    def any_release_running(self) -> bool:
        return any(release.is_running() for release in self.releases.values())

    def has_pending_album(self, chat_id: int) -> bool:
        with self.photo_album_lock:
            return chat_id in self.media_processing_chats or any(
                key[0] == chat_id for key in self.photo_albums
            )

    def project_status(self, chat_id: int) -> str:
        project = self.active_project(chat_id)
        model_key = self.state.get_model_key(chat_id)
        model = CODEX_MODELS[model_key]
        release = self.release_for(project.key)
        result = subprocess.run(
            ["git", "status", "--short", "--branch"],
            cwd=project.root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        thread = self.state.get_thread(
            chat_id, self.state.thread_slot(project.key, model_key)
        )
        running = "да" if self.runner.is_running(chat_id) else "нет"
        release_running = "да" if release.is_running() else "нет"
        env_path = project.root / ".env"
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
            f"Проект: {project.label} ({project.root.name})\n"
            f"Модель: {model.label}\n"
            f"Задача выполняется: {running}\n"
            f"Release выполняется: {release_running}\n"
            f"Сессия Codex: {thread or 'новая'}\n\n"
            f".env: {env_path} ({'есть' if env_path.exists() else 'нет'})\n"
            f"Голосовые: {voice_status}\n\n"
            f"Фото/OpenAI: {photo_status}\n\n"
            f"{result.stdout.strip() or 'Рабочее дерево чистое'}"
        )

    def prepare_release_action(
        self,
        chat_id: int,
        message_id: int,
        kind: str,
        argument: str = "",
        *,
        project_key: str | None = None,
        paths: tuple[str, ...] | None = None,
    ) -> None:
        project = self.projects[project_key or self.active_project(chat_id).key]
        release = self.release_for(project.key)
        if self.runner.is_running(chat_id) or release.is_running():
            self.api.send_message(
                chat_id, "Сначала дождитесь завершения Codex или используйте /cancel", message_id
            )
            return
        if kind in {"commit", "publish", "ship"} and not argument.strip():
            self.api.send_message(
                chat_id, f"Укажите сообщение: /{kind} краткое описание изменений", message_id
            )
            return
        action = PendingAction(
            kind=kind,
            argument=argument.strip(),
            project_key=project.key,
            paths=paths,
        )
        with self.pending_lock:
            self.pending_actions[chat_id] = action
        try:
            branch = release.current_branch()
            status = release.status()
        except Exception as exc:
            with self.pending_lock:
                self.pending_actions.pop(chat_id, None)
            self.api.send_message(chat_id, f"Не удалось подготовить действие: {exc}", message_id)
            return
        descriptions = {
            "commit": f"создать commit «{action.argument}»",
            "push": f"push HEAD → origin/{project.branch}",
            "deploy": (
                "пересобрать и перезапустить production"
                if project.key == "sunny"
                else "пересобрать и перезапустить Docker-сервисы backend + web"
            ),
            "publish": (
                f"выполнить тесты, commit «{action.argument}» и push в origin/{project.branch}"
            ),
            "ship": (
                f"выполнить тесты, commit «{action.argument}», push в origin/{project.branch} "
                "и production deploy"
            ),
        }
        protected = "\n".join(f"• {path}" for path in project.protected_paths)
        scoped = ""
        if paths is not None:
            scoped = (
                "\nВ commit войдут только файлы этого запроса:\n"
                + "\n".join(f"• {path}" for path in paths[:20])
                + "\n"
            )
        preview = (
            f"⚠️ Проект: {project.label}\n"
            f"Подготовлено: {descriptions[kind]}\n"
            f"Текущая ветка: {branch}\n\n"
            f"{status[:2500] or 'Рабочее дерево чистое'}\n\n"
            f"{scoped}"
            f"В commit никогда не включаются:\n{protected}\n\n"
            "Подтвердите или отмените действие кнопкой в течение 5 минут."
        )
        self.api.send_message(
            chat_id,
            preview,
            message_id,
            reply_markup=RELEASE_CONFIRM_KEYBOARD,
        )

    def offer_post_task_actions(
        self,
        chat_id: int,
        message_id: int,
        prompt: str,
        paths: list[str],
        project_key: str,
    ) -> None:
        project = self.projects[project_key]
        action = PendingAction(
            "ship",
            commit_message_from_prompt(prompt),
            project_key=project_key,
            paths=tuple(paths),
        )
        with self.pending_lock:
            self.pending_actions[chat_id] = action
        preview = "\n".join(f"• {path}" for path in paths[:20])
        if len(paths) > 20:
            preview += f"\n• …и ещё {len(paths) - 20}"
        self.api.send_message(
            chat_id,
            f"{project.label}: изменения готовы:\n{preview}\n\nЧто делаем дальше?",
            message_id,
            reply_markup=POST_TASK_KEYBOARD,
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
        project = self.projects[action.project_key]
        release = self.release_for(action.project_key)
        labels = {
            "commit": "Создаю commit",
            "push": "Отправляю изменения в GitHub",
            "deploy": "Выполняю Docker deploy",
            "publish": "Запускаю тесты, commit и push",
            "ship": "Запускаю полный release pipeline",
        }
        status_id = self.api.send_message(
            chat_id, f"⏳ {project.label}: {labels[action.kind]}…", message_id
        )
        try:
            output = release.execute(action)
            self.api.edit_message(
                chat_id, status_id, f"✅ {project.label}: {labels[action.kind]} — готово"
            )
            if output:
                self.api.send_long_message(chat_id, output[-10000:])
        except Exception as exc:
            self.api.edit_message(
                chat_id, status_id, f"❌ {project.label}: {labels[action.kind]} — ошибка"
            )
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
        if data.startswith("project:"):
            project_key = data.partition(":")[2]
            project = self.projects.get(project_key)
            if not project:
                self.api.answer_callback_query(callback_id, "Неизвестный проект")
                return
            if (
                self.runner.is_running(chat_id)
                or self.any_release_running()
                or self.has_pending_album(chat_id)
            ):
                self.api.answer_callback_query(
                    callback_id, "Сначала дождитесь текущей операции"
                )
                return
            self.state.set_active_project(chat_id, project_key)
            with self.pending_lock:
                self.pending_actions.pop(chat_id, None)
                self.post_codex_actions.pop(chat_id, None)
            self.api.answer_callback_query(callback_id, f"Выбран: {project.label}")
            try:
                self.api.clear_inline_keyboard(chat_id, message_id)
            except TelegramError:
                pass
            self.api.send_message(
                chat_id,
                f"✅ Активный проект: *{project.label}*\n"
                f"Ветка: `{project.branch}`\n\n"
                "Теперь отправьте задачу текстом или голосовым.",
                message_id,
                markdown=True,
            )
            return
        if data.startswith("model:"):
            model_key = data.partition(":")[2]
            model = CODEX_MODELS.get(model_key)
            if not model:
                self.api.answer_callback_query(callback_id, "Неизвестная модель")
                return
            if (
                self.runner.is_running(chat_id)
                or self.any_release_running()
                or self.has_pending_album(chat_id)
            ):
                self.api.answer_callback_query(
                    callback_id, "Сначала дождитесь текущей операции"
                )
                return
            self.state.set_model_key(chat_id, model_key)
            self.api.answer_callback_query(callback_id, f"Выбрана: {model.label}")
            try:
                self.api.clear_inline_keyboard(chat_id, message_id)
            except TelegramError:
                pass
            self.api.send_message(
                chat_id,
                f"✅ Модель: *{model.label}*\n"
                "Для этого режима используется отдельная история Codex.",
                message_id,
                markdown=True,
            )
            return
        valid_actions = {
            "release:confirm",
            "release:abort",
            "posttask:ship",
            "posttask:continue",
        }
        if data not in valid_actions:
            self.api.answer_callback_query(callback_id, "Неизвестное действие")
            return
        if data.startswith("posttask:"):
            with self.pending_lock:
                action = self.pending_actions.pop(chat_id, None)
            if data == "posttask:continue":
                self.api.answer_callback_query(callback_id, "Продолжаем без публикации")
                try:
                    self.api.clear_inline_keyboard(chat_id, message_id)
                except TelegramError:
                    pass
                self.api.send_message(chat_id, "Хорошо, изменения оставлены локально.", message_id)
                return
            if not action or action.expired():
                self.api.answer_callback_query(callback_id, "Предложение устарело")
                try:
                    self.api.clear_inline_keyboard(chat_id, message_id)
                except TelegramError:
                    pass
                return
            self.api.answer_callback_query(callback_id, "Запускаю push и deploy…")
            try:
                self.api.clear_inline_keyboard(chat_id, message_id)
            except TelegramError:
                pass
            self.executor.submit(self.process_release_action, chat_id, message_id, action)
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
            if command == "/start":
                current = self.active_project(chat_id)
                current_model = CODEX_MODELS[self.state.get_model_key(chat_id)]
                self.api.send_message(
                    chat_id,
                    f"Выберите проект.\nСейчас активен: *{current.label}*",
                    message_id,
                    markdown=True,
                    reply_markup=project_keyboard(self.projects),
                )
                self.api.send_message(
                    chat_id,
                    f"Выберите модель Codex.\nСейчас активна: *{current_model.label}*",
                    markdown=True,
                    reply_markup=model_keyboard(),
                )
            elif command == "/projects":
                current = self.active_project(chat_id)
                self.api.send_message(
                    chat_id,
                    f"Выберите проект.\nСейчас активен: *{current.label}*",
                    message_id,
                    markdown=True,
                    reply_markup=project_keyboard(self.projects),
                )
            elif command == "/models":
                current_model = CODEX_MODELS[self.state.get_model_key(chat_id)]
                self.api.send_message(
                    chat_id,
                    f"Выберите модель Codex.\nСейчас активна: *{current_model.label}*",
                    message_id,
                    markdown=True,
                    reply_markup=model_keyboard(),
                )
            elif command == "/help":
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
                    project = self.active_project(chat_id)
                    model_key = self.state.get_model_key(chat_id)
                    self.state.set_thread(
                        chat_id,
                        None,
                        self.state.thread_slot(project.key, model_key),
                    )
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
            media_group_id = str(message.get("media_group_id") or "")
            if media_group_id:
                self.queue_photo_album(
                    chat_id,
                    message_id,
                    media_group_id,
                    message["photo"],
                    caption,
                )
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
        project = self.active_project(chat_id)
        try:
            path = safe_project_file(project.root, requested_path)
            self.api.send_document(chat_id, path, f"📎 {path.relative_to(project.root)}")
        except Exception as exc:
            self.api.send_message(chat_id, f"Не могу отправить файл: {exc}", message_id)

    def send_codex_requested_files(self, chat_id: int, paths: list[str]) -> None:
        project = self.active_project(chat_id)
        for requested_path in paths:
            try:
                path = safe_project_file(project.root, requested_path)
                self.api.send_document(chat_id, path, f"📎 {path.relative_to(project.root)}")
            except Exception as exc:
                self.api.send_message(chat_id, f"Не смог отправить {requested_path}: {exc}")

    def queue_photo_album(
        self,
        chat_id: int,
        message_id: int,
        media_group_id: str,
        photos: list[dict[str, Any]],
        caption: str,
    ) -> None:
        key = (chat_id, media_group_id)
        with self.photo_album_lock:
            album = self.photo_albums.get(key)
            if album is None:
                album = PhotoAlbum(
                    chat_id=chat_id,
                    first_message_id=message_id,
                    project_key=self.active_project(chat_id).key,
                )
                self.photo_albums[key] = album
            if len(album.photos) < 10:
                album.photos.append(photos)
            if caption:
                album.caption = "\n".join(
                    part for part in (album.caption, caption) if part
                )
            if album.timer:
                album.timer.cancel()
            album.timer = threading.Timer(
                MEDIA_GROUP_SETTLE_SECONDS, self.flush_photo_album, args=(key,)
            )
            album.timer.daemon = True
            album.timer.start()

    def flush_photo_album(self, key: tuple[int, str]) -> None:
        with self.photo_album_lock:
            album = self.photo_albums.pop(key, None)
        if album:
            with self.photo_album_lock:
                self.media_processing_chats.add(album.chat_id)
            self.executor.submit(
                self.process_photos,
                album.chat_id,
                album.first_message_id,
                album.photos,
                album.caption,
                album.project_key,
            )

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
        self.process_photos(
            chat_id,
            message_id,
            [photos],
            caption,
            self.active_project(chat_id).key,
        )

    def process_photos(
        self,
        chat_id: int,
        message_id: int,
        photo_sets: list[list[dict[str, Any]]],
        caption: str,
        project_key: str,
    ) -> None:
        count = len(photo_sets)
        status_id = self.api.send_message(
            chat_id,
            f"🖼 Читаю {'альбом' if count > 1 else 'фото'} ({count})…",
            message_id,
        )
        try:
            project = self.projects[project_key]
            saved_paths: list[Path] = []
            for index, photos in enumerate(photo_sets, start=1):
                largest = max(
                    photos, key=lambda photo: int(photo.get("file_size") or 0)
                )
                saved_path = (
                    project.root
                    / ".codex-telegram"
                    / "uploads"
                    / str(chat_id)
                    / (
                        f"screens-{int(time.time())}-{uuid.uuid4().hex[:8]}-"
                        f"{index:02d}.jpg"
                    )
                )
                self.api.download_file(str(largest["file_id"]), saved_path)
                saved_paths.append(saved_path)
            assert self.openai_key is not None
            analysis = analyze_photos(
                saved_paths, caption, self.openai_key, self.vision_model
            )
            self.api.edit_message(
                chat_id,
                status_id,
                f"🖼 {'Альбом' if count > 1 else 'Фото'} прочитан:\n{analysis[:3200]}",
            )
            relative_paths = "\n".join(
                f"- {path.relative_to(project.root)}" for path in saved_paths
            )
            prompt = (
                f"Пользователь отправил в Telegram изображений: {count}.\n"
                f"Локальные пути:\n{relative_paths}\n"
                f"Подпись пользователя: {caption or '(без подписи)'}\n\n"
                "Визуальный анализ OpenAI:\n"
                f"{analysis}\n\n"
                "Используй этот анализ как контекст задачи. Если нужно изменить проект, действуй по обычным правилам."
            )
            self.submit_codex(chat_id, message_id, prompt, project_key=project_key)
        except Exception as exc:
            self.api.edit_message(
                chat_id, status_id, f"Не удалось прочитать изображения:\n{exc}"
            )
        finally:
            with self.photo_album_lock:
                self.media_processing_chats.discard(chat_id)

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

    def submit_codex(
        self,
        chat_id: int,
        message_id: int,
        prompt: str,
        *,
        project_key: str | None = None,
    ) -> None:
        project = self.projects[project_key] if project_key else self.active_project(chat_id)
        if self.runner.is_running(chat_id) or self.release_for(project.key).is_running():
            self.api.send_message(
                chat_id,
                "Уже выполняется задача или release. Дождитесь завершения либо используйте /cancel",
            )
            return
        self.executor.submit(self.process_codex, chat_id, message_id, prompt, project.key)

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
        project = self.active_project(chat_id)
        if self.runner.is_running(chat_id) or self.release_for(project.key).is_running():
            self.submit_codex(chat_id, message_id, text)
            return
        action = PendingAction(
            intent.kind, intent.commit_message, project_key=project.key
        )
        with self.pending_lock:
            self.post_codex_actions[chat_id] = action
        prompt = (
            f"{text}\n\n"
            "Важно: выполни только изменения проекта и проверки. Не выполняй git commit, "
            "git push или Docker deploy — после успешного ответа Telegram-бот отдельно "
            "подготовит подтверждаемый release."
        )
        self.submit_codex(chat_id, message_id, prompt)

    def process_codex(
        self, chat_id: int, message_id: int, prompt: str, project_key: str
    ) -> None:
        project = self.projects[project_key]
        release = self.release_for(project_key)
        before = worktree_snapshot(project.root, project.protected_paths)
        status_id = self.api.send_message(
            chat_id, f"⏳ {project.label}: запускаю Codex…", message_id
        )
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
            summary, return_code, diagnostics = self.runner.run(
                chat_id, prompt, update_status, project_key
            )
            with self.pending_lock:
                post_action = self.post_codex_actions.pop(chat_id, None)
            if return_code == 0 and summary.final_response:
                update_status("✅ Codex завершил задачу")
                response_text, requested_files = extract_file_requests(summary.final_response)
                if response_text:
                    self.api.send_long_message(chat_id, response_text, markdown=True)
                self.send_codex_requested_files(chat_id, requested_files)
                if post_action:
                    after = worktree_snapshot(project.root, project.protected_paths)
                    changed_paths = task_changed_paths(before, after)
                    self.prepare_release_action(
                        chat_id,
                        message_id,
                        post_action.kind,
                        post_action.argument,
                        project_key=project_key,
                        paths=tuple(changed_paths),
                    )
                else:
                    after = worktree_snapshot(project.root, project.protected_paths)
                    changed_paths = task_changed_paths(before, after)
                    if changed_paths:
                        self.offer_post_task_actions(
                            chat_id, message_id, prompt, changed_paths, project_key
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
    projects = build_project_configs(project_root)
    runner = CodexRunner(project_root, codex_binary, state, projects)
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
        projects,
    )

    identity = api.call("getMe")
    api.call("deleteWebhook", {"drop_pending_updates": "false"})
    roots = ", ".join(str(project.root) for project in projects.values())
    print(f"Bot @{identity.get('username')} started for {roots}", flush=True)
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
