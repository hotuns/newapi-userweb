#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.local}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

IMAGE_NAME="${IMAGE_NAME:-moretoken}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_REF="${IMAGE_REF:-${IMAGE_NAME}:${IMAGE_TAG}}"
IMAGE_PLATFORM="${IMAGE_PLATFORM:-linux/amd64}"
BUILD_TIME="${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
BUILD_REVISION="${BUILD_REVISION:-$(git -C "${PROJECT_DIR}" rev-parse --short HEAD 2>/dev/null || echo unknown)}"

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_PASSWORD="${REMOTE_PASSWORD:-}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-}"
DEPLOY_AFTER_LOAD="${DEPLOY_AFTER_LOAD:-false}"

if [[ -z "${REMOTE_HOST}" ]]; then
  echo "REMOTE_HOST is required" >&2
  exit 1
fi

SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
SSH_OPTS=("-p" "${REMOTE_PORT}" "-o" "StrictHostKeyChecking=accept-new")

run_ssh_with_password() {
  local remote_command="$1"

  REMOTE_PASSWORD="${REMOTE_PASSWORD}" \
    SSH_TARGET="${SSH_TARGET}" \
    REMOTE_PORT="${REMOTE_PORT}" \
    REMOTE_COMMAND="${remote_command}" \
    expect <<'EXPECT'
set timeout -1
set password $env(REMOTE_PASSWORD)
set target $env(SSH_TARGET)
set port $env(REMOTE_PORT)
set command $env(REMOTE_COMMAND)

spawn ssh -p $port -o StrictHostKeyChecking=accept-new $target $command
expect {
  -re "(?i)password:" {
    send -- "$password\r"
    exp_continue
  }
  eof
}
catch wait result
exit [lindex $result 3]
EXPECT
}

run_scp_with_password() {
  local local_path="$1"
  local remote_path="$2"

  REMOTE_PASSWORD="${REMOTE_PASSWORD}" \
    REMOTE_PORT="${REMOTE_PORT}" \
    LOCAL_PATH="${local_path}" \
    REMOTE_PATH="${remote_path}" \
    expect <<'EXPECT'
set timeout -1
set password $env(REMOTE_PASSWORD)
set port $env(REMOTE_PORT)
set local_path $env(LOCAL_PATH)
set remote_path $env(REMOTE_PATH)

spawn scp -P $port -o StrictHostKeyChecking=accept-new $local_path $remote_path
expect {
  -re "(?i)password:" {
    send -- "$password\r"
    exp_continue
  }
  eof
}
catch wait result
exit [lindex $result 3]
EXPECT
}

echo "Building image: ${IMAGE_REF}"
docker buildx build \
  --platform "${IMAGE_PLATFORM}" \
  --load \
  --label "org.opencontainers.image.created=${BUILD_TIME}" \
  --label "org.opencontainers.image.revision=${BUILD_REVISION}" \
  --label "moretoken.build_time=${BUILD_TIME}" \
  -t "${IMAGE_REF}" .

echo "Pushing image to remote Docker daemon over SSH: ${SSH_TARGET}"
if [[ -n "${REMOTE_PASSWORD}" ]]; then
  if ! command -v expect >/dev/null 2>&1; then
    echo "expect is required when REMOTE_PASSWORD is set" >&2
    exit 1
  fi

  IMAGE_ARCHIVE="$(mktemp -t moretoken-image.XXXXXX.tar.gz)"
  trap 'rm -f "${IMAGE_ARCHIVE}"' EXIT
  REMOTE_IMAGE_ARCHIVE="/tmp/moretoken-image-${IMAGE_TAG}-$(date +%s).tar.gz"

  echo "Saving image archive locally"
  docker save "${IMAGE_REF}" | gzip > "${IMAGE_ARCHIVE}"

  echo "Uploading image archive to remote host"
  run_scp_with_password "${IMAGE_ARCHIVE}" "${SSH_TARGET}:${REMOTE_IMAGE_ARCHIVE}"

  echo "Loading image on remote host"
  run_ssh_with_password "sudo -S -p '[sudo] password: ' docker load -i '${REMOTE_IMAGE_ARCHIVE}' && rm -f '${REMOTE_IMAGE_ARCHIVE}'"
else
  echo "If SSH key login is not configured, you will be prompted for the server password."
  docker save "${IMAGE_REF}" \
    | gzip \
    | ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" 'gunzip | sudo docker load'
fi

echo "Image loaded on remote host: ${IMAGE_REF}"

if [[ "${DEPLOY_AFTER_LOAD}" == "true" ]]; then
  if [[ -z "${REMOTE_APP_DIR}" ]]; then
    echo "REMOTE_APP_DIR is required when DEPLOY_AFTER_LOAD=true" >&2
    exit 1
  fi

  echo "Restarting remote compose service in ${REMOTE_APP_DIR}"
  if [[ -n "${REMOTE_PASSWORD}" ]]; then
    run_ssh_with_password "cd ${REMOTE_APP_DIR} && MORETOKEN_IMAGE='${IMAGE_REF}' sudo -S -p '[sudo] password: ' docker compose up -d --no-build moretoken"
  else
    ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" \
      "cd '${REMOTE_APP_DIR}' && MORETOKEN_IMAGE='${IMAGE_REF}' sudo docker compose up -d --no-build moretoken"
  fi
fi

echo "Done"
