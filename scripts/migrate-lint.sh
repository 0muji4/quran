#!/usr/bin/env bash
# Validate that every file under the migrations directory follows the
# golang-migrate convention `{14-digit-version}_{snake_name}.(up|down).sql`,
# and that every version has both an up and a down counterpart.
#
# Used by `make migrate-lint` and the CI workflow. Does not connect to a
# database; static filename validation only.

set -euo pipefail

MIG_DIR="${1:-db/migrations}"

if [[ ! -d "$MIG_DIR" ]]; then
  echo "ERROR: migrations directory not found: $MIG_DIR" >&2
  exit 1
fi

pattern='^[0-9]{14}_[a-z][a-z0-9_]*\.(up|down)\.sql$'
fail=0
versions_up=""
versions_down=""

shopt -s nullglob
files=("$MIG_DIR"/*)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "ERROR: no migration files found in $MIG_DIR" >&2
  exit 1
fi

for f in "${files[@]}"; do
  name=$(basename "$f")
  if [[ ! "$name" =~ $pattern ]]; then
    echo "FAIL: $name does not match {14-digit-version}_{snake_name}.(up|down).sql" >&2
    fail=1
    continue
  fi
  version="${name%%_*}"
  if [[ "$name" == *.up.sql ]]; then
    versions_up="${versions_up}${version} "
  else
    versions_down="${versions_down}${version} "
  fi
done

# Cross-check: every up must have a down and vice versa.
for v in $versions_up; do
  if [[ " $versions_down " != *" $v "* ]]; then
    echo "FAIL: version $v has only the .up.sql half (missing .down.sql)" >&2
    fail=1
  fi
done
for v in $versions_down; do
  if [[ " $versions_up " != *" $v "* ]]; then
    echo "FAIL: version $v has only the .down.sql half (missing .up.sql)" >&2
    fail=1
  fi
done

if [[ $fail -ne 0 ]]; then
  exit 1
fi

count=$(printf '%s\n' "${files[@]}" | wc -l | tr -d ' ')
echo "OK: $count migration files validated in $MIG_DIR"
