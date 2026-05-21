import time
import psutil
import requests
import google.auth
import google.auth.transport.requests
from google.oauth2 import id_token

CLOUD_RUN_URL = "https://terminal-941307900976.us-east5.run.app/"

def get_id_token(url):
	auth_req = google.auth.transport.requests.Request()
	return id_token.fetch_id_token(auth_req, url)

def send_metrics():
	while True:
		cpu = psutil.cpu_percent(interval=1)
		print(f"Current CPU Usage: {cpu}%")
		payload = {"cpu_usage": cpu}

	try:
		response = requests.post(CLOUD_RUN_URL, json=payload, timeout=5)
		print(f"Server Response: {response.status_code}")
		except Exception as e:
		print(f"Error sending data: {e}")
		time.sleep(5)

if __name__ == "__main__":
	send_metrics()
