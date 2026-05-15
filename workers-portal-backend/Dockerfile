# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────────
# Smart Workers main Node.js backend (customer-facing API)
#
# STUB. The source for this service is not yet committed to this repo. Once
# you push the Express/Node sources here, the build below should work
# without further edits. Adjust the start command if your entrypoint isn't
# `node server.js`.
# ──────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi


FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

RUN apk add --no-cache tini curl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
