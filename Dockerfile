FROM python:3.11-slim

RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . ./
RUN pip install --no-cache-dir -r requirements.txt

RUN echo 'server { \
    listen 8080; \
    location /wisp/ { \
        proxy_pass http://127.0.0.1:8081; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "Upgrade"; \
        proxy_set_header Host $host; \
    } \
    location / { \
        proxy_pass http://127.0.0.1:5000; \
    } \
}' > /etc/nginx/sites-available/default

RUN echo '#!/bin/bash \n \
# Replace 8080 in Nginx config with the actual Cloud Run PORT \n \
sed -i "s/listen 8080;/listen ${PORT:-8080};/" /etc/nginx/sites-available/default \n \
python3 -m wisp.server --port 8081 & \n \
gunicorn --bind 127.0.0.1:5000 app:app & \n \
nginx -g "daemon off;"' > start.sh

RUN chmod +x start.sh
CMD ["./start.sh"]
