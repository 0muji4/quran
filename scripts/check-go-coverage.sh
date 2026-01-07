#!/bin/bash
set -e

COVERAGE_FILE="${1:-coverage.out}"
THRESHOLD="${2:-80.0}"

if [ ! -f "$COVERAGE_FILE" ]; then
  echo "Error: Coverage file $COVERAGE_FILE not found"
  exit 1
fi

# カバレッジ率を計算
COVERAGE=$(go tool cover -func="$COVERAGE_FILE" | grep total | awk '{print $3}' | sed 's/%//')

echo "Total coverage: ${COVERAGE}%"
echo "Threshold: ${THRESHOLD}%"

# 閾値チェック
if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
  echo "❌ Coverage ${COVERAGE}% is below threshold ${THRESHOLD}%"
  exit 1
else
  echo "✅ Coverage ${COVERAGE}% meets threshold ${THRESHOLD}%"
fi
