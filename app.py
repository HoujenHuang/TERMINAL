from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@app.get("/")
def read_root():
	return {"status": "TERMINAL Backend is running. Open /api/data to get info."}

@app.get("/api/data")
def get_data():
	return {"message": "TERMINAL Backend is running.", "data: ": [1, 2, 3, 4, 5]}

if __name__ == "__main__":
	import uvicorn
	port = int(os.environ.get("PORT", 8080))
	uvicorn.run(app, host="0.0.0.0", port=port)
