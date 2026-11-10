#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Instale o Python 3 para iniciar o jogo com contas e ranking.' >&2
  exit 1
fi
exec python3 server.py "$@"
