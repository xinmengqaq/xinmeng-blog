#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${DEPLOY_MODE:-}" == "opensource" ]]; then
  createdb --username "${POSTGRES_USER}" springboot_vue_test
fi
