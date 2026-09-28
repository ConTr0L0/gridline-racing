"""Personal FastF1-to-WebSocket bridge for the app's live timing screen."""

from __future__ import annotations

import asyncio
import copy
import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
LOCK = threading.Lock()
STATE: dict[str, Any] = {
    "drivers": {}, "timing": {}, "lapCount": {}, "sessionInfo": {},
    "sessionStatus": {}, "trackStatus": {}, "raceControl": {},
    "updatedAt": None, "upstreamConnected": False,
}


def _load_local_env() -> None:
    """Read the ignored root .env.local without adding a dotenv dependency."""
    env_file = ROOT / ".env.local"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def _payload(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def consume_message(message: Any, state: dict[str, Any] | None = None) -> bool:
    """Merge FastF1 SignalR feed frames into a minimal app-facing state."""
    target = state if state is not None else STATE
    frames = []
    if hasattr(message, "result") and isinstance(message.result, dict):
        frames = [[key, value] for key, value in message.result.items()]
    elif isinstance(message, list):
        frames = [frame[:2] for frame in message if isinstance(frame, list) and len(frame) >= 2]

    updated = False
    for frame in frames:
        topic, value = frame
        if topic not in {"DriverList", "TimingData", "LapCount", "SessionInfo", "SessionStatus", "TrackStatus", "RaceControlMessages"}:
            continue
        target_key = {"DriverList": "drivers", "TimingData": "timing", "LapCount": "lapCount", "SessionInfo": "sessionInfo", "SessionStatus": "sessionStatus", "TrackStatus": "trackStatus", "RaceControlMessages": "raceControl"}[topic]
        target[target_key] = _payload(value)
        updated = True
    if updated:
        target["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return updated


def _value(item: Any) -> str:
    if isinstance(item, dict):
        item = item.get("Value", item.get("value", ""))
    return str(item) if item is not None else ""


def _number(item: Any) -> int | None:
    try:
        return int(item)
    except (TypeError, ValueError):
        return None


def _track_label(track: Any, race_control: Any) -> str:
    if isinstance(race_control, dict):
        messages = race_control.get("Messages", {})
        if isinstance(messages, dict) and messages:
            latest = next(reversed(messages.values()))
            message = str(latest.get("Message", "")) if isinstance(latest, dict) else str(latest)
            upper = message.upper()
            for marker, label in (("VIRTUAL SAFETY CAR", "虚拟安全车"), ("SAFETY CAR", "安全车"), ("RED FLAG", "红旗"), ("YELLOW", "黄旗"), ("GREEN", "绿旗")):
                if marker in upper:
                    return label
    status = str(track.get("Status", "")) if isinstance(track, dict) else ""
    return {"1": "绿旗 / 赛道畅通", "2": "黄旗", "4": "安全车", "5": "红旗", "6": "虚拟安全车", "7": "虚拟安全车结束"}.get(status, f"赛道状态 {status}" if status else "")


def make_snapshot(state: dict[str, Any] | None = None) -> dict[str, Any]:
    source = state if state is not None else STATE
    timing = source.get("timing") or {}
    lines = timing.get("Lines", {}) if isinstance(timing, dict) else {}
    drivers = source.get("drivers") or {}
    if not isinstance(lines, dict):
        lines = {}
    if not isinstance(drivers, dict):
        drivers = {}
    rows = []
    for number in set(drivers) | set(lines):
        info = drivers.get(number) if isinstance(drivers.get(number), dict) else {}
        line = lines.get(number) if isinstance(lines.get(number), dict) else {}
        position = _number(line.get("Position", info.get("Position")))
        interval = line.get("IntervalToPositionAhead", {})
        gap = _value(line.get("GapToLeader")) or _value(interval)
        rows.append({
            "number": str(info.get("RacingNumber", number)),
            "code": str(info.get("Tla", info.get("ShortName", ""))),
            "team": str(info.get("TeamName", "")),
            "teamColour": "#" + str(info.get("TeamColour", "")).lstrip("#"),
            "position": position,
            "gap": gap,
            "lastLap": _value(line.get("LastLapTime")),
            "bestLap": _value(line.get("BestLapTime")),
        })
    rows.sort(key=lambda row: (row["position"] is None, row["position"] or 999, row["number"]))
    session = source.get("sessionInfo") or {}
    meeting = session.get("Meeting", {}) if isinstance(session, dict) else {}
    lap_count = source.get("lapCount") or {}
    status = source.get("sessionStatus") or {}
    return {
        "meeting": str(meeting.get("Name", "")) if isinstance(meeting, dict) else "",
        "session": str(session.get("Name", "")) if isinstance(session, dict) else "",
        "sessionStatus": str(status.get("Status", "")) if isinstance(status, dict) else "",
        "trackStatus": _track_label(source.get("trackStatus"), source.get("raceControl")),
        "lap": _number(lap_count.get("CurrentLap")) if isinstance(lap_count, dict) else None,
        "totalLaps": _number(lap_count.get("TotalLaps")) if isinstance(lap_count, dict) else None,
        "updatedAt": source.get("updatedAt"),
        "upstreamConnected": bool(source.get("upstreamConnected")),
        "drivers": rows,
    }


def _self_check() -> None:
    state: dict[str, Any] = {}
    consume_message([
        ["DriverList", json.dumps({"4": {"RacingNumber": "4", "Tla": "NOR", "TeamName": "McLaren", "TeamColour": "FF8000"}}), ""],
        ["TimingData", json.dumps({"Lines": {"4": {"Position": "1", "GapToLeader": "LEADER", "LastLapTime": {"Value": "1:22.100"}, "BestLapTime": {"Value": "1:21.800"}}}}), ""],
        ["LapCount", json.dumps({"CurrentLap": 12, "TotalLaps": 58}), ""],
        ["SessionInfo", json.dumps({"Meeting": {"Name": "Test Grand Prix"}, "Name": "Race"}), ""],
        ["TrackStatus", json.dumps({"Status": "4"}), ""],
    ], state)
    result = make_snapshot(state)
    assert result["meeting"] == "Test Grand Prix"
    assert result["lap"] == 12 and result["totalLaps"] == 58
    assert result["trackStatus"] == "安全车"
    assert result["drivers"][0]["code"] == "NOR"
    assert result["drivers"][0]["bestLap"] == "1:21.800"


def _set_upstream(connected: bool) -> None:
    with LOCK:
        STATE["upstreamConnected"] = connected


async def run_server() -> None:
    from websockets.asyncio.server import serve

    host = os.getenv("F1_TIMING_HOST", "127.0.0.1")
    port = int(os.getenv("F1_TIMING_PORT", "8765"))
    access_key = os.getenv("F1_TIMING_ACCESS_KEY", "")
    if host not in {"127.0.0.1", "localhost", "::1"} and not access_key:
        raise SystemExit("F1_TIMING_ACCESS_KEY is required when the bridge listens beyond localhost.")

    clients = set()

    async def broadcast() -> None:
        with LOCK:
            snapshot = make_snapshot(copy.deepcopy(STATE))
        payload = json.dumps(snapshot, ensure_ascii=False)
        if clients:
            await asyncio.gather(*(client.send(payload) for client in tuple(clients)), return_exceptions=True)

    async def handler(connection) -> None:
        protocols = connection.request.headers.get("Sec-WebSocket-Protocol", "").split(",")
        protocols = {value.strip() for value in protocols}
        if access_key and access_key not in protocols:
            await connection.close(code=1008, reason="Access key required")
            return
        clients.add(connection)
        try:
            await broadcast()
            await connection.wait_closed()
        finally:
            clients.discard(connection)

    async with serve(handler, host, port, subprotocols=["f1-live"], ping_interval=20):
        print(f"Personal live timing bridge listening at ws://{host}:{port}")
        threading.Thread(target=run_upstream, daemon=True).start()
        async def refresh_clients() -> None:
            while True:
                await broadcast()
                await asyncio.sleep(1)
        asyncio.create_task(refresh_clients())
        await asyncio.Future()


def run_upstream() -> None:
    # ponytail: taps FastF1's private callback to avoid retaining raw feeds; adapt this hook if FastF1 changes it.
    import fastf1
    from fastf1.livetiming.client import SignalRClient

    class BridgeClient(SignalRClient):
        def __init__(self):
            super().__init__(filename=os.devnull, timeout=45)

        def _on_message(self, message):
            super()._on_message(message)
            with LOCK:
                consume_message(message)

        def _on_connect(self):
            super()._on_connect()
            _set_upstream(True)

        def _on_close(self):
            super()._on_close()
            _set_upstream(False)

    print(f"Starting personal FastF1 bridge with FastF1 {fastf1.__version__}.")
    while True:
        client = BridgeClient()
        try:
            client.start()
        except KeyboardInterrupt:
            return
        except Exception as error:
            print(f"F1 live connection ended: {error}")
        finally:
            _set_upstream(False)
        time.sleep(5)


def main() -> None:
    _load_local_env()
    try:
        asyncio.run(run_server())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    if "--self-check" in os.sys.argv:
        _self_check()
        print("Live bridge parser self-check passed.")
    else:
        main()
