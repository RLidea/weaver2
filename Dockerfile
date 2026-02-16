# ============================================
# Build argument: target application name
# Usage: docker build --build-arg APP_NAME=core .
# ============================================
ARG APP_NAME=core

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build application
# ============================================
FROM node:22-alpine AS build

ARG APP_NAME

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm db:generate

# Build target application
RUN pnpm build:${APP_NAME}

# ============================================
# Stage 3: Production image
# ============================================
FROM node:22-alpine AS production

ARG APP_NAME

RUN corepack enable && corepack prepare pnpm@latest --activate

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Store APP_NAME as environment variable for CMD
ENV APP_NAME=${APP_NAME}

# Copy package files for pnpm
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema and generate client for production
COPY apps/${APP_NAME}/prisma ./apps/${APP_NAME}/prisma
RUN pnpm db:generate

# Copy built application
COPY --from=build /app/dist ./dist

# Copy static assets (if exists)
COPY apps/${APP_NAME}/src/assets ./apps/${APP_NAME}/src/assets

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

EXPOSE 3000

# Health check using the existing health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["sh", "-c", "node dist/apps/${APP_NAME}/main"]
