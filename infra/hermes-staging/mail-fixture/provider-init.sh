#!/bin/sh
# Keep Java outside namespace PID1 so the isolated expiry guard can enforce SIGKILL.
set -eu
[ "$$" -eq 1 ] || exit 1
[ -n "${KOVAALABCRM_FIXTURE_NAMESPACE:-}" ] || exit 1
/home/greenmail/run_greenmail.sh &
child=$!
trap 'kill -TERM "$child" 2>/dev/null || true' TERM INT
set +e
wait "$child"
status=$?
exit "$status"
