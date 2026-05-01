import os
import psutil
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

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
	port = int(os.environ.get("PORT", 8080))
	app.run(host='0.0.0.0', port=port)
