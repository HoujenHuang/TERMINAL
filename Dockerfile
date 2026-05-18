FROM python:3.11-slim

RUN apt-get update && apt-get install -y nginx netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . ./
RUN pip install --no-cache-dir -r requirements.txt

RUN echo 'server { \n\
    listen 8080; \n\
    location /wisp/ { \n\
        proxy_pass http://127.0.0.1:8081; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "Upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_read_timeout 86400; \n\
    } \n\
        location / { \n\
        proxy_pass http://127.0.0.1:5000; \n\
    } \n\
}' > /etc/nginx/sites-available/default

RUN chmod +x start.sh
CMD ["./start.sh"]
