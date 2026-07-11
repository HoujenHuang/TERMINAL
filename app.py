from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import os
import psutil
from urllib.parse import urlparse
import ipaddress
import socket
from curl_cffi import requests

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": [
	"https://glasspane.pages.dev", 
	"http://localhost:3000",
	"null"
]}})

BLOCKED_NETWORKS = [
	ipaddress.ip_network('169.254.169.254/32'),
	ipaddress.ip_network('127.0.0.0/8'),
	ipaddress.ip_network('10.0.0.0/8'),
	ipaddress.ip_network('172.16.0.0/12'),
	ipaddress.ip_network('192.168.0.0/16'),
]

def is_safe_url(url):
	try:
		parsed = urlparse(url)
		if parsed.scheme not in ('http', 'https'):
			return False
		hostname = parsed.hostname
		if not hostname: return False
		resolved_ip = socket.gethostbyname(hostname)
		ip = ipaddress.ip_address(resolved_ip)
		for network in BLOCKED_NETWORKS:
			if ip in network:
				return False
		return True
	except Exception:
		return False

@app.route("/")
def home():
	cpu = psutil.cpu_percent()
	return jsonify({"status": "Backend active", "cpu_usage": f"{cpu}%"})

@app.route("/proxy")
def proxy():
	target_url = request.args.get('url')
	if not target_url:
		return "ERROR: No URL provided", 400

	if not is_safe_url(target_url):
		return "ERROR: Restricted or invalid URL", 403

	try:
		proxies = {
			"http": "http://username:password@proxy_host:port",
			"https": "http://username:password@proxy_host:port"
		}

		headers = {
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.9",
			"Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
			"Sec-Ch-Ua-Mobile": "?0",
			"Sec-Ch-Ua-Platform": '"Windows"',
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "none",
			"Sec-Fetch-User": "?1",
			"Upgrade-Insecure-Requests": "1"
		}

		resp = requests.get(
			target_url, 
			impersonate="chrome120", 
			headers=headers, 
			timeout=15
		)

		excluded_headers = [
			'content-encoding', 'content-length', 'transfer-encoding', 
			'connection', 'x-frame-options', 'content-security-policy'
		]

		response_headers = [
			(name, value) for (name, value) in resp.headers.items()
			if name.lower() not in excluded_headers
		]

		return Response(resp.content, resp.status_code, response_headers)

	except Exception as e:
		return f"ERROR: Proxy request failed: {str(e)}", 502

if __name__ == "__main__":
	port = int(os.environ.get("PORT", 8080))
	app.run(host="0.0.0.0", port=port)
