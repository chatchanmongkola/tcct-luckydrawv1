# ===== Stage 1: Dependencies =====
FROM node:22-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# ===== Stage 2: Builder =====
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and dependencies
COPY package*.json tsconfig.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema and config
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

# Generate Prisma client BEFORE copying source code
RUN npx prisma generate

# Copy remaining source code
COPY . .

# Build Next.js
RUN npm run build

# ===== Stage 3: Runtime =====
FROM node:22-alpine AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy built Next.js from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Set environment
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
