# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-slim AS production

# Install pg_dump for backup functionality
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/false -m appuser

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma files and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy scripts
COPY scripts ./scripts/

# Create backup directory
RUN mkdir -p /app/backups && chown appuser:appgroup /app/backups

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]
