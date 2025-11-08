from pymongo import MongoClient, ASCENDING, DESCENDING
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://mongo:27017")
DB_NAME = os.environ.get("MONGO_DB", "stocklens")

_client = MongoClient(MONGO_URL)
_db = _client[DB_NAME]

users = _db["users"]
threads = _db["threads"]
comments = _db["comments"]
votes = _db["votes"]

# indexes
users.create_index("email", unique=True)
threads.create_index([("symbol", ASCENDING), ("createdAt", DESCENDING)])
comments.create_index([("threadId", ASCENDING), ("createdAt", ASCENDING)])
votes.create_index([("userId", ASCENDING), ("type", ASCENDING), ("entityId", ASCENDING)], unique=True)
