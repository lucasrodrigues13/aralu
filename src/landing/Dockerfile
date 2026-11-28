# Landing estática (SPEC-068). Contexto de build: raiz do repositório.
# node:22-alpine fixado por digest
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /app
COPY src/landing/package.json src/landing/package-lock.json ./
RUN npm ci
COPY src/landing/ ./
# Valores públicos, gravados no HTML no build. Vazios: sem medição e sem seção de depoimentos.
ARG PUBLIC_APP_URL=https://app.aralu.com.br
ARG PUBLIC_UMAMI_SCRIPT=
ARG PUBLIC_UMAMI_SITE=
ARG PUBLIC_DEPOIMENTOS_URL=
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL \
    PUBLIC_UMAMI_SCRIPT=$PUBLIC_UMAMI_SCRIPT \
    PUBLIC_UMAMI_SITE=$PUBLIC_UMAMI_SITE \
    PUBLIC_DEPOIMENTOS_URL=$PUBLIC_DEPOIMENTOS_URL \
    ASTRO_TELEMETRY_DISABLED=1
RUN npm run build

# caddy:2-alpine fixado por digest
FROM caddy:2-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
COPY src/landing/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/landing
EXPOSE 80
