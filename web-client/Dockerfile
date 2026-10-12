# syntax=docker/dockerfile:1
# ---- build: compile the Vite/React app to static assets ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund \
    --fetch-retries=10 --fetch-retry-factor=2 --fetch-retry-mintimeout=10000 \
    --fetch-retry-maxtimeout=600000 --fetch-timeout=600000 --maxsockets=3
COPY . .
RUN npm run build

# ---- runtime: nginx serving the SPA and proxying the API ----
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
