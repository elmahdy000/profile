#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/profile"
BACKUP_DIR="/var/backups/drelmahdy"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_DIR="$BACKUP_DIR/$STAMP"

mkdir -p "$TARGET_DIR"

DATABASE_URL="$(grep -m1 '^DATABASE_URL=' "$APP_DIR/.env" | cut -d '=' -f2-)"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is missing from $APP_DIR/.env" >&2
  exit 1
fi

pg_dump "$DATABASE_URL" --format=custom --file="$TARGET_DIR/database.dump"

cd "$APP_DIR"
MEDIA_PATHS=()
[[ -d "public/uploads" ]] && MEDIA_PATHS+=("public/uploads")
[[ -d "private/learning-files" ]] && MEDIA_PATHS+=("private/learning-files")
if (( ${#MEDIA_PATHS[@]} )); then
  tar -czf "$TARGET_DIR/media.tar.gz" "${MEDIA_PATHS[@]}"
else
  tar -czf "$TARGET_DIR/media.tar.gz" --files-from /dev/null
fi

printf 'created_at=%s\napp_dir=%s\n' "$(date --iso-8601=seconds)" "$APP_DIR" > "$TARGET_DIR/manifest.txt"
sha256sum "$TARGET_DIR/database.dump" "$TARGET_DIR/media.tar.gz" > "$TARGET_DIR/SHA256SUMS"

find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" -exec rm -rf -- {} +
echo "Backup completed: $TARGET_DIR"
