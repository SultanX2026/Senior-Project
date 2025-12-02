from flask import Blueprint, request, jsonify
from services.ollama_client import generate_with_ollama
from services.llm_fallback import generate_with_openai
from core.db import threads, comments
from core.config import Config
import logging

logger = logging.getLogger(__name__)
chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api/chatbot")


def _extract_stock_symbols(question: str) -> list[str]:
    """Extract stock symbols mentioned in the question."""
    import re
    # Match common patterns like $AAPL, AAPL, TSLA, etc.
    patterns = [
        r'\$([A-Z]{1,5})',  # $AAPL
        r'\b([A-Z]{1,5})\b',  # AAPL (single words that are all caps)
    ]
    symbols = set()
    for pattern in patterns:
        matches = re.findall(pattern, question)
        symbols.update(m.upper() for m in matches if len(m) <= 5)
    return list(symbols)[:3]  # Limit to 3 symbols


def _get_community_context(symbol: str) -> str:
    """Get community impression and thread summaries for a symbol."""
    th = list(threads.find({"symbol": symbol}).sort("reliabilityScore", -1).limit(5))
    
    if not th:
        return f"No community threads found for {symbol}."
    
    context = f"\nCommunity threads about {symbol}:\n"
    for i, t in enumerate(th, 1):
        title = t.get("title", "")
        stance = t.get("stance", "neutral")  # bullish/bearish/neutral
        score = t.get("reliabilityScore", 0)
        context += f"{i}. [{stance.upper()}] {title} (reliability: {score:.1f}/5)\n"
    
    return context


@chatbot_bp.get("/debug")
def debug_config():
    """Debug endpoint to check if config is loaded correctly."""
    return jsonify({
        "openai_api_key_set": bool(Config.OPENAI_API_KEY),
        "openai_api_key_length": len(Config.OPENAI_API_KEY) if Config.OPENAI_API_KEY else 0,
        "openai_api_key_preview": (Config.OPENAI_API_KEY[:20] + "...") if Config.OPENAI_API_KEY else "NOT SET",
        "openai_model": Config.OPENAI_MODEL,
        "ollama_host": Config.OLLAMA_HOST,
    })


@chatbot_bp.post("/ask")
def ask_chatbot():
    """Answer questions about stocks and community sentiment."""
    data = request.get_json() or {}
    question = (data.get("question") or "").strip()
    
    if not question:
        return jsonify({"error": "Question is required"}), 400
    
    # Extract symbols mentioned
    symbols = _extract_stock_symbols(question)
    
    # Build context
    context_parts = ["You are a helpful stock market advisor. Provide concise, neutral insights."]
    
    # Add community context if symbols found
    if symbols:
        for sym in symbols:
            context_parts.append(_get_community_context(sym))
    else:
        context_parts.append("(No specific stocks mentioned)")
    
    context = "\n".join(context_parts)
    
    # Generate response
    prompt = f"{context}\n\nUser question: {question}\n\nProvide a concise answer (2-3 sentences max). Do not include disclaimers or statements about not being a financial advisor."
    
    # Try Ollama first (free, local), then fall back to OpenAI
    logger.info(f"Trying to generate response for question: {question}")
    
    answer = generate_with_ollama(prompt)
    if answer:
        logger.info("✓ Ollama response generated")
        return jsonify({
            "question": question,
            "answer": answer,
            "symbols_mentioned": symbols
        })
    
    logger.warning("⚠ Ollama failed, trying OpenAI...")
    answer = generate_with_openai(prompt)
    if answer:
        logger.info("✓ OpenAI response generated")
        return jsonify({
            "question": question,
            "answer": answer,
            "symbols_mentioned": symbols
        })
    
    logger.error("✗ Both Ollama and OpenAI failed!")
    return jsonify({
        "question": question,
        "answer": "I couldn't generate a response. Try again.",
        "symbols_mentioned": symbols,
        "error": "Both Ollama and OpenAI services failed"
    })
