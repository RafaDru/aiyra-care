#!/usr/bin/env bash
# Instala o binário RTK em .local/bin (repo-local, idempotente).
# Cloud Agent: chame no fim do install do environment ou manualmente após clone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/.local/bin"
VERSION="${RTK_VERSION:-0.51.0}"
ARCH="${RTK_LINUX_ARCH:-x86_64-unknown-linux-musl}"

mkdir -p "$BIN"

if [[ -x "$BIN/rtk" ]]; then
  current="$("$BIN/rtk" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)"
  if [[ "$current" == "$VERSION" ]]; then
    echo "rtk $VERSION already installed at $BIN/rtk"
    exit 0
  fi
fi

URL="https://github.com/rtk-ai/rtk/releases/download/v${VERSION}/rtk-${ARCH}.tar.gz"
echo "Downloading rtk v${VERSION} (${ARCH})…"
curl -fsSL "$URL" | tar -xz -C "$BIN"
chmod +x "$BIN/rtk"
"$BIN/rtk" --version
echo "Installed: $BIN/rtk"
