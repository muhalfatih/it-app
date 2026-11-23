# Image aplikasi admin. Build dari root repo (konteks monorepo): lihat docker-compose.yml.
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

# Target `deps` juga dipakai layanan `migrate` (butuh drizzle-kit dari devDependencies).
FROM deps AS build
# NEXT_PUBLIC_* ditanam saat build, bukan dibaca saat runtime.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder khusus build: modul memeriksa env saat diimpor, koneksi baru dibuka saat query (runtime).
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-placeholder-not-used-at-runtime-0123456789 \
    pnpm --filter admin build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
