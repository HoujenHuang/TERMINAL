from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import requests
import os
import psutil
from urllib.parse import urlparse
import ipaddress

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

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
		if not hostname:
			return False

		try:
			ip = ipaddress.ip_address(hostname)
			for network in BLOCKED_NETWORKS:
				if ip in network:
					return False
		except ValueError:
			pass
			
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
	
	if not target_url.startswith("http"):
		target_url = "https://" + target_url

	if not is_safe_url(target_url):
		return "ERROR: Restricted or invalid URL", 403

	try:
		headers = {
			'User-Agent': request.headers.get('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'),
			'Accept-Language': request.headers.get('Accept-Language', 'en-US,en;q=0.9'),
			'Referer': target_url
		}

		resp = requests.get(target_url, headers=headers, timeout=10, stream=True)
		excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
		headers = [(name, value) for (name, value) in resp.raw.headers.items()
				   if name.lower() not in excluded_headers]
		return Response(resp.content, resp.status_code, headers)
		
	except requests.exceptions.Timeout:
		return "ERROR: Request timed out", 504
	except Exception as e:
		return f"ERROR: {str(e)}", 500

if __name__ == "__main__":
	port = int(os.environ.get("PORT", 8080))
	app.run(host="0.0.0.0", port=port)
