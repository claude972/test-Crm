# ===========================================================================
# Base image
# ===========================================================================

FROM node:24.22.1-alpine3.23@sha256:0468540aa58203ff9e40c2aab3907c52644ab818af6176b1c70a026137dc92a2 AS node-base

# ===========================================================================
# Dependency stages
# ===========================================================================

FROM node-base AS front-deps

WORKDIR /app

COPY ./package.json ./yarn.lock ./.yarnrc.yml ./tsconfig.base.json ./nx.json /app/
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/patches /app/.yarn/patches

COPY ./packages/kovaa-lab-ui/package.json /app/packages/kovaa-lab-ui/
COPY ./packages/kovaa-lab-shared/package.json /app/packages/kovaa-lab-shared/
COPY ./packages/kovaa-lab-front/package.json /app/packages/kovaa-lab-front/
COPY ./packages/kovaa-lab-front-component-renderer/package.json /app/packages/kovaa-lab-front-component-renderer/
COPY ./packages/kovaa-lab-sdk/package.json /app/packages/kovaa-lab-sdk/
COPY ./packages/kovaa-lab-client-sdk/package.json /app/packages/kovaa-lab-client-sdk/

RUN yarn workspaces focus kovaa-lab-monorepo kovaa-lab-front kovaa-lab-front-component-renderer kovaa-lab-ui kovaa-lab-shared kovaa-lab-sdk kovaa-lab-client-sdk && yarn cache clean && npx nx reset


FROM node-base AS server-deps

WORKDIR /app

COPY ./package.json ./yarn.lock ./.yarnrc.yml ./tsconfig.base.json ./nx.json /app/
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/patches /app/.yarn/patches

COPY ./packages/kovaa-lab-emails/package.json /app/packages/kovaa-lab-emails/
COPY ./packages/kovaa-lab-server/package.json /app/packages/kovaa-lab-server/
COPY ./packages/kovaa-lab-server/patches /app/packages/kovaa-lab-server/patches
COPY ./packages/kovaa-lab-shared/package.json /app/packages/kovaa-lab-shared/
COPY ./packages/kovaa-lab-client-sdk/package.json /app/packages/kovaa-lab-client-sdk/
COPY ./packages/kovaa-lab-oxlint-rules/package.json /app/packages/kovaa-lab-oxlint-rules/

RUN yarn workspaces focus kovaa-lab-monorepo kovaa-lab-server kovaa-lab-emails kovaa-lab-shared kovaa-lab-client-sdk && yarn cache clean && npx nx reset


FROM server-deps AS kovaa-lab-server-build

COPY ./packages/kovaa-lab-emails /app/packages/kovaa-lab-emails
COPY ./packages/kovaa-lab-shared /app/packages/kovaa-lab-shared
COPY ./packages/kovaa-lab-client-sdk /app/packages/kovaa-lab-client-sdk
COPY ./packages/kovaa-lab-server /app/packages/kovaa-lab-server

RUN npx nx run kovaa-lab-server:lingui:extract && \
    npx nx run kovaa-lab-server:lingui:compile && \
    npx nx run kovaa-lab-emails:lingui:extract && \
    npx nx run kovaa-lab-emails:lingui:compile

RUN npx nx run kovaa-lab-server:build

# Clean server build output (type declarations and compiled tests are not needed at runtime;
# source maps are kept because kovaa-lab-infra extracts them from the image for Sentry uploads)
RUN find /app/packages/kovaa-lab-server/dist -name '*.d.ts' -delete \
 && rm -rf /app/packages/kovaa-lab-server/dist/packages/kovaa-lab-server/test

RUN yarn workspaces focus --production kovaa-lab-emails kovaa-lab-shared kovaa-lab-client-sdk kovaa-lab-server


FROM front-deps AS kovaa-lab-front-build

COPY ./packages/kovaa-lab-front /app/packages/kovaa-lab-front
COPY ./packages/kovaa-lab-front-component-renderer /app/packages/kovaa-lab-front-component-renderer
COPY ./packages/kovaa-lab-ui /app/packages/kovaa-lab-ui
COPY ./packages/kovaa-lab-shared /app/packages/kovaa-lab-shared
COPY ./packages/kovaa-lab-sdk /app/packages/kovaa-lab-sdk
COPY ./packages/kovaa-lab-client-sdk /app/packages/kovaa-lab-client-sdk
RUN npx nx run kovaa-lab-front:lingui:extract && \
    npx nx run kovaa-lab-front:lingui:compile
# To skip the memory-intensive frontend build, pre-build on the host:
#   npx nx build kovaa-lab-front
# The check below will use packages/kovaa-lab-front/build/ if it already exists.
RUN if [ -d /app/packages/kovaa-lab-front/build ]; then \
      echo "Using pre-built frontend from host"; \
    else \
      NODE_OPTIONS="--max-old-space-size=8192" npx nx build kovaa-lab-front; \
    fi


# ===========================================================================
# Target: kovaa-lab-server (server only, no frontend)
#   docker build --target kovaa-lab-server -f packages/kovaa-lab-docker/kovaa-lab/Dockerfile .
# ===========================================================================

FROM node-base AS kovaa-lab-server

# Force the patched Alpine OpenSSL libs to the fixed release (3.5.8-r0 clears
# CVE-2026-14456/14457/18798/54874/63072/63075/63076). Node bundles its own
# OpenSSL, but psql/curl link these system libs, so the upgrade hardens
# runtime TLS and clears the scanner. libexpat 2.8.5-r0 clears CVE-2026-93990.
RUN apk add --no-cache \
    'curl>=8.22.0-r0' \
    'libexpat>=2.8.5-r0' \
    'nghttp2-libs>=1.69.0-r0' \
    'libcrypto3>=3.5.8-r0' \
    'libssl3>=3.5.8-r0' \
    'postgresql18-client>=18.5-r0' \
    'jq>=1.8.2-r0'

COPY ./packages/kovaa-lab-docker/kovaa-lab/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
WORKDIR /app/packages/kovaa-lab-server

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production

# Workspace root config
COPY --chown=1000 --from=kovaa-lab-server-build /app/package.json /app/yarn.lock /app/.yarnrc.yml /app/
COPY --chown=1000 --from=kovaa-lab-server-build /app/tsconfig.base.json /app/nx.json /app/
COPY --chown=1000 --from=kovaa-lab-server-build /app/.yarn /app/.yarn
COPY --chown=1000 --from=kovaa-lab-server-build /app/node_modules /app/node_modules

# Server package (compiled dist + package.json only, no src/)
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/package.json /app/packages/kovaa-lab-server/
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/dist /app/packages/kovaa-lab-server/dist
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/patches /app/packages/kovaa-lab-server/patches
# Shell entrypoints referenced by package.json scripts (command:prod:background*)
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/scripts /app/packages/kovaa-lab-server/scripts
# COPY preserves the committed mode, but the scripts are also invoked directly
# and not only through yarn, so do not let a dropped exec bit reach the pod
RUN chmod +x /app/packages/kovaa-lab-server/scripts/command-background.sh

# Workspace packages (dist + package.json; node_modules symlinks resolve to these)
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-shared/package.json /app/packages/kovaa-lab-shared/
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-shared/dist /app/packages/kovaa-lab-shared/dist
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-emails/package.json /app/packages/kovaa-lab-emails/
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-emails/dist /app/packages/kovaa-lab-emails/dist
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-client-sdk/package.json /app/packages/kovaa-lab-client-sdk/
COPY --chown=1000 --from=kovaa-lab-server-build /app/packages/kovaa-lab-client-sdk/dist /app/packages/kovaa-lab-client-sdk/dist

LABEL org.opencontainers.image.source=https://github.com/kovaa-lab/kovaa-lab
LABEL org.opencontainers.image.description="KovaaLab CRM server image (no frontend)."

# Remove unused, unpatchable components the scanner flags (none are executed at
# runtime, and none can be fixed by upgrading our deps or Node):
#  - the bundled npm CLI: the app uses yarn via corepack and never invokes npm,
#    and npm's bundled ip-address has no patched release;
#  - example/ apps vendored inside dependencies, e.g. passport-microsoft's
#    example/login ships a package-lock.json for an old Express demo
#    (body-parser, ejs, express, ...) that is never installed or run.
#  - the Node dev headers: only node-gyp needs them and native addons are
#    compiled in the build stages; their vendored openssl/opensslv.h is what
#    scanners fingerprint whenever OpenSSL patches ahead of Node releases.
# The pinned node:24.22.1-alpine base carries the October 2026 security fixes.
# Do not pin below 24.18.0: 24.17.0's http.Agent keep-alive regression
# (nodejs/node#64004) flooded prod with false "Premature close" fetch failures.
# Keep the base current when Node ships 24.x security releases; the scanner
# flags the statically-linked node binary itself.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/include/node && \
    find /app/node_modules -type d -name example -prune -exec rm -rf {} +

RUN mkdir -p /app/.local-storage /app/packages/kovaa-lab-server/.local-storage && \
    chown 1000:1000 /app/.local-storage /app/packages/kovaa-lab-server/.local-storage

USER 1000

CMD ["node", "dist/main"]
ENTRYPOINT ["/app/entrypoint.sh"]


# ===========================================================================
# Target: kovaa-lab-server-aws (server only + aws-cli, no frontend)
#   docker build --target kovaa-lab-server-aws -f packages/kovaa-lab-docker/kovaa-lab/Dockerfile .
# ===========================================================================

FROM kovaa-lab-server AS kovaa-lab-server-aws

USER root
RUN apk add --no-cache aws-cli
USER 1000


# ===========================================================================
# Target: kovaa-lab (server + frontend)
#   docker build --target kovaa-lab -f packages/kovaa-lab-docker/kovaa-lab/Dockerfile .
# ===========================================================================

FROM kovaa-lab-server AS kovaa-lab

COPY --chown=1000 --from=kovaa-lab-front-build /app/packages/kovaa-lab-front/build /app/packages/kovaa-lab-server/dist/front

LABEL org.opencontainers.image.description="KovaaLab CRM image with backend and frontend."


# ===========================================================================
# Target: kovaa-lab-aws (server + frontend + aws-cli)
#   docker build --target kovaa-lab-aws -f packages/kovaa-lab-docker/kovaa-lab/Dockerfile .
# ===========================================================================

FROM kovaa-lab AS kovaa-lab-aws

USER root
RUN apk add --no-cache aws-cli
USER 1000


# ===========================================================================
# Target: kovaa-lab-app-dev (all-in-one with Postgres + Redis + ClickHouse)
#   docker build --target kovaa-lab-app-dev -f packages/kovaa-lab-docker/kovaa-lab/Dockerfile .
# ===========================================================================

FROM alpine:3.20 AS s6-fetch
ARG S6_OVERLAY_VERSION=3.2.0.2
ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ]; then echo "aarch64" > /tmp/s6arch; \
    else echo "x86_64" > /tmp/s6arch; fi
RUN S6_ARCH=$(cat /tmp/s6arch) && \
    wget -O /tmp/s6-overlay-noarch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" && \
    wget -O /tmp/s6-overlay-noarch.tar.xz.sha256 \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz.sha256" && \
    wget -O /tmp/s6-overlay-arch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz" && \
    wget -O /tmp/s6-overlay-arch.tar.xz.sha256 \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz.sha256" && \
    cd /tmp && \
    NOARCH_SUM=$(awk '{print $1}' s6-overlay-noarch.tar.xz.sha256) && \
    ARCH_SUM=$(awk '{print $1}' s6-overlay-arch.tar.xz.sha256) && \
    echo "$NOARCH_SUM  s6-overlay-noarch.tar.xz" | sha256sum -c - && \
    echo "$ARCH_SUM  s6-overlay-arch.tar.xz" | sha256sum -c -

FROM clickhouse/clickhouse-server:25.8.8-alpine@sha256:68b9d9eb4cb949a03d1f90b76fd8d396a5999dd57ba1ee914ea36c77716ce937 AS clickhouse

FROM node-base AS kovaa-lab-app-dev

# s6-overlay
COPY --from=s6-fetch /tmp/s6-overlay-noarch.tar.xz /tmp/
COPY --from=s6-fetch /tmp/s6-overlay-arch.tar.xz /tmp/
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz \
 && tar -C / -Jxpf /tmp/s6-overlay-arch.tar.xz \
 && rm /tmp/s6-overlay-*.tar.xz

# See kovaa-lab-server above: patched Alpine OpenSSL libs (psql/curl/redis link
# these system libs; Node bundles its own).
RUN apk add --no-cache \
    postgresql18 postgresql18-contrib \
    redis \
    'libcrypto3>=3.5.8-r0' \
    'libssl3>=3.5.8-r0' \
    'libexpat>=2.8.5-r0' \
    'curl>=8.22.0-r0' 'jq>=1.8.2-r0' su-exec

# ClickHouse binaries are linked against glibc: reuse the glibc runtime its
# official alpine image ships alongside musl, and expose the loader at the path
# glibc binaries expect.
ARG TARGETARCH
COPY --from=clickhouse --chown=root:root /usr/bin/clickhouse /usr/bin/clickhouse
COPY --from=clickhouse \
     /lib/ld-2.35.so /lib/libc.so.6 /lib/libdl.so.2 /lib/libm.so.6 \
     /lib/libpthread.so.0 /lib/librt.so.1 /lib/libresolv.so.2 \
     /lib/libnss_dns.so.2 /lib/libnss_files.so.2 \
     /lib/
RUN if [ "$TARGETARCH" = "arm64" ]; then ln -s /lib/ld-2.35.so /lib/ld-linux-aarch64.so.1; \
    else mkdir -p /lib64 && ln -s /lib/ld-2.35.so /lib64/ld-linux-x86-64.so.2; fi \
 && addgroup -S clickhouse \
 && adduser -S -D -H -h /data/clickhouse -G clickhouse clickhouse

# Workspace root config
COPY --from=kovaa-lab-server-build /app/package.json /app/yarn.lock /app/.yarnrc.yml /app/
COPY --from=kovaa-lab-server-build /app/tsconfig.base.json /app/nx.json /app/
COPY --from=kovaa-lab-server-build /app/.yarn /app/.yarn
COPY --from=kovaa-lab-server-build /app/node_modules /app/node_modules

# Server package (compiled dist + package.json only, no src/)
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/package.json /app/packages/kovaa-lab-server/
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/dist /app/packages/kovaa-lab-server/dist
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-server/patches /app/packages/kovaa-lab-server/patches

# Workspace packages (dist + package.json; node_modules symlinks resolve to these)
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-shared/package.json /app/packages/kovaa-lab-shared/
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-shared/dist /app/packages/kovaa-lab-shared/dist
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-emails/package.json /app/packages/kovaa-lab-emails/
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-emails/dist /app/packages/kovaa-lab-emails/dist
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-client-sdk/package.json /app/packages/kovaa-lab-client-sdk/
COPY --from=kovaa-lab-server-build /app/packages/kovaa-lab-client-sdk/dist /app/packages/kovaa-lab-client-sdk/dist

# Frontend static build
COPY --from=kovaa-lab-front-build /app/packages/kovaa-lab-front/build /app/packages/kovaa-lab-server/dist/front

# Source maps are not needed in the dev image (no Sentry). Node dev headers are
# dropped for the same scanner-hygiene reasons as in kovaa-lab-server above.
RUN find /app/packages/kovaa-lab-server/dist -name '*.js.map' -delete \
 && rm -rf /usr/local/include/node

# s6 service definitions
COPY packages/kovaa-lab-docker/kovaa-lab-app-dev/rootfs/ /

RUN mkdir -p /data/postgres /data/redis /data/clickhouse /app/packages/kovaa-lab-server/.local-storage \
 && chown -R postgres:postgres /data/postgres \
 && chown clickhouse:clickhouse /data/clickhouse \
 && chown 1000:1000 /data/redis /app/packages/kovaa-lab-server/.local-storage

ARG APP_VERSION=0.0.0

ENV S6_KEEP_ENV=1
ENV PG_DATABASE_URL=postgres://kovaa-lab:kovaa-lab@localhost:5432/default \
    SERVER_URL=http://localhost:2020 \
    REDIS_URL=redis://localhost:6379 \
    CLICKHOUSE_URL=http://localhost:8123/kovaa-lab \
    STORAGE_TYPE=local \
    APP_SECRET=kovaa-lab-app-dev-secret-not-for-production \
    APP_VERSION=$APP_VERSION \
    NODE_ENV=development \
    NODE_PORT=2020 \
    DISABLE_DB_MIGRATIONS=true \
    DISABLE_CRON_JOBS_REGISTRATION=true \
    IS_BILLING_ENABLED=false \
    SIGN_IN_PREFILLED=true \
    APPLICATION_LOG_DRIVER=CONSOLE

EXPOSE 2020
VOLUME ["/data/postgres", "/data/clickhouse", "/app/packages/kovaa-lab-server/.local-storage"]

LABEL org.opencontainers.image.source=https://github.com/kovaa-lab/kovaa-lab
LABEL org.opencontainers.image.description="All-in-one KovaaLab CRM image for local development and SDK usage. Includes PostgreSQL, Redis, ClickHouse, server, and worker."

ENTRYPOINT ["/init"]
