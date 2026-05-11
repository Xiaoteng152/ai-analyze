#!/usr/bin/env bash
# 生产构建后拉起 next start，对核心 JSON API 做一次连通性检查。
# 若本机设置了 HTTP(S)_PROXY，curl 可能把 localhost 走代理导致失败，故使用 --noproxy '*'。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build

PORT="${SMOKE_PORT:-$((3050 + RANDOM % 50))}"
LOG="/tmp/next-smoke-${PORT}.log"
PIDFILE="/tmp/next-smoke-${PORT}.pid"

npx next start -p "${PORT}" >"${LOG}" 2>&1 &
echo $! >"${PIDFILE}"
cleanup() {
  if [[ -f "${PIDFILE}" ]]; then
    kill "$(cat "${PIDFILE}")" 2>/dev/null || true
    rm -f "${PIDFILE}"
  fi
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl --noproxy '*' -sSf "http://127.0.0.1:${PORT}/api/user-context" >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

curl --noproxy '*' -sSf "http://127.0.0.1:${PORT}/api/user-context" | head -c 240
echo ""
curl --noproxy '*' -sSf "http://127.0.0.1:${PORT}/api/retrospectives/latest" | head -c 240
echo ""
curl --noproxy '*' -sSf "http://127.0.0.1:${PORT}/api/retrospectives/trend?days=7" | head -c 320
echo ""

echo "smoke-api OK (port ${PORT})"
