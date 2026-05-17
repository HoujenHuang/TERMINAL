import os
import psutil
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

LOCALHOST = 5000

def get_system_info():
	cpu_usage = psutil.cpu_percent(interval=0.1)
	memory = psutil.virtual_memory()
	return {
		"cpu_usage_percent": cpu_usage,
		"memory_usage_percent": memory.percent,
		"memory_used_gb": round(memory.used / (1024**3), 2),
		"status": "online",
		"engine": "Puter.js + Wisp",
		"proxy_active": True
	}

@app.route('/')
def home():
	stats = get_system_info()
	return jsonify({
		"message": "TERMINAL Backend is active",
		"wisp_endpoint": "/wisp/",
		**stats
	})

@app.route('/stats', methods=['GET'])
def get_stats():
	return jsonify(get_system_info())

if __name__ == "__main__":
	app.run(host='0.0.0.0', port=LOCALHOST)

@app.route('/favicon.ico')
def favicon():
	return send_from_directory(os.path.join(app.root_path, 'static'),
								'favicon.svg', mimetype='image/svg+xml')
