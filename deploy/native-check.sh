#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
export PATH="/home/dimohod-production-runtime/node/bin:$PATH"
cd "$project_root/backend"
/home/dimohod-production-runtime/venv/bin/python -m pytest -q
cd "$project_root"
node --experimental-strip-types --test apps/web/lib/*.test.mjs
