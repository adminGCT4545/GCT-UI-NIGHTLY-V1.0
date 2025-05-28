FROM nginx:alpine

# Copy application files
COPY index.html /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY notes.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY config.js /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY assets/ /usr/share/nginx/html/assets/

# Configure Nginx to serve on our chosen port
RUN sed -i.bak 's/listen\s*80;/listen 9091;/g' /etc/nginx/conf.d/default.conf

# Expose the port
EXPOSE 9091

# Create a script to inject environment variables
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'echo "// Configuration injected by Docker" > /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
    echo 'echo "window.ENV_API_URL = \"${API_URL:-http://192.168.1.7:4545}\";" >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
    echo 'echo "window.ENV_API_TIMEOUT = \"${API_TIMEOUT:-30000}\";" >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
    echo 'echo "window.ENV_MAX_RETRIES = \"${MAX_RETRIES:-3}\";" >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
    echo 'cat /usr/share/nginx/html/config.template.js >> /usr/share/nginx/html/config.js' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Start Nginx with our custom entrypoint
CMD ["/docker-entrypoint.sh"]
