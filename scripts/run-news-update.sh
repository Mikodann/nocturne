#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/nocturne"
LOG_DIR="$PROJECT_DIR/scripts/logs"
mkdir -p "$LOG_DIR"

TS="$(date '+%Y-%m-%d_%H-%M-%S')"
LOG_FILE="$LOG_DIR/news-update-$TS.log"

{
  echo "[$(date '+%F %T')] 🚀 뉴스 자동 업데이트 시작"
  cd "$PROJECT_DIR"

  node ./scripts/scrape-news.js
  node ./scripts/update-index-news.js

  if ! git diff --quiet -- index.html scripts/artist-data.json; then
    git add index.html scripts/artist-data.json
    git commit -m "chore: auto-update music news ($(date '+%F %R'))"
    git push origin HEAD
    echo "[$(date '+%F %T')] ✅ 변경사항 커밋 및 푸시 완료"
  else
    echo "[$(date '+%F %T')] ℹ️ 변경사항 없음"
  fi
} >> "$LOG_FILE" 2>&1
