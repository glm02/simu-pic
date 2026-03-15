import asyncio
import json
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from .simulator import PICSimulator
except ImportError:
    from simulator import PICSimulator

app = FastAPI()

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

            # ── Parse incoming JSON ────────────────────────────────────
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "LOG", "message": "⚠ Message JSON invalide reçu."}
                )
                continue

            msg_type = message.get("type", "")

            # ── COMPILE ───────────────────────────────────────────────
            if msg_type == "COMPILE":
                code = message.get("code", "")
                try:
                    simulator.set_code(code)

                    # Forward any parse/init errors collected by the simulator
                    errors = simulator.error_log.copy()
                    simulator.error_log = []
                    for err in errors:
                        await websocket.send_json(
                            {"type": "LOG", "message": f"⚠ {err}"}
                        )

                    await websocket.send_json(
                        {"type": "LOG", "message": "✓ Compilation (Parsing) Terminée"}
                    )

                    # Send the initial hardware state so the board refreshes
                    state = simulator.get_state()
                    await websocket.send_json({"type": "STATE", "state": state})

                except Exception as e:
                    await websocket.send_json(
                        {
                            "type": "LOG",
                            "message": f"⚠ Erreur de compilation : {str(e)}",
                        }
                    )

            # ── INPUT ─────────────────────────────────────────────────
            elif msg_type == "INPUT":
                inputs = message.get("inputs", {})
                try:
                    state = simulator.step(inputs)
                    await websocket.send_json({"type": "STATE", "state": state})

                    for err in state.get("errors", []):
                        await websocket.send_json(
                            {"type": "LOG", "message": f"⚠ {err}"}
                        )

                except Exception as e:
                    await websocket.send_json(
                        {"type": "LOG", "message": f"⚠ Erreur d'entrée : {str(e)}"}
                    )

            # ── STEP ──────────────────────────────────────────────────
            elif msg_type == "STEP":
                try:
                    state = simulator.step({})
                    await websocket.send_json({"type": "STATE", "state": state})

                    for err in state.get("errors", []):
                        await websocket.send_json(
                            {"type": "LOG", "message": f"⚠ {err}"}
                        )

                except Exception as e:
                    await websocket.send_json(
                        {"type": "LOG", "message": f"⚠ Erreur d'exécution : {str(e)}"}
                    )

            # ── RESET ─────────────────────────────────────────────────
            elif msg_type == "RESET":
                try:
                    simulator = PICSimulator()
                    await websocket.send_json(
                        {"type": "LOG", "message": "↺ Simulateur réinitialisé."}
                    )
                    state = simulator.get_state()
                    await websocket.send_json({"type": "STATE", "state": state})

                except Exception as e:
                    await websocket.send_json(
                        {
                            "type": "LOG",
                            "message": f"⚠ Erreur de réinitialisation : {str(e)}",
                        }
                    )

            else:
                await websocket.send_json(
                    {
                        "type": "LOG",
                        "message": f"⚠ Type de message inconnu : '{msg_type}'",
                    }
                )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        # Last-resort: try to notify the client before giving up
        try:
            await websocket.send_json(
                {"type": "LOG", "message": f"⚠ Erreur serveur inattendue : {str(e)}"}
            )
        except Exception:
            pass


# ── Serve compiled React frontend ─────────────────────────────────────────────
_base = os.path.dirname(os.path.abspath(__file__))
_candidates = [
    os.path.join(_base, "..", "static"),
    os.path.join(_base, "..", "frontend", "dist"),
]
for _dir in _candidates:
    _dir = os.path.abspath(_dir)
    if os.path.isdir(_dir):
        app.mount("/", StaticFiles(directory=_dir, html=True), name="static")
        break


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
