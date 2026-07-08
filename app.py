from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import os
import psutil
from urllib.parse import urlparse
import ipaddress
import socket
from curl_cffi import requests

app = Flask(__name__)

CORS(app, resources={r"/proxy": {"origins": "*"}}) 

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
	return jsonify({"status": "Proxy Active"})

@app.route("/proxy")
def proxy():
	target_url = request.args.get('url')
	if not target_url:
		return "ERROR: No URL provided", 400

	if not is_safe_url(target_url):
		return "ERROR: Restricted or invalid URL", 403

	try:
		resp = requests.get(
			target_url, 
			impersonate="chrome110",
			timeout=10
		)

		excluded_headers = [
			'content-encoding', 
			'content-length', 
			'transfer-encoding', 
			'connection',
			'x-frame-options',
			'content-security-policy'
		]

		response_headers = [
			(name, value) for (name, value) in resp.headers.items()
			if name.lower() not in excluded_headers
		]

		return Response(resp.content, resp.status_code, response_headers)

	except Exception as e:
		return f"Proxy Error: {str(e)}", 502

if __name__ == "__main__":
	app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
