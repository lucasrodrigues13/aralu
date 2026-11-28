# node:22-alpine fixado por digest
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app
COPY src/frontend/ /app/
RUN if [ -f package.json ]; then \
      corepack enable; \
      if [ -f pnpm-lock.yaml ]; then \
        corepack prepare pnpm@10 --activate && pnpm install --frozen-lockfile && pnpm build; \
      elif [ -f package-lock.json ]; then \
        npm ci && npm run build; \
      else \
        npm install && npm run build; \
      fi; \
    else \
      mkdir -p /app/dist/browser; \
    fi

# caddy:2-alpine fixado por digest
FROM caddy:2-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
COPY src/frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /tmp/dist
RUN set -eu; \
    src="$(find /tmp/dist -type d -name browser | head -n 1)"; \
    if [ -z "$src" ]; then src=/tmp/dist; fi; \
    mkdir -p /srv/frontend; \
    cp -a "$src"/. /srv/frontend/
EXPOSE 80 443
