import json
import os
import subprocess
import tempfile
import time
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from tools.codex_telegram_bot.bot import (
    CODEX_MODELS,
    OpenAIQuotaError,
    PROJECT_INSTRUCTIONS,
    SUNNY_PROJECT_INSTRUCTIONS,
    BotApplication,
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
    build_project_configs,
    commit_message_from_prompt,
    detect_natural_confirmation,
    detect_natural_release_intent,
    discover_openai_keys,
    extract_file_requests,
    extract_openai_output_text,
    graphify_query_context,
    is_unusable_thread_error,
    is_protected_commit_path,
    load_dotenv,
    model_keyboard,
    openai_key_keyboard,
    recovery_context_prompt,
    natural_image_prompt,
    safe_project_file,
    safe_markdown_filename,
    split_message,
    task_changed_paths,
)


class BotUtilitiesTest(unittest.TestCase):
    def test_discovers_numbered_openai_keys_in_order(self) -> None:
        keys = discover_openai_keys(
            {
                "OPENAI_API_KEY_3": "third",
                "OPENAI_API_KEY": "first",
                "OPENAI_API_KEY_2": "second",
                "OPENAI_API_KEY_4": "",
                "OPENAI_IMAGE_MODEL": "ignored",
            }
        )
        self.assertEqual(
            keys,
            [
                ("OPENAI_API_KEY", "first"),
                ("OPENAI_API_KEY_2", "second"),
                ("OPENAI_API_KEY_3", "third"),
            ],
        )

    def test_openai_key_keyboard_marks_selected_key(self) -> None:
        keyboard = openai_key_keyboard([("one", "a"), ("two", "b")], 1)
        buttons = keyboard["inline_keyboard"][0]
        self.assertEqual([button["callback_data"] for button in buttons], ["openai_key:0", "openai_key:1"])
        self.assertNotIn("✅", buttons[0]["text"])
        self.assertIn("✅", buttons[1]["text"])

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

    def test_safe_markdown_filename_accepts_markdown_and_blocks_other_files(self) -> None:
        self.assertEqual(safe_markdown_filename("docs/ТЗ проекта.md"), "ТЗ проекта.md")
        self.assertEqual(safe_markdown_filename("NOTES.MARKDOWN"), "NOTES.MARKDOWN")
        with self.assertRaises(ValueError):
            safe_markdown_filename("secrets.env")

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

    def test_model_keyboard_has_requested_profiles(self) -> None:
        buttons = model_keyboard()["inline_keyboard"][0]
        self.assertEqual(
            [button["callback_data"] for button in buttons],
            ["model:gpt55_high", "model:sol_medium"],
        )
        self.assertEqual(CODEX_MODELS["gpt55_high"].reasoning_effort, "high")
        self.assertEqual(CODEX_MODELS["sol_medium"].model, "gpt-5.6-sol")

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

    def test_commit_ignores_removed_untracked_path_from_task_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            subprocess.run(["git", "init", "-b", "main"], cwd=root, check=True)
            subprocess.run(
                ["git", "config", "user.email", "test@example.test"],
                cwd=root,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.name", "Test User"], cwd=root, check=True
            )
            (root / "tracked.txt").write_text("before\n", encoding="utf-8")
            subprocess.run(["git", "add", "tracked.txt"], cwd=root, check=True)
            subprocess.run(["git", "commit", "-m", "Initial"], cwd=root, check=True)

            (root / "created.txt").write_text("new\n", encoding="utf-8")
            manager = ReleaseManager(root, branch="main")
            output = manager.commit(
                "Add current file",
                paths=("created.txt", "removed-untracked.webp"),
            )

            self.assertIn("created.txt", output)
            committed = subprocess.run(
                ["git", "show", "--pretty=", "--name-only", "HEAD"],
                cwd=root,
                capture_output=True,
                text=True,
                check=True,
            ).stdout.splitlines()
            self.assertEqual(committed, ["created.txt"])

    def test_remote_deploy_syncs_code_storage_and_runs_fixed_script(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "storage").mkdir()
            key = root / "deploy-key"
            key.write_text("private key placeholder", encoding="utf-8")
            config = replace(
                build_project_configs(root)["dimohod"],
                remote_deploy_host="deploy@example.test",
                remote_deploy_root="/opt/dimohod-trade",
                remote_deploy_key=key,
            )
            manager = ReleaseManager(root, config=config)
            with patch(
                "tools.codex_telegram_bot.bot.run_host_command",
                return_value="ok",
            ) as mocked:
                output = manager.deploy_remote()
            commands = [call.args[0] for call in mocked.call_args_list]
            self.assertEqual([command[0] for command in commands], ["rsync", "ssh"])
            self.assertIn("--exclude=/.env", commands[0])
            self.assertEqual(commands[-1][-1], "/opt/dimohod-trade/deploy/remote-deploy.sh")
            self.assertIn("ok", output)

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

    def test_projects_have_separate_threads_and_workdirs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            sunny = root / "sunny"
            sunny.mkdir()
            projects = build_project_configs(root)
            projects["sunny"] = type(projects["sunny"])(
                **{**projects["sunny"].__dict__, "root": sunny}
            )
            state = StateStore(root / "state.json")
            runner = CodexRunner(root, "/bin/codex", state, projects)
            state.set_thread(1, "dim-thread", "dimohod")
            state.set_thread(1, "sun-thread", "sunny")
            dim_command = runner.build_command(1, "задача", "dimohod")
            sunny_command = runner.build_command(1, "задача", "sunny")
            self.assertIn(str(root), dim_command)
            self.assertIn(str(sunny), sunny_command)
            self.assertEqual(dim_command[-3:], ["resume", "dim-thread", "задача"])
            self.assertEqual(sunny_command[-3:], ["resume", "sun-thread", "задача"])
            self.assertEqual(
                dim_command[dim_command.index("--sandbox") + 1],
                "danger-full-access",
            )
            self.assertEqual(
                dim_command[dim_command.index("--ask-for-approval") + 1],
                "on-request",
            )
            self.assertLess(
                dim_command.index("--ask-for-approval"), dim_command.index("exec")
            )
            self.assertEqual(
                sunny_command[sunny_command.index("--sandbox") + 1],
                "workspace-write",
            )
            self.assertNotIn("--ask-for-approval", sunny_command)

    def test_new_sunny_session_uses_sunny_instructions(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            projects = build_project_configs(root)
            state = StateStore(root / "state.json")
            runner = CodexRunner(root, "/bin/codex", state, projects)
            command = runner.build_command(2, "задача", "sunny")
            self.assertEqual(command[-1], SUNNY_PROJECT_INSTRUCTIONS + "задача")

    def test_task_changed_paths_excludes_unchanged_dirty_files(self) -> None:
        before = {"old-user-file.txt": "same", "edited.ts": "before"}
        after = {
            "old-user-file.txt": "same",
            "edited.ts": "after",
            "created.ts": "new",
        }
        self.assertEqual(
            task_changed_paths(before, after), ["created.ts", "edited.ts"]
        )

    def test_active_project_defaults_and_persists(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            state = StateStore(Path(temp_dir) / "state.json")
            self.assertEqual(state.get_active_project(10), "dimohod")
            state.set_active_project(10, "sunny")
            self.assertEqual(state.get_active_project(10), "sunny")

    def test_context_history_is_scoped_and_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            state = StateStore(Path(temp_dir) / "state.json")
            for index in range(7):
                state.add_context_history(10, "dimohod", f"task {index}", f"answer {index}")
            state.add_context_history(10, "sunny", "sunny task", "sunny answer")
            history = state.get_context_history(10, "dimohod")
            self.assertEqual(len(history), 5)
            self.assertEqual(history[0]["prompt"], "task 2")
            self.assertEqual(
                state.get_context_history(10, "sunny")[0]["response"],
                "sunny answer",
            )

    def test_recovery_prompt_contains_history_and_current_request(self) -> None:
        prompt = recovery_context_prompt(
            "продолжай",
            [{"prompt": "исправь меню", "response": "меню исправлено"}],
        )
        self.assertIn("исправь меню", prompt)
        self.assertIn("меню исправлено", prompt)
        self.assertTrue(prompt.endswith("продолжай"))

    def test_unusable_thread_error_detects_missing_rollout(self) -> None:
        summary = StatusSummary()
        consume_codex_event(
            {
                "type": "turn.failed",
                "error": "thread/resume failed: no rollout found for thread id abc",
            },
            summary,
        )
        self.assertTrue(is_unusable_thread_error(summary, ""))

    def test_unusable_thread_error_detects_corrupt_utf8_history(self) -> None:
        diagnostics = (
            "Error: thread/resume: thread/resume failed: failed to read thread: "
            "thread-store internal error: failed to load thread history /root/.codex/sessions/x.jsonl: "
            "stream did not contain valid UTF-8 (code -32603)"
        )
        self.assertTrue(is_unusable_thread_error(StatusSummary(), diagnostics))

    def test_unusable_thread_error_ignores_unrelated_failure(self) -> None:
        self.assertFalse(
            is_unusable_thread_error(StatusSummary(error_message="network timeout"), "")
        )

    def test_model_selection_changes_command_and_keeps_project_thread(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state = StateStore(root / "state.json")
            runner = CodexRunner(root, "/bin/codex", state)
            state.set_model_key(1, "gpt55_high")
            slot = state.thread_slot("dimohod", "gpt55_high")
            state.set_thread(1, "thread-55", slot)
            command = runner.build_command(1, "задача")
            self.assertIn("gpt-5.5", command)
            self.assertIn('model_reasoning_effort="high"', command)
            self.assertEqual(command[-3:], ["resume", "thread-55", "задача"])
            self.assertEqual(
                state.thread_slot("dimohod", "gpt55_high"),
                state.thread_slot("dimohod", "sol_medium"),
            )

    def test_graphify_context_is_added_only_when_graph_exists(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.assertEqual(graphify_query_context(root, "задача"), "")
            graph_dir = root / "graphify-out"
            graph_dir.mkdir()
            (graph_dir / "graph.json").write_text("{}", encoding="utf-8")
            completed = subprocess.CompletedProcess(
                args=[], returncode=0, stdout="NODE App", stderr=""
            )
            with patch(
                "tools.codex_telegram_bot.bot.subprocess.run",
                return_value=completed,
            ) as mocked:
                self.assertEqual(
                    graphify_query_context(root, "исправь меню"), "NODE App"
                )
                self.assertEqual(mocked.call_args.args[0][:2], ["graphify", "query"])

    def test_photo_album_collects_multiple_screenshots(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state = StateStore(root / "state.json")
            runner = CodexRunner(root, "/bin/codex", state)
            app = BotApplication(
                object(),
                state,
                runner,
                root,
                "test-key",
                "transcribe",
                "vision",
                "image",
                "1024x1024",
                "medium",
            )
            app.queue_photo_album(1, 10, "album-1", [{"file_id": "a"}], "ошибка")
            app.queue_photo_album(1, 11, "album-1", [{"file_id": "b"}], "")
            album = app.photo_albums[(1, "album-1")]
            self.assertEqual(len(album.photos), 2)
            self.assertEqual(album.caption, "ошибка")
            self.assertTrue(app.has_pending_album(1))
            assert album.timer is not None
            album.timer.cancel()

    def test_text_messages_are_combined_into_one_codex_task(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state = StateStore(root / "state.json")
            runner = CodexRunner(root, "/bin/codex", state)
            app = BotApplication(
                object(),
                state,
                runner,
                root,
                None,
                "transcribe",
                "vision",
                "image",
                "1024x1024",
                "medium",
            )
            with patch.object(app, "route_user_text") as route:
                app.queue_user_text(1, 10, "Первая часть")
                app.queue_user_text(1, 11, "Вторая часть")
                batch = app.text_batches[1]
                assert batch.timer is not None
                batch.timer.cancel()
                app.flush_user_text(1)

            route.assert_called_once_with(
                1, 10, "Первая часть\n\nВторая часть"
            )
            self.assertNotIn(1, app.text_batches)

    def test_openai_quota_falls_back_and_persists_next_key(self) -> None:
        class FakeAPI:
            def __init__(self):
                self.messages = []

            def send_message(self, chat_id, message, *args, **kwargs):
                self.messages.append((chat_id, message))

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state = StateStore(root / "state.json")
            api = FakeAPI()
            app = BotApplication(
                api,
                state,
                object(),
                root,
                [("OPENAI_API_KEY", "exhausted"), ("OPENAI_API_KEY_2", "working")],
                "transcribe",
                "vision",
                "image",
                "1024x1024",
                "medium",
            )
            calls = []

            def operation(key):
                calls.append(key)
                if key == "exhausted":
                    raise OpenAIQuotaError("insufficient_quota")
                return "ok"

            self.assertEqual(app.run_openai_with_fallback(7, operation), "ok")
            self.assertEqual(calls, ["exhausted", "working"])
            self.assertEqual(state.get_openai_key_index(7, 2), 1)
            self.assertIn("Переключаюсь на API 2", api.messages[0][1])

    def test_non_quota_openai_error_does_not_switch_key(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            state = StateStore(root / "state.json")
            app = BotApplication(
                object(),
                state,
                object(),
                root,
                [("OPENAI_API_KEY", "first"), ("OPENAI_API_KEY_2", "second")],
                "transcribe",
                "vision",
                "image",
                "1024x1024",
                "medium",
            )
            with self.assertRaisesRegex(RuntimeError, "network"):
                app.run_openai_with_fallback(7, lambda key: (_ for _ in ()).throw(RuntimeError("network")))
            self.assertEqual(state.get_openai_key_index(7, 2), 0)

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
