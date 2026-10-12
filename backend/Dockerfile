# syntax=docker/dockerfile:1
# ---- deps: install production dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
# bcrypt ships prebuilt N-API binaries for both glibc and musl (see
# bcrypt/prebuilds/*/bcrypt.musl.node), so no compiler toolchain is needed.
COPY package.json package-lock.json ./
# Cache npm downloads across build retries: the registry connection is flaky
# here, so a failed attempt resumes from cached tarballs instead of starting
# over. Retry settings are deliberately generous to survive connection resets.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit --no-fund \
    --fetch-retries=10 --fetch-retry-factor=2 --fetch-retry-mintimeout=10000 \
    --fetch-retry-maxtimeout=600000 --fetch-timeout=600000 --maxsockets=3

# ---- runtime: minimal image with app + production node_modules ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Writable runtime dirs (uploads for product images, data for the GeoIP cache).
# A fresh named volume is initialised from these paths, so the non-root `node`
# user inherits ownership on first start.
RUN mkdir -p uploads data/geoip && chown -R node:node /app
USER node

EXPOSE 8040
CMD ["node", "server.js"]
