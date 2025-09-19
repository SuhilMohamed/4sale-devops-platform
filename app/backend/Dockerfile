# Multi-stage build for Node.js application
# Build stage
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodeuser:nodejs package*.json ./
COPY --chown=nodeuser:nodejs *.js ./

# Set proper permissions
RUN chmod -R 755 /app && \
    chown -R nodeuser:nodejs /app

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app/logs

# Switch to non-root user
USER nodeuser

# Expose port (non-privileged)
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]
