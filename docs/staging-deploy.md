# Staging deploy (six1-core-api)

## Branch

- Integration branch: `staging`
- Push or merge to `staging` builds the production Dockerfile, pushes to GHCR, then deploys the VPS via the HTTPS deploy hook.

## Image

- Registry: `ghcr.io/<owner>/six-1-core-api`
- Tags: `sha-<shortsha>` (immutable) and `staging` (moving alias)
- Host compose uses `IMAGE_REF` (written by the deploy hook / `six1-pull-up`)

## Automation flow

1. GitHub Actions builds and pushes the image to GHCR.
2. The deploy job `POST`s to `https://s2api.guoah.com/__six1-deploy` with:
   - `Authorization: Bearer <STAGING_DEPLOY_HOOK_TOKEN>`
   - JSON: `{ stack, image_ref, ghcr_user, ghcr_token }`
3. The VPS deploy-hook service (`six1-deploy-hook`) logs into GHCR with the job token, pulls, and restarts the stack.

SSH from GitHub-hosted runners to the VPS is not used (provider firewall blocks inbound :22 from Actions).

Same pattern is used for **gateway** (`stack: gateway`) and **frontend** (`stack: frontend`).

## GitHub configuration

Repository secret:

| Secret | Purpose |
|--------|---------|
| `STAGING_DEPLOY_HOOK_TOKEN` | Shared bearer token with `/home/six1deploy/six1-deploy-hook/deploy.token` on the VPS |

Package settings: allow Actions to write packages; keep the package **private**.

## Host prerequisites

1. Traefik on `six1-microservices-network` with Docker provider enabled
2. Deploy hook stack: `/home/six1deploy/six1-deploy-hook` (`six1-deploy-hook` container)
3. App compose roots (writable by `six1deploy`):
   - core → `/home/a529345/api.core.six1.guoah.com`
   - gateway → `/home/a529345/s1.api.guoah.com`
   - frontend → `/home/a529345/public_html/dynerto`
4. Helpers still available for break-glass: `six1-compose`, `six1-ghcr-login`, `six1-pull-up`

## Break-glass (host only, not CI)

```bash
six1-ghcr-login
six1-pull-up core ghcr.io/<owner>/six-1-core-api:sha-<shortsha>
```
