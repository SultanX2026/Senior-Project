from pydantic import BaseModel, Field, validator
from typing import Literal

class ThreadIn(BaseModel):
    symbol: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    stance: Literal["buy", "sell", "neutral"] = "neutral"

    @validator("symbol")
    def upcase(cls, v): return v.upper()

class CommentIn(BaseModel):
    threadId: str
    body: str = Field(..., min_length=1)

def validate_thread(payload: dict) -> dict:
    return ThreadIn(**payload).dict()

def validate_comment(payload: dict) -> dict:
    return CommentIn(**payload).dict()
