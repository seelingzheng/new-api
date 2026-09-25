#!/usr/bin/env bash
set -Eeuo pipefail

# Download a verified snapshot of the running GoAPI deployment.
# SSH prompts for the server password when key-based authentication is not set up.
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
SERVER="${GOAPI_SERVER:-root@103.236.96.12}"
SSH_KEY="${GOAPI_SSH_KEY:-}"
REMOTE_DIR="${GOAPI_REMOTE_DIR:-/opt/goapi}"
DESTINATION="${GOAPI_LOCAL_BACKUP_DIR:-$REPO_DIR/ops/backups}"
KEEP_DAYS="${GOAPI_BACKUP_KEEP_DAYS:-30}"

fail() {
  echo "Backup failed: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

for command_name in ssh scp sha256sum tar; do
  require_command "$command_name"
done

[[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] || fail "GOAPI_BACKUP_KEEP_DAYS must be a non-negative integer"

SSH_ARGS=(-o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3)
SCP_ARGS=(-o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=3)
if [[ -n "$SSH_KEY" ]]; then
  [[ -r "$SSH_KEY" ]] || fail "SSH key is not readable: $SSH_KEY"
  SSH_ARGS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
  SCP_ARGS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
fi

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
LOCAL_DIR="$DESTINATION/$STAMP"
REMOTE_STAGING="$REMOTE_DIR/backups/.staging/$STAMP"
mkdir -p "$LOCAL_DIR"

echo "Server:      $SERVER"
echo "Remote dir:  $REMOTE_DIR"
echo "Local dir:   $LOCAL_DIR"

remote() {
  ssh "${SSH_ARGS[@]}" "$SERVER" "$@"
}

echo "[1/5] Creating remote backup archives..."
remote "REMOTE_DIR='$REMOTE_DIR' STAMP='$STAMP' REMOTE_STAGING='$REMOTE_STAGING' GOAPI_CONTAINER='${GOAPI_CONTAINER:-new-api}' GOAPI_DATA_VOLUME='${GOAPI_DATA_VOLUME:-}' GOAPI_POSTGRES_CONTAINER='${GOAPI_POSTGRES_CONTAINER:-postgres}' GOAPI_POSTGRES_DATABASE='${GOAPI_POSTGRES_DATABASE:-new-api}' GOAPI_POSTGRES_USER='${GOAPI_POSTGRES_USER:-root}' GOAPI_POSTGRES_PASSWORD='${GOAPI_POSTGRES_PASSWORD:-}' GOAPI_REDIS_CONTAINER='${GOAPI_REDIS_CONTAINER:-redis}' GOAPI_REDIS_PASSWORD='${GOAPI_REDIS_PASSWORD:-}' GOAPI_BACKUP_HELPER_IMAGE='${GOAPI_BACKUP_HELPER_IMAGE:-alpine:3.20}' bash -s" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

: "${REMOTE_DIR:?}"
: "${STAMP:?}"
: "${REMOTE_STAGING:?}"

CONTAINER="$GOAPI_CONTAINER"
DATA_VOLUME="$GOAPI_DATA_VOLUME"
POSTGRES_CONTAINER="$GOAPI_POSTGRES_CONTAINER"
POSTGRES_DATABASE="$GOAPI_POSTGRES_DATABASE"
POSTGRES_USER="$GOAPI_POSTGRES_USER"
POSTGRES_PASSWORD="$GOAPI_POSTGRES_PASSWORD"
REDIS_CONTAINER="$GOAPI_REDIS_CONTAINER"
REDIS_PASSWORD="$GOAPI_REDIS_PASSWORD"
HELPER_IMAGE="$GOAPI_BACKUP_HELPER_IMAGE"

docker inspect "$CONTAINER" >/dev/null
mkdir -p "$REMOTE_STAGING/data" "$REMOTE_STAGING/database" "$REMOTE_STAGING/redis" "$REMOTE_STAGING/image" "$REMOTE_STAGING/metadata"

if [[ -z "$DATA_VOLUME" ]]; then
  DATA_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$CONTAINER")
fi
if [[ -n "$DATA_VOLUME" ]]; then
  docker volume inspect "$DATA_VOLUME" >/dev/null
  docker run --rm -v "$DATA_VOLUME:/source:ro" -v "$REMOTE_STAGING/data:/backup" "$HELPER_IMAGE" tar -C /source -czf /backup/goapi-data.tar.gz .
fi

if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  if [[ -z "$POSTGRES_PASSWORD" ]]; then
    POSTGRES_PASSWORD=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$POSTGRES_CONTAINER" | sed -n 's/^POSTGRES_PASSWORD=//p' | head -n 1)
  fi
  if [[ -n "$POSTGRES_PASSWORD" ]]; then
    docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DATABASE" > "$REMOTE_STAGING/database/postgres.dump"
  else
    echo "PostgreSQL container found but no password was available" >&2
  fi
fi

if docker inspect "$REDIS_CONTAINER" >/dev/null 2>&1; then
  if [[ -n "$REDIS_PASSWORD" ]]; then
    docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE >/dev/null || true
  else
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE >/dev/null || true
  fi
  sleep 2
  REDIS_PATH=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$REDIS_CONTAINER")
  if [[ -n "$REDIS_PATH" && -d "$REDIS_PATH" ]]; then
    tar -C "$REDIS_PATH" -czf "$REMOTE_STAGING/redis/redis-data.tar.gz" .
  fi
fi

IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")
docker image inspect "$IMAGE" >/dev/null
docker save "$IMAGE" | gzip -c > "$REMOTE_STAGING/image/goapi-image.tar.gz"

docker inspect "$CONTAINER" > "$REMOTE_STAGING/metadata/container-inspect.json"
docker ps -a --no-trunc > "$REMOTE_STAGING/metadata/docker-ps.txt"
docker images --digests > "$REMOTE_STAGING/metadata/docker-images.txt"
docker version > "$REMOTE_STAGING/metadata/docker-version.txt"
if [[ -f "$REMOTE_DIR/.env" ]]; then
  sed -E 's/([A-Za-z0-9_]*(PASSWORD|TOKEN|SECRET|KEY)[A-Za-z0-9_]*)=.*/\1=<redacted>/' "$REMOTE_DIR/.env" > "$REMOTE_STAGING/metadata/env.redacted"
fi
printf 'container=%s\nimage=%s\ndata_volume=%s\ncreated_at=%s\n' "$CONTAINER" "$IMAGE" "$DATA_VOLUME" "$STAMP" > "$REMOTE_STAGING/metadata/manifest.txt"

for component in data database redis image metadata; do
  if find "$REMOTE_STAGING/$component" -mindepth 1 -print -quit | grep -q .; then
    tar -C "$REMOTE_STAGING/$component" -czf "$REMOTE_DIR/backups/goapi-${component}-${STAMP}.tar.gz" .
    sha256sum "$REMOTE_DIR/backups/goapi-${component}-${STAMP}.tar.gz" > "$REMOTE_DIR/backups/goapi-${component}-${STAMP}.tar.gz.sha256"
  fi
done
tar -C "$REMOTE_STAGING" -czf "$REMOTE_DIR/backups/goapi-all-$STAMP.tar.gz" .
sha256sum "$REMOTE_DIR/backups/goapi-all-$STAMP.tar.gz" > "$REMOTE_DIR/backups/goapi-all-$STAMP.tar.gz.sha256"
printf '%s\n' "$REMOTE_DIR/backups/goapi-all-$STAMP.tar.gz"
REMOTE_SCRIPT

REMOTE_ARCHIVE=$(remote "printf '%s/%s' '$REMOTE_DIR/backups' 'goapi-all-$STAMP.tar.gz'")
REMOTE_CHECKSUM="$REMOTE_ARCHIVE.sha256"

echo "[2/5] Downloading archive..."
scp "${SCP_ARGS[@]}" "$SERVER:$REMOTE_ARCHIVE" "$LOCAL_DIR/"
scp "${SCP_ARGS[@]}" "$SERVER:$REMOTE_CHECKSUM" "$LOCAL_DIR/"

REMOTE_FILES=$(remote "find '$REMOTE_DIR/backups' -maxdepth 1 -type f -name 'goapi-*-$STAMP.tar.gz*' -printf '%f\\n' | sort")
while IFS= read -r remote_file; do
  [[ -n "$remote_file" ]] || continue
  case "$remote_file" in
    "$(basename "$REMOTE_ARCHIVE")"|"$(basename "$REMOTE_CHECKSUM")") continue ;;
  esac
  scp "${SCP_ARGS[@]}" "$SERVER:$REMOTE_DIR/backups/$remote_file" "$LOCAL_DIR/"
done <<< "$REMOTE_FILES"

echo "[3/5] Verifying SHA-256..."
(cd "$LOCAL_DIR" && sha256sum -c ./*.sha256)

echo "[4/5] Writing local manifest..."
{
  printf 'server=%s\nremote_archive=%s\ncreated_at=%s\n' "$SERVER" "$REMOTE_ARCHIVE" "$STAMP"
  printf 'local_archive=%s\n' "$LOCAL_DIR/$(basename "$REMOTE_ARCHIVE")"
} > "$LOCAL_DIR/backup-manifest.txt"

echo "[5/5] Cleaning local backups older than $KEEP_DAYS days..."
find "$DESTINATION" -mindepth 1 -maxdepth 1 -type d -mtime "+$KEEP_DAYS" -exec rm -rf -- {} +

echo "Backup completed: $LOCAL_DIR/$(basename "$REMOTE_ARCHIVE")"
