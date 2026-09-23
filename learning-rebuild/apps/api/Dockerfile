# syntax=docker/dockerfile:1
# =============================================================================
# Dockerfile API (NestJS) — monorepo pnpm. Build context = ROOT repo.
#   docker build -f apps/api/Dockerfile -t lms-api .
# Multi-stage: deps → build → runtime (image ramping, hanya prod deps).
# =============================================================================

# ---- Base ----
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app

# ---- Dependencies (semua workspace, termasuk dev utk build) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
# Web tidak dibutuhkan untuk image API; salin manifest agar workspace valid.
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ---- Build (@lms/database + @lms/api) ----
FROM deps AS build
COPY packages/database ./packages/database
COPY apps/api ./apps/api
# Prisma client + kompilasi TypeScript ke dist
RUN pnpm --filter @lms/database db:generate \
 && pnpm --filter @lms/database build \
 && pnpm --filter @lms/api build

# ---- Runtime (prod deps saja) ----
FROM base AS runtime
ENV NODE_ENV=production
# Prod deps untuk seluruh workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --prod

# Artefak hasil build
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
# Prisma Client yang ter-generate (di node_modules workspace)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI (untuk `prisma db push` saat start). Ikut disalin dari build stage
# karena runtime memasang --prod (prisma adalah devDependency).
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Entrypoint: sinkron skema DB lalu jalankan API
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
RUN chmod +x ./apps/api/docker-entrypoint.sh

# Jalankan sebagai user non-root (hardening Fase 9). Direktori uploads
# (di-mount sbg volume /data/uploads) dibuat & dimiliki user ini agar API
# dapat menulis berkas unggahan. Ownership /app juga dipindah ke user ini.
RUN addgroup -g 1001 -S nodejs \
 && adduser -u 1001 -S nodeapp -G nodejs \
 && mkdir -p /data/uploads \
 && chown -R nodeapp:nodejs /data/uploads /app

USER nodeapp

WORKDIR /app/apps/api
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
