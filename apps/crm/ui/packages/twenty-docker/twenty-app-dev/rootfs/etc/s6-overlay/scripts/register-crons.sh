#!/bin/sh
set -e

echo "==> START Registering cron jobs"

cd /app/packages/kovaa-lab-server
yarn command:prod cron:register:all

echo "==> DONE"
