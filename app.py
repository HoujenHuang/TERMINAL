from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import requests
import os
import psutil

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/")
def home():
	cpu = psutil.cpu_percent()
	return jsonify({"status": "TERMINAL Backend active", "cpu_usage": f"{cpu}%"})

@app.route("/proxy")
def proxy():
	target_url = request.args.get('url')
	if not target_url:
		return "ERROR: No URL provided", 400
    
	if not target_url.startswith("http"):
		target_url = "https://" + target_url

	try:
		headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'}
		resp = requests.get(target_url, headers=headers, timeout=10)

		return Response(resp.content, content_type=resp.headers.get('Content-Type'))
	except Exception as e:
		return f"Failed to load page: {str(e)}", 500

if __name__ == "__main__":
	port = int(os.environ.get("PORT", 8080))
	app.run(host="0.0.0.0", port=port)
