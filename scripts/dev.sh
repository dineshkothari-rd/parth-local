#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if [ -z "${JAVA_HOME:-}" ]; then
	if [ -d "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home" ]; then
		export JAVA_HOME="/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"
		export PATH="$JAVA_HOME/bin:$PATH"
	fi
fi

for tool in docker java node npm openssl curl lsof pgrep; do
	command -v "$tool" >/dev/null 2>&1 || { echo "Missing required command: $tool" >&2; exit 1; }
done

for port in 8080 5173; do
	existing_pid=$(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
	if [ -n "$existing_pid" ]; then
		echo "Port $port was in use by PID $existing_pid. Stopping previous instance..."
		kill -TERM $existing_pid 2>/dev/null || true
		sleep 1
		if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
			kill -9 $existing_pid 2>/dev/null || true
		fi
	fi
done

if [ ! -f "$ROOT/.env" ]; then
	secret=$(openssl rand -hex 32)
	sed "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" "$ROOT/.env.example" > "$ROOT/.env"
	chmod 600 "$ROOT/.env"
	echo "Created .env with a random local JWT secret."
fi

set -a
. "$ROOT/.env"
set +a

backend_pid=
frontend_pid=
stop_tree() {
	for child in $(pgrep -P "$1" 2>/dev/null || true); do
		stop_tree "$child"
	done
	kill -TERM "$1" 2>/dev/null || true
}
cleanup() {
	trap - EXIT INT TERM
	[ -z "$backend_pid" ] || stop_tree "$backend_pid"
	[ -z "$frontend_pid" ] || stop_tree "$frontend_pid"
	[ -z "$backend_pid" ] || wait "$backend_pid" 2>/dev/null || true
	[ -z "$frontend_pid" ] || wait "$frontend_pid" 2>/dev/null || true
	docker compose -f "$ROOT/docker-compose.yml" stop postgres >/dev/null 2>&1 || true
	echo "NearKart stopped."
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker compose -f "$ROOT/docker-compose.yml" up -d --wait postgres

if [ ! -f "$ROOT/frontend/node_modules/.package-lock.json" ] || [ "$ROOT/frontend/package-lock.json" -nt "$ROOT/frontend/node_modules/.package-lock.json" ]; then
	(cd "$ROOT/frontend" && npm ci)
fi

(cd "$ROOT/backend" && exec ./mvnw spring-boot:run) &
backend_pid=$!

attempt=0
until curl --fail --silent http://localhost:8080/actuator/health >/dev/null 2>&1; do
	if ! kill -0 "$backend_pid" 2>/dev/null; then
		wait "$backend_pid"
		exit $?
	fi
	attempt=$((attempt + 1))
	[ "$attempt" -lt 60 ] || { echo "Backend did not become healthy within 60 seconds." >&2; exit 1; }
	sleep 1
done

(cd "$ROOT/frontend" && exec ./node_modules/.bin/vite --host 0.0.0.0) &
frontend_pid=$!

attempt=0
until curl --fail --silent http://localhost:5173 >/dev/null 2>&1; do
	if ! kill -0 "$frontend_pid" 2>/dev/null; then
		wait "$frontend_pid"
		exit $?
	fi
	attempt=$((attempt + 1))
	[ "$attempt" -lt 30 ] || { echo "Frontend did not become ready within 30 seconds." >&2; exit 1; }
	sleep 1
done

echo ""
echo "Walkit is running:"
echo "  App:    http://localhost:5173"
echo "  Health: http://localhost:8080/actuator/health"
echo "Press Ctrl+C to stop everything."

wait "$backend_pid"
