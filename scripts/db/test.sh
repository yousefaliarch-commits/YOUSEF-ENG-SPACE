#!/usr/bin/env bash
# Runs the pgTAP suites in supabase/tests/database against the local Supabase database with plain psql
# (the same files `supabase test db` runs; use this where the pg_prove image is not available).
set -uo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")/../../supabase/tests/database"
fail=0
for f in *.test.sql; do
  out="$(psql "$DB_URL" -X -q -v ON_ERROR_STOP=1 -At -f "$f" 2>&1)"; code=$?
  planned="$(grep -oE '^1\.\.[0-9]+' <<<"$out" | head -1 | cut -d. -f3)"
  ran="$(grep -cE '^(not )?ok [0-9]+' <<<"$out")"
  bad="$(grep -E '^not ok|ERROR|Looks like' <<<"$out")"
  if [ $code -ne 0 ] || [ -n "$bad" ] || [ "$planned" != "$ran" ]; then
    echo "FAIL $f (planned ${planned:-?}, ran $ran)"; grep -E '^not ok|^#|ERROR|psql:' <<<"$out" | head -40; fail=1
  else echo "ok   $f ($ran tests)"; fi
done
exit $fail
