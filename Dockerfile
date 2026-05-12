FROM python:3.11-slim
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . ./
RUN pip install -r requirements.txt

RUN echo 'server { \
    listen 8080; \
    location /wisp/ { \
        proxy_pass http://127.0.0.1:8081; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "Upgrade"; \
    } \
    location / { \
        proxy_pass http://127.0.0.1:5000; \
    } \
}' > /etc/nginx/sites-available/default

RUN echo '#!/bin/bash \n \
python3 -m wisp.server --port 8081 & \n \
gunicorn --bind 127.0.0.1:5000 app:app & \n \
nginx -g "daemon off;"' > start.sh
RUN chmod +x start.sh

CMD ["./start.sh"]
