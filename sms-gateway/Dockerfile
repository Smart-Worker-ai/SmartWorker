FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
RUN addgroup -g 1001 -S gateway && \
    adduser -S gateway -u 1001 -G gateway

COPY --from=builder --chown=gateway:gateway /app/dist ./dist
COPY --from=builder --chown=gateway:gateway /app/node_modules ./node_modules
COPY --chown=gateway:gateway package.json ./

USER gateway

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "dist/index.js"]
