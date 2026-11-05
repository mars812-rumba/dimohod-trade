#!/usr/bin/env bash
set -euo pipefail
started=$(date --iso-8601=seconds)
if systemctl start dimohod-deploy.service; then
  journalctl -u dimohod-deploy.service --since "$started" -o cat --no-pager -n 20
else
  journalctl -u dimohod-deploy.service --since "$started" -o cat --no-pager -n 60
  exit 1
fi
