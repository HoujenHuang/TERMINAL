import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

latest_metrics = {"cpu_usage": 0}

@app.route('/report', methods=['POST'])
def report():
	data = request.json
	latest_metrics['cpu_usage'] = data.get('cpu_usage', 0)
	return jsonify({"status": "success"}), 200

@app.route('/metrics', methods=['GET'])
def get_metrics():
	return jsonify(latest_metrics), 200

if __name__ == "__main__":
	app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

@app.route('/favicon.ico')
def favicon():
	return send_from_directory(os.path.join(app.root_path, 'static'),
								'favicon.svg', mimetype='image/svg+xml')
