#!/bin/bash

sed -i "s/listen 8080;/listen ${PORT:-8080};/" /etc/nginx/sites-available/default
wisp-server --port 8081 --host 127.0.0.1 &
gunicorn --bind 127.0.0.1:5000 app:app &
echo "Awaiting TERMINAL Backend..."
while ! nc -z 127.0.0.1 5000; do
	sleep 0.1
done
echo "[ OK ] TERMINAL Backend deployed"
nginx -g "daemon off;"
