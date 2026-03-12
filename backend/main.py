from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .simulator import PICSimulator
import json
import asyncio

app = FastAPI()

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = PICSimulator()

@app.websocket("/ws/simulate")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "COMPILE":
                code = message["code"]
                simulator.set_code(code)
                await websocket.send_json({"type": "LOG", "message": "Compilation (Parsing) Terminée"})
            
            elif message["type"] == "INPUT":
                # User clicked a switch or button
                inputs = message["inputs"] # e.g. {"PORTB": 128}
                state = simulator.step(inputs)
                await websocket.send_json({"type": "STATE", "state": state})
            
            elif message["type"] == "STEP":
                # Continuous simulation tick
                state = simulator.step({})
                await websocket.send_json({"type": "STATE", "state": state})
                
    except WebSocketDisconnect:
        pass

# Serve React static files
import os
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if not os.path.exists(static_dir):
    static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
