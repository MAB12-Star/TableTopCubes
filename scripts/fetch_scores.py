import base64
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

boards = {"cubes": "Sample_Leaderboard", "snake": "Snake", "pongo": "Pongo"}
project = "28445114-42e5-4be4-8e36-33dfb848c344"
environment = quote(os.environ["UNITY_ENVIRONMENT_ID"], safe="")
key = os.environ["UNITY_SERVICE_KEY_ID"]
secret = os.environ["UNITY_SERVICE_SECRET"]
authorization = base64.b64encode(f"{key}:{secret}".encode()).decode()
scores = {}
for game, board in boards.items():
    url = (
        "https://services.api.unity.com/leaderboards/v1/projects/"
        f"{project}/environments/{environment}/leaderboards/{board}/scores?limit=5"
    )
    request = Request(url, headers={"Authorization": f"Basic {authorization}"})
    try:
        with urlopen(request, timeout=15) as response:
            rows = json.load(response)["results"]
    except HTTPError as error:
        raise SystemExit(f"Unity returned HTTP {error.code} for {game}") from None
    scores[game] = [
        {"rank": row["rank"] + 1, "name": row.get("playerName") or "Player", "points": row["score"]}
        for row in rows
    ]
snapshot = {"updated": datetime.now(timezone.utc).isoformat(), "scores": scores}
target = Path("leaderboard.json")
temporary = target.with_suffix(".tmp")
temporary.write_text(json.dumps(snapshot, allow_nan=False), encoding="utf-8")
temporary.replace(target)
