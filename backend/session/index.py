"""
Онлайн мультиплеер — сессии и позиции игроков.
action=join  — войти в комнату {room_id, player_id, name, skin}
action=state — обновить позицию {room_id, player_id, x, y, vx, anim, skin}
GET  /?room_id=xxx — получить всех игроков в комнате
action=leave — выйти {room_id, player_id}
"""
import json, os, time, boto3

BUCKET = "files"
PREFIX = "mario-sessions/"
TTL = 10  # секунд — игрок считается онлайн

def s3():
    return boto3.client("s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])

def room_key(room_id: str) -> str:
    return f"{PREFIX}{room_id}.json"

def load_room(client, room_id: str) -> dict:
    try:
        data = client.get_object(Bucket=BUCKET, Key=room_key(room_id))["Body"].read()
        return json.loads(data)
    except Exception:
        return {"players": {}}

def save_room(client, room_id: str, room: dict):
    client.put_object(Bucket=BUCKET, Key=room_key(room_id),
                      Body=json.dumps(room), ContentType="application/json")

def clean_stale(room: dict) -> dict:
    now = time.time()
    room["players"] = {
        pid: p for pid, p in room["players"].items()
        if now - p.get("ts", 0) < TTL
    }
    return room

def handler(event: dict, context) -> dict:
    h = {"Access-Control-Allow-Origin": "*",
         "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
         "Access-Control-Allow-Headers": "Content-Type",
         "Content-Type": "application/json"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": h, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    client = s3()

    # GET — список игроков комнаты
    if method == "GET":
        room_id = params.get("room_id", "default")
        room = clean_stale(load_room(client, room_id))
        return {"statusCode": 200, "headers": h,
                "body": json.dumps({"players": list(room["players"].values())})}

    body = json.loads(event.get("body") or "{}")
    room_id = body.get("room_id", "default")
    action  = body.get("action", "state")

    if action == "leave":
        pid = body.get("player_id")
        room = load_room(client, room_id)
        room["players"].pop(pid, None)
        save_room(client, room_id, room)
        return {"statusCode": 200, "headers": h, "body": json.dumps({"ok": True})}

    if action == "join":
        pid = body.get("player_id")
        room = clean_stale(load_room(client, room_id))
        room["players"][pid] = {
            "id": pid, "name": body.get("name", "Player"),
            "skin": body.get("skin", "🍄"),
            "x": body.get("x", 64), "y": body.get("y", 64),
            "vx": 0, "vy": 0, "anim": "idle", "ts": time.time()
        }
        save_room(client, room_id, room)
        return {"statusCode": 200, "headers": h,
                "body": json.dumps({"ok": True, "player_count": len(room["players"])})}

    # action == "state" (default)
    pid = body.get("player_id")
    room = clean_stale(load_room(client, room_id))
    room["players"][pid] = {
        "id": pid, "name": body.get("name", "Player"),
        "skin": body.get("skin", "🍄"),
        "x": body.get("x", 0), "y": body.get("y", 0),
        "vx": body.get("vx", 0), "vy": body.get("vy", 0),
        "anim": body.get("anim", "idle"), "ts": time.time()
    }
    save_room(client, room_id, room)
    other = [p for p in room["players"].values() if p["id"] != pid]
    return {"statusCode": 200, "headers": h,
            "body": json.dumps({"players": other})}
