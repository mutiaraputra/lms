# syntax=docker/dockerfile:1
# =============================================================================
# Dockerfile Web (Next.js 15, output standalone) — monorepo pnpm.
# Build context = ROOT repo:
#   docker build -f apps/web/Dockerfile -t lms-web .
# API diakses via path relatif '/api' di belakang Nginx, jadi tidak perlu
# NEXT_PUBLIC_API_URL. Bila ingin override, set build-arg NEXT_PUBLIC_API_URL.
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
# Manifest workspace lain agar pnpm-lock konsisten (tidak di-build).
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web ./apps/web
RUN pnpm --filter @lms/web build

# ---- Runtime (standalone, image ramping) ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Jalankan sebagai user non-root.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Output standalone mempertahankan struktur monorepo:
#   .next/standalone/apps/web/server.js  + .next/standalone/node_modules
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Aset statis harus disalin terpisah (tidak termasuk di standalone).
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
# Entry point standalone berada di apps/web/server.js
CMD ["node", "apps/web/server.js"]
