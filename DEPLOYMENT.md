# MoreToken Deployment

This document describes the production deployment model for `MoreToken` without modifying the official `new-api/docker-compose.yml`.

## Topology

- `app.example.com` -> `MoreToken`
- `api.example.com` -> `new-api`

`MoreToken` runs in its own container stack and joins the Docker network that the official `new-api` compose file already creates.
The app uses Next.js `standalone` output, so the runtime image only contains the compiled server bundle, static assets, and public files.
The primary deployment flow is: build locally, stream the image to the server over SSH, then run that preloaded image on the server.

## 1. Start `new-api` with the official compose

Do not edit the upstream compose file. Start it from the `new-api` directory:

```bash
cd /path/to/new-api
docker compose up -d
```

Before exposing it publicly, make sure you have configured:

- `SESSION_SECRET`
- non-default database and Redis passwords
- `ServerAddress=https://api.example.com` in the `new-api` admin settings

`ServerAddress` must point to the public `api` domain. `MoreToken` uses it for user-facing API addresses such as chat templates and integration examples.

## 2. Confirm the Docker network name

The official compose usually creates a network like:

```bash
docker network ls | grep new-api-network
```

Typical result:

```text
new-api_new-api-network
```

If your environment uses a different project name, copy the actual network name and pass it to `NEWAPI_DOCKER_NETWORK`.

## 3. Deploy `MoreToken`

Copy the deployment files to your server, for example:

```bash
mkdir -p /opt/moretoken-web
rsync -av \
  --exclude node_modules \
  --exclude .next \
  /path/to/repo/user-web/ /opt/moretoken-web/
cd /opt/moretoken-web
```

Create a runtime env file if you need to override defaults:

```bash
cat > .env <<'EOF'
NEWAPI_BASE_URL=http://new-api:3000
NEWAPI_DOCKER_NETWORK=new-api_new-api-network
EOF
```

Then start the service with the image that has already been pushed to the server:

```bash
docker compose up -d --no-build
```

The Docker image runs the standalone Next.js server directly via `node server.js`. The server does not rebuild from source in this flow.

### Push the image over SSH
Use the included script:

```bash
cp .env.deploy.example .env.deploy
bash ./scripts/push-image.sh
```

The script will:

1. build the local Docker image
2. stream `docker save | gzip` to the remote host over SSH
3. run `sudo docker load` on the remote host
4. optionally restart the remote `moretoken` service with `--no-build`

The script loads `.env.deploy` automatically from the project root. You do not need to `source` it manually unless you want to override values in the current shell.
If SSH key login is not configured, the script will prompt for the remote server password during the SSH step.

If you also set `DEPLOY_AFTER_LOAD=true`, the script will run:

```bash
MORETOKEN_IMAGE=<your-image> sudo docker compose up -d --no-build moretoken
```

inside `REMOTE_APP_DIR` on the server.

## 4. Runtime variables

`docker-compose.yml` already sets the required app runtime values:

- `NEWAPI_BASE_URL=http://new-api:3000`
- `NODE_ENV=production`
- `PORT=3001`
- `MORETOKEN_IMAGE=moretoken:latest`

You normally only need to override:

- `NEWAPI_BASE_URL`
  Use a Docker-internal address. Default is `http://new-api:3000`.
- `NEWAPI_DOCKER_NETWORK`
  Use the actual external network name created by the official `new-api` compose.
- `MORETOKEN_IMAGE`
  Use this to point the server to the preloaded image tag that was pushed from your local machine.

Do not set `NEWAPI_BASE_URL` to the public `https://api.example.com` unless you intentionally want container traffic to go back through the public reverse proxy.

## 5. Reverse proxy

Point your reverse proxy to the two services separately:

- `app.example.com` -> `moretoken:3001`
- `api.example.com` -> `localhost:3000` or the mapped `new-api` container port

You do not need path-based routing between the two systems.

## 6. Validation checklist

After deployment, verify:

1. `http://SERVER_IP:3000/api/status` works for `new-api`
2. `docker network ls` shows the expected official network
3. `docker exec moretoken wget -q -O - http://new-api:3000/api/status` succeeds
4. `https://app.example.com` loads the marketing homepage
5. register, login, dashboard, keys, logs, billing, and logout work on `app.example.com`
6. chat templates replace `{address}` with `https://api.example.com`, not `http://new-api:3000`
7. `https://api.example.com` still opens the original `new-api` admin and API frontend

## 7. Updating later

Update `new-api` independently:

```bash
cd /path/to/new-api
git pull
docker compose up -d
```

Update `MoreToken` independently by pushing a prebuilt image from your local machine:

```bash
cd /path/to/user-web
DEPLOY_AFTER_LOAD=true bash ./scripts/push-image.sh
```

The two stacks stay decoupled, so you do not need to maintain a fork of the official `new-api` compose file.
