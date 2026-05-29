#!/usr/bin/env bash
# Atlas — Byreal CLI installer + setup wizard.
#
# Installs `byreal-cli` (Skills) and `byreal-perps-cli` (Perps) globally via npm,
# then walks through the one-time wallet setup for each.
#
# Refs:
#   https://github.com/byreal-git/byreal-agent-skills
#   https://github.com/byreal-git/byreal-perps-cli
set -euo pipefail

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing: $1"; exit 1; }
}

require node
require npm

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node >= 18 required (have $(node -v)). Install via nvm: nvm install 20" >&2
  exit 1
fi

echo "==> Installing @byreal-io/byreal-cli (Agent Skills)"
npm install -g @byreal-io/byreal-cli

echo "==> Installing @byreal-io/byreal-perps-cli (Perps)"
npm install -g @byreal-io/byreal-perps-cli

echo
echo "==> byreal-cli version:"
byreal-cli --version || true
echo "==> byreal-perps-cli version:"
byreal-perps-cli --version || true

echo
echo "==> Run wallet setup (interactive):"
echo "    byreal-cli setup"
echo "    byreal-perps-cli account init"
echo
echo "==> Sanity check after setup:"
echo "    byreal-cli wallet balance -o json"
echo "    byreal-perps-cli account balance -o json"
echo
echo "==> When ready, set byreal.enabled=true in agent/configs/atlas.yaml"
