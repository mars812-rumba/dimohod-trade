import json
import os
import tempfile
import time
import unittest
from pathlib import Path

from tools.codex_telegram_bot.bot import (
    PROJECT_INSTRUCTIONS,
    CodexRunner,
    PendingAction,
    POST_TASK_KEYBOARD,
    RELEASE_CONFIRM_KEYBOARD,
    ReleaseManager,
    StateStore,
    StatusSummary,
    TelegramAPI,
    TelegramError,
    consume_codex_event,
    allowed_changed_paths,
    commit_message_from_prompt,
    detect_natural_confirmation,
    detect_natural_release_intent,
    extract_file_requests,
    extract_openai_output_text,
    is_protected_commit_path,
    load_dotenv,
    natural_image_prompt,
    safe_project_file,
    split_message,
)


class BotUtilitiesTest(unittest.TestCase):
    def test_split_message_preserves_content(self) -> None:
        text = "первая строка\n" + "слово " * 100
        chunks = split_message(text, limit=80)
        self.assertTrue(all(len(chunk) <= 80 for chunk in chunks))
        self.assertEqual(" ".join(" ".join(chunks).split()), " ".join(text.split()))

    def test_extract_file_requests_removes_markers(self) -> None:
        text = "Готово\n[[send_file:PROJECT_CONTEXT.md]]\n[[send_file:backend/app/main.py]]"
        clean_text, paths = extract_file_requests(text)
        self.assertEqual(clean_text, "Готово")
        self.assertEqual(paths, ["PROJECT_CONTEXT.md", "backend/app/main.py"])

    def test_safe_project_file_blocks_path_escape(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            allowed = root / "ok.txt"
            allowed.write_text("ok", encoding="utf-8")
            self.assertEqual(safe_project_file(root, "ok.txt"), allowed.resolve())
            with self.assertRaises(ValueError):
                safe_project_file(root, "../secret.txt")

    def test_extract_openai_output_text_supports_responses_shape(self) -> None:
        result = {
            "output": [
                {
                    "content": [
                        {"type": "output_text", "text": "описание фото"},
                    ]
                }
            ]
        }
        self.assertEqual(extract_openai_output_text(result), "описание фото")

    def test_natural_image_prompt_detects_russian_request(self) -> None:
        self.assertEqual(
            natural_image_prompt("сгенерируй фото трубы 115/200 на белом фоне"),
            "трубы 115/200 на белом фоне",
        )
        self.assertIsNone(natural_image_prompt("покажи статус проекта"))

    def test_release_protected_paths(self) -> None:
        self.assertTrue(is_protected_commit_path(".env"))
        self.assertTrue(is_protected_commit_path("./prices/50mm.json"))
        self.assertTrue(is_protected_commit_path(".codex-telegram/state.json"))
        self.assertFalse(is_protected_commit_path("apps/web/app/page.tsx"))

    def test_pending_action_expiry(self) -> None:
        current = PendingAction("push", "")
        old = PendingAction("push", "", created_at=time.monotonic() - 301)
        self.assertFalse(current.expired())
        self.assertTrue(old.expired())

    def test_natural_release_only_commands(self) -> None:
        push = detect_natural_release_intent("Запушь текущие изменения")
        ship = detect_natural_release_intent("Пожалуйста, запушь и задеплой еще раз")
        deploy = detect_natural_release_intent("сделай деплой")
        commit = detect_natural_release_intent("закоммить исправление меню")
        self.assertEqual(push.kind, "push")
        self.assertFalse(push.has_project_task)
        self.assertEqual(ship.kind, "ship")
        self.assertFalse(ship.has_project_task)
        self.assertEqual(deploy.kind, "deploy")
        self.assertEqual(commit.kind, "commit")
        self.assertFalse(commit.has_project_task)
        self.assertEqual(commit.commit_message, "исправление меню")

    def test_natural_task_then_release(self) -> None:
        intent = detect_natural_release_intent(
            "Исправь мобильное меню, потом запушь и задеплой"
        )
        publish = detect_natural_release_intent("Добавь тест и запушь изменения")
        self.assertEqual(intent.kind, "ship")
        self.assertTrue(intent.has_project_task)
        self.assertIn("исправь мобильное меню", intent.commit_message)
        self.assertEqual(publish.kind, "publish")
        self.assertTrue(publish.has_project_task)

    def test_non_release_message_is_unchanged(self) -> None:
        self.assertIsNone(detect_natural_release_intent("покажи статус каталога"))

    def test_natural_release_confirmation(self) -> None:
        self.assertEqual(detect_natural_confirmation("Подтверждаю, запускай!"), "confirm")
        self.assertEqual(detect_natural_confirmation("Отмени релиз"), "abort")
        self.assertIsNone(detect_natural_confirmation("да"))

    def test_release_keyboard_has_confirm_and_abort(self) -> None:
        buttons = RELEASE_CONFIRM_KEYBOARD["inline_keyboard"][0]
        self.assertEqual(
            [button["callback_data"] for button in buttons],
            ["release:confirm", "release:abort"],
        )

    def test_post_task_keyboard_has_ship_and_continue(self) -> None:
        buttons = POST_TASK_KEYBOARD["inline_keyboard"][0]
        self.assertEqual(
            [button["callback_data"] for button in buttons],
            ["posttask:ship", "posttask:continue"],
        )

    def test_allowed_changes_exclude_protected_paths(self) -> None:
        status = (
            "## ui/replit-port...origin/ui/replit-port\n"
            " M apps/web/app/page.tsx\n"
            "?? prices/50mm.json\n"
            "?? backend/configurator/chimney-configurator-png.html\n"
            "?? storage/catalog/new.png\n"
        )
        self.assertEqual(
            allowed_changed_paths(status),
            ["apps/web/app/page.tsx", "storage/catalog/new.png"],
        )

    def test_commit_message_comes_from_prompt(self) -> None:
        self.assertEqual(
            commit_message_from_prompt("**Исправь мобильное меню**\n\nДетали"),
            "Исправь мобильное меню",
        )

    def test_markdown_send_falls_back_to_plain_text(self) -> None:
        api = TelegramAPI("test-token")
        calls = []

        def fake_call(method, payload):
            calls.append(dict(payload))
            if payload.get("parse_mode"):
                raise TelegramError("can't parse entities")
            return {"message_id": 7}

        api.call = fake_call
        message_id = api.send_message(1, "*broken markdown", markdown=True)
        self.assertEqual(message_id, 7)
        self.assertEqual(calls[0]["parse_mode"], "Markdown")
        self.assertNotIn("parse_mode", calls[1])

    def test_ship_allows_commit_to_be_skipped(self) -> None:
        class FakeReleaseManager(ReleaseManager):
            def __init__(self):
                super().__init__(Path("."))
                self.skip_flags = []

            def test(self):
                return "tests ok"

            def commit(self, message, *, skip_if_empty=False):
                self.skip_flags.append(skip_if_empty)
                return "commit skipped"

            def push(self):
                return "push ok"

            def deploy(self):
                return "deploy ok"

        manager = FakeReleaseManager()
        output = manager.execute(PendingAction("ship", "message"))
        self.assertEqual(manager.skip_flags, [True])
        self.assertIn("commit skipped", output)
        self.assertIn("deploy ok", output)

    def test_load_dotenv_does_not_override_environment(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            env_file = Path(temp_dir) / ".env"
            env_file.write_text('BOT_TEST_EXISTING=new\nBOT_TEST_QUOTED="value"\n')
            os.environ["BOT_TEST_EXISTING"] = "old"
            os.environ.pop("BOT_TEST_QUOTED", None)
            load_dotenv(env_file)
            self.assertEqual(os.environ["BOT_TEST_EXISTING"], "old")
            self.assertEqual(os.environ["BOT_TEST_QUOTED"], "value")

    def test_state_first_private_user_claims_ownership(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "state.json"
            state = StateStore(path)
            self.assertFalse(state.claim(10, is_private_chat=False))
            self.assertTrue(state.claim(10, is_private_chat=True))
            self.assertTrue(state.is_authorized(10))
            self.assertFalse(state.claim(11, is_private_chat=True))
            self.assertEqual(json.loads(path.read_text())["owner_user_id"], 10)

    def test_configured_allowlist_disables_first_user_claim(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            state = StateStore(Path(temp_dir) / "state.json", configured_users={42})
            self.assertFalse(state.claim(10, is_private_chat=True))
            self.assertTrue(state.claim(42, is_private_chat=True))

    def test_codex_command_resumes_saved_thread(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state = StateStore(root / "state.json")
            runner = CodexRunner(root, "/bin/codex", state)
            initial = runner.build_command(1, "задача")
            self.assertIn(PROJECT_INSTRUCTIONS + "задача", initial)
            state.set_thread(1, "thread-123")
            resumed = runner.build_command(1, "продолжай")
            self.assertEqual(resumed[-3:], ["resume", "thread-123", "продолжай"])

    def test_codex_events_update_status(self) -> None:
        summary = StatusSummary(started_at=time.monotonic())
        consume_codex_event({"type": "thread.started", "thread_id": "abc"}, summary)
        consume_codex_event(
            {
                "type": "item.started",
                "item": {"type": "command_execution", "command": "pytest -q"},
            },
            summary,
        )
        consume_codex_event(
            {
                "type": "item.completed",
                "item": {"type": "agent_message", "text": "готово"},
            },
            summary,
        )
        self.assertEqual(summary.thread_id, "abc")
        self.assertEqual(summary.commands_started, 1)
        self.assertEqual(summary.final_response, "готово")


if __name__ == "__main__":
    unittest.main()
