"""
Хранение и получение уровней Mario World 2 через S3.
GET / — список уровней
POST / — сохранить уровень
GET /?id=<id> — получить уровень по id
POST /play — увеличить счётчик игр
POST /like — лайкнуть уровень
"""
import json
import os
import uuid
import boto3
from datetime import datetime, timezone

BUCKET = "files"
PREFIX = "mario-levels/"

def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

def list_levels(s3):
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=PREFIX)
    levels = []
    for obj in resp.get("Contents", []):
        key = obj["Key"]
        if not key.endswith(".json"):
            continue
        try:
            data = json.loads(s3.get_object(Bucket=BUCKET, Key=key)["Body"].read())
            levels.append({
                "id": data.get("id"),
                "name": data.get("name", "???"),
                "author": data.get("author", "Аноним"),
                "width": data.get("width", 20),
                "height": data.get("height", 12),
                "plays": data.get("plays", 0),
                "likes": data.get("likes", 0),
                "created_at": data.get("created_at", ""),
            })
        except Exception:
            pass
    levels.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return levels

def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    s3 = get_s3()
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}

    # GET /?id=xxx — один уровень
    if method == "GET" and params.get("id"):
        level_id = params["id"]
        key = f"{PREFIX}{level_id}.json"
        try:
            data = json.loads(s3.get_object(Bucket=BUCKET, Key=key)["Body"].read())
            return {"statusCode": 200, "headers": headers, "body": json.dumps(data)}
        except Exception:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Уровень не найден"})}

    # GET / — список уровней
    if method == "GET":
        levels = list_levels(s3)
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"levels": levels})}

    # POST /play — +1 play
    if method == "POST" and path.endswith("/play"):
        body = json.loads(event.get("body") or "{}")
        level_id = body.get("id")
        key = f"{PREFIX}{level_id}.json"
        try:
            data = json.loads(s3.get_object(Bucket=BUCKET, Key=key)["Body"].read())
            data["plays"] = data.get("plays", 0) + 1
            s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(data), ContentType="application/json")
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"plays": data["plays"]})}
        except Exception:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Не найдено"})}

    # POST /like — +1 like
    if method == "POST" and path.endswith("/like"):
        body = json.loads(event.get("body") or "{}")
        level_id = body.get("id")
        key = f"{PREFIX}{level_id}.json"
        try:
            data = json.loads(s3.get_object(Bucket=BUCKET, Key=key)["Body"].read())
            data["likes"] = data.get("likes", 0) + 1
            s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(data), ContentType="application/json")
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"likes": data["likes"]})}
        except Exception:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Не найдено"})}

    # POST / — сохранить уровень
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        level_id = str(uuid.uuid4())[:8]
        level = {
            "id": level_id,
            "name": body.get("name", "Без названия")[:60],
            "author": body.get("author", "Аноним")[:30],
            "grid": body.get("grid", []),
            "width": int(body.get("width", 20)),
            "height": int(body.get("height", 12)),
            "plays": 0,
            "likes": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        key = f"{PREFIX}{level_id}.json"
        s3.put_object(Bucket=BUCKET, Key=key, Body=json.dumps(level), ContentType="application/json")
        return {"statusCode": 201, "headers": headers, "body": json.dumps({"id": level_id, "message": "Уровень сохранён!"})}

    return {"statusCode": 405, "headers": headers, "body": json.dumps({"error": "Method not allowed"})}
