# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS base

FROM base AS build
WORKDIR /app
ENV NX_DAEMON=false FORCE_COLOR=0 NODE_OPTIONS=--max-old-space-size=6144
COPY apps/crm/ui/ ./
COPY infra/hermes-staging/build.mjs /opt/kovaalabcrm/build.mjs
ARG HERMES_SOURCE_SHA
RUN node /opt/kovaalabcrm/build.mjs

FROM base AS runtime
ARG HERMES_SOURCE_SHA
LABEL org.opencontainers.image.title="kovaalabcrm-staging" \
      org.opencontainers.image.source="https://github.com/claude972/test-Crm" \
      org.opencontainers.image.revision="${HERMES_SOURCE_SHA}"
ENV APP_VERSION=2.52.0 NODE_ENV=production NODE_HOST=0.0.0.0 NODE_PORT=3000 \
    DISABLE_DB_MIGRATIONS=true DISABLE_CRON_JOBS_REGISTRATION=true \
    STORAGE_TYPE=local STORAGE_LOCAL_PATH=/app/packages/twenty-server/.local-storage \
    KOVAALABCRM_STAGING_SOURCE_SHA=${HERMES_SOURCE_SHA}
WORKDIR /app/packages/twenty-server
COPY --from=build --chown=1000:1000 /app/package.json /app/yarn.lock /app/.yarnrc.yml /app/
COPY --from=build --chown=1000:1000 /app/.yarn/releases /app/.yarn/releases
COPY --from=build --chown=1000:1000 /app/.yarn/patches /app/.yarn/patches
COPY --from=build --chown=1000:1000 /app/tsconfig.base.json /app/nx.json /app/
COPY --from=build --chown=1000:1000 /app/node_modules /app/node_modules
COPY --from=build --chown=1000:1000 /app/packages/twenty-server/package.json ./
COPY --from=build --chown=1000:1000 /app/packages/twenty-server/dist ./dist
COPY --from=build --chown=1000:1000 /app/packages/twenty-server/scripts ./scripts
COPY --from=build --chown=1000:1000 /app/packages/twenty-server/patches ./patches
COPY --from=build --chown=1000:1000 /app/packages/twenty-shared/package.json /app/packages/twenty-shared/
COPY --from=build --chown=1000:1000 /app/packages/twenty-shared/dist /app/packages/twenty-shared/dist
COPY --from=build --chown=1000:1000 /app/packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY --from=build --chown=1000:1000 /app/packages/twenty-emails/dist /app/packages/twenty-emails/dist
COPY --from=build --chown=1000:1000 /app/packages/twenty-client-sdk/package.json /app/packages/twenty-client-sdk/
COPY --from=build --chown=1000:1000 /app/packages/twenty-client-sdk/dist /app/packages/twenty-client-sdk/dist
COPY --from=build --chown=1000:1000 /app/packages/twenty-oxlint-rules /app/packages/twenty-oxlint-rules
COPY infra/hermes-staging/entrypoint.mjs /opt/kovaalabcrm/entrypoint.mjs
RUN mkdir -p .local-storage && chown 1000:1000 .local-storage
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=6s --start-period=120s --retries=5 CMD ["node", "/opt/kovaalabcrm/entrypoint.mjs", "health"]
ENTRYPOINT ["node", "/opt/kovaalabcrm/entrypoint.mjs"]
CMD ["server"]
