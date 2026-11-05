"""Run a recovery command with private configuration outside the repository."""

import argparse
import os
import subprocess
from pathlib import Path

from dotenv import dotenv_values


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("A command is required after --")
    env = os.environ.copy()
    env.update({key: value for key, value in dotenv_values(args.env_file).items() if value is not None})
    raise SystemExit(subprocess.call(command, env=env))


if __name__ == "__main__":
    main()
