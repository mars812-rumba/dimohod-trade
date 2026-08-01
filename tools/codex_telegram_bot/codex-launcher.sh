#!/usr/bin/env bash
set -euo pipefail

# The VS Code extension directory contains a version in its name and changes
# after upgrades. Resolve the newest installed Codex binary at runtime.
shopt -s nullglob
candidates=(
  /root/.vscode-server/extensions/openai.chatgpt-*-linux-x64/bin/linux-x86_64/codex
)

if ((${#candidates[@]} == 0)); then
  echo "Codex binary was not found in the OpenAI VS Code extension" >&2
  exit 127
fi

codex_binary="${candidates[${#candidates[@]}-1]}"
exec "$codex_binary" "$@"
