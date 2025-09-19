# Multi-stage build for frontend
FROM nginx:1.24-alpine

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Copy application files
COPY index.html /usr/share/nginx/html/

# Create non-root user for better security
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginxuser -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginxuser:nginx /usr/share/nginx/html && \
    chown -R nginxuser:nginx /var/cache/nginx && \
    chown -R nginxuser:nginx /var/log/nginx && \
    chown -R nginxuser:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginxuser:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginxuser

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
