# Staging deploy (six1-core-api)

## Branch

- Integration branch: `staging`
- Push or merge to `staging` builds the production Dockerfile, pushes to GHCR, and deploys the VPS.

## Image

- Registry: `ghcr.io/<owner>/six-1-core-api`
- Tags: `sha-<shortsha>` (immutable) and `staging` (moving alias)
- Host compose uses `IMAGE_REF` (see `/usr/local/bin/six1-pull-up`)

## GitHub configuration

Repository (or environment `staging`) secrets:

| Secret | Purpose |
|--------|---------|
| `STAGING_HOST` | Staging VPS host/IP |
| `STAGING_USER` | SSH user (`six1deploy`) |
| `STAGING_SSH_KEY` | Private key for that user |

Optional repository variable: `STAGING_DEPLOY_ENABLED=true` enables the deploy job (build/push always runs on staging).

Package settings: allow Actions to write packages; keep the package **private**.

## Host prerequisites

1. `six1-ghcr-login` with a read-only `read:packages` PAT under `/etc/six1/`
2. Env file `/etc/six1/core-api.env`
3. Helpers: `six1-compose`, `six1-pull-up`

## Manual deploy

```bash
six1-ghcr-login
six1-pull-up core ghcr.io/<owner>/six-1-core-api:sha-<shortsha>
```
