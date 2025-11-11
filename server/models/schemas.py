from pydantic import BaseModel, Field, validator
from typing import Literal, Optional

def _word_count(s: str) -> int:
    return len([w for w in (s or "").split() if w.strip()])

class ThreadIn(BaseModel):
    symbol: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    stance: Literal["buy", "sell", "neutral"] = "neutral"

    @validator("symbol")
    def upcase(cls, v): 
        return v.upper().strip()

    @validator("title")
    def title_limit_300_words(cls, v):
        if _word_count(v) > 300:
            raise ValueError("title must be 300 words or fewer")
        return v.strip()

    @validator("body")
    def body_trim(cls, v):
        return v.strip()

class CommentIn(BaseModel):
    threadId: str
    body: str = Field(..., min_length=1)
    parentId: Optional[str] = None  # <- allow replies

    @validator("body")
    def body_trim(cls, v):
        return v.strip()

def validate_thread(payload: dict) -> dict:
    return ThreadIn(**payload).dict()

def validate_comment(payload: dict) -> dict:
    return CommentIn(**payload).dict()
