import os
import psutil
import threading
import asyncio
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from wisp.server import WispServer

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 8080))

def get_system_info():
	cpu_usage = psutil.cpu_percent(interval=0.1)
	memory = psutil.virtual_memory()
	return {
		"cpu_usage_percent": cpu_usage,
		"memory_usage_percent": memory.percent,
		"memory_used_gb": round(memory.used / (1024**3), 2),
		"status": "online",
		"proxy_active": True
	}

@app.route('/')
def home():
	stats = get_system_info()
	return jsonify({
		"message": f"TERMINAL Backend is active. Listening on http://localhost:{port}",
		"port": PORT,
		**stats
	})

@app.route('/stats', methods=['GET'])
def get_stats():
	return jsonify(get_system_info())

def run_wisp():
	loop = asyncio.new_event_loop()
	asyncio.set_event_loop(loop)
	server = WispServer(host='0.0.0.0', port=PORT)
	loop.run_until_complete(server.start())

if __name__ == "__main__":
	app.run(host='0.0.0.0', port=PORT)
