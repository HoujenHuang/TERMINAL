from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import requests
import os
import ipaddress
import socket
from urllib.parse import urlparse

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

def is_safe_url(url):
	try:
		parsed = urlparse(url)
		if parsed.scheme not in ('http', 'https'): return False
		ip = socket.gethostbyname(parsed.hostname)
		ip_obj = ipaddress.ip_address(ip)
		return not (ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local)
	except:
		return False

@app.route("/proxy")
def proxy():
	target_url = request.args.get('url')
	if not target_url:
		return "ERROR: No URL provided", 400

	if not target_url.startswith("http"):
		target_url = "https://" + target_url

	if not is_safe_url(target_url):
		return "ERROR: URL not safe", 403

	try:
		resp = requests.get(target_url, timeout=5, stream=True)

		excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie']
		headers = [(name, value) for (name, value) in resp.raw.headers.items()
				   if name.lower() not in excluded_headers]

		return Response(resp.content, resp.status_code, headers)
	except Exception as e:
		return "ERROR: Server not working", 500

if __name__ == "__main__":
	port = int(os.environ.get("PORT", 8080))
	app.run(host="0.0.0.0", port=port)
