# Multi-stage Dockerfile for AURELIS Private Wealth Platform

# ==========================================
# Stage 1: Frontend Build Stage (Vite + React)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy project files
COPY . .

# Build Vite frontend production bundle into /app/dist
RUN npm run build

# ==========================================
# Stage 2: Production Runtime Stage
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Install tsx runner for TypeScript backend execution
RUN npm install -g tsx

# Copy compiled frontend from frontend-builder
COPY --from=frontend-builder /app/dist ./dist

# Copy backend server code and TypeScript configs
COPY server ./server
COPY tsconfig*.json ./

# Expose standard application port
EXPOSE 4000

# Container healthcheck against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start server
CMD ["tsx", "server/src/server.ts"]
