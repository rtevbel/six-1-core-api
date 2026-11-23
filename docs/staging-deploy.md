# Staging deploy (six1-core-api)

## Branch

- Integration branch: `staging`
- Push or merge to `staging` builds the production Dockerfile, pushes to GHCR, then deploys the VPS over **SSH**.

## Image

- Registry: `ghcr.io/<owner>/six-1-core-api`
- Tags: `sha-<shortsha>` (immutable) and `staging` (moving alias)
- Host compose uses `IMAGE_REF` (written by CI / `six1-pull-up`)

## Automation flow

1. GitHub Actions builds and pushes the image to GHCR.
2. The deploy job SSHs to the VPS (`appleboy/ssh-action`) with:
   - `STAGING_HOST` / `STAGING_USER` / `STAGING_SSH_KEY`
   - env: `IMAGE_REF`, `GHCR_USER`, `GHCR_TOKEN` (job `GITHUB_TOKEN`)
3. On the host: `docker login ghcr.io`, then `six1-pull-up core <image_ref>` (pull + recreate).

Same pattern is used for **gateway** and **frontend** (different `six1-pull-up` stack name).

The old HTTPS deploy hook (`https://s2api.guoah.com/__six1-deploy`) is no longer used by CI.

## GitHub configuration

Repository secrets:

| Secret | Purpose |
|--------|---------|
| `STAGING_HOST` | VPS hostname/IP |
| `STAGING_USER` | SSH user (e.g. deploy account that can run Docker / `six1-pull-up`) |
| `STAGING_SSH_KEY` | Private key for that user |

Package settings: allow Actions to write packages; keep the package **private**. Deploy job needs `packages: read` so the job token can pull on the VPS.

## Host prerequisites

1. Traefik on `six1-microservices-network` with Docker provider enabled
2. App compose roots (writable by the SSH user):
   - core → `/home/a529345/api.core.six1.guoah.com`
   - gateway → `/home/a529345/s1.api.guoah.com`
   - frontend → `/home/a529345/public_html/dynerto`
3. Helpers: `six1-compose`, `six1-ghcr-login`, `six1-pull-up`
4. Firewall must allow inbound SSH from GitHub Actions runners (or use a self-hosted runner / jump host)

## Break-glass (host)

```bash
six1-ghcr-login
six1-pull-up core ghcr.io/<owner>/six-1-core-api:sha-<shortsha>
```
