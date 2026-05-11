import os
import psutil
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 8080))

@app.route('/favicon.ico')
def favicon():
	return send_from_directory(os.path.join(app.root_path, 'static'),
								'favicon.svg', mimetype='image/svg+xml')

@app.route('/')
def home():
	port = request.environ.get('SERVER_PORT', PORT)
	return f"[ OK ] Listening on {port}"

@app.route('/stats', methods=['GET'])
def get_stats():
	cpu_usage = psutil.cpu_percent(interval=0.1)
	memory = psutil.virtual_memory()
    
	return jsonify({
		"cpu_usage_percent": cpu_usage,
		"memory_usage_percent": memory.percent,
		"memory_used_gb": round(memory.used / (1024**3), 2),
		"status": "online"
	})

if __name__ == "__main__":
	app.run(host='0.0.0.0', port=PORT)
