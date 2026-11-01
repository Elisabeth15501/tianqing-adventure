#!/bin/bash
# 用法: probe.sh W H "QUERY"   （QUERY 形如 act=chen&step=12 或 duo=guorong:a1,wangpu:a1）
W=$1; H=$2; Q=$3
CHROME="/c/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
U="preview%2Fdev-fig-metrics.html%3F${Q//&/%26}"
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=$((W+40)),$((H+80)) --virtual-time-budget=14000 \
  --dump-dom "http://127.0.0.1:8765/preview/iframe-frame.html?w=$W&h=$H&u=$U&crop=1" 2>/dev/null \
  | grep -o '<pre id="json"[^>]*>[^<]*</pre>' | sed 's/<[^>]*>//g'
