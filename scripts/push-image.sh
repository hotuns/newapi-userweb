#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.deploy}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

IMAGE_NAME="${IMAGE_NAME:-moretoken}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_REF="${IMAGE_REF:-${IMAGE_NAME}:${IMAGE_TAG}}"

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-}"
DEPLOY_AFTER_LOAD="${DEPLOY_AFTER_LOAD:-false}"

if [[ -z "${REMOTE_HOST}" ]]; then
  echo "REMOTE_HOST is required" >&2
  exit 1
fi

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
SSH_OPTS=("-p" "${REMOTE_PORT}")

echo "Building image: ${IMAGE_REF}"
docker build -t "${IMAGE_REF}" .

echo "Pushing image to remote Docker daemon over SSH: ${SSH_TARGET}"
echo "If SSH key login is not configured, you will be prompted for the server password."
docker save "${IMAGE_REF}" \
  | gzip \
  | ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" 'gunzip | sudo docker load'

echo "Image loaded on remote host: ${IMAGE_REF}"

if [[ "${DEPLOY_AFTER_LOAD}" == "true" ]]; then
  if [[ -z "${REMOTE_APP_DIR}" ]]; then
    echo "REMOTE_APP_DIR is required when DEPLOY_AFTER_LOAD=true" >&2
    exit 1
  fi

  echo "Restarting remote compose service in ${REMOTE_APP_DIR}"
  ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" \
    "cd '${REMOTE_APP_DIR}' && MORETOKEN_IMAGE='${IMAGE_REF}' sudo docker compose up -d --no-build moretoken"
fi

echo "Done"
