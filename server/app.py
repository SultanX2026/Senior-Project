from flask import Flask, request
from flask_cors import CORS
import logging

from core.config import Config
from blueprints.auth import auth_bp
from blueprints.community import community_bp
from blueprints.stocks import stocks_bp
from blueprints.summaries import summaries_bp
from blueprints.rankings import rank_bp
from blueprints.news import news_bp
from blueprints.chatbot import chatbot_bp

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)

    # Keep JSON as-is (don't alphabetize keys)
    app.config["JSON_SORT_KEYS"] = False

    # Log all requests
    @app.before_request
    def log_request():
        logger.info(f"[REQUEST] {request.method} {request.path} from {request.remote_addr}")

    # CORS for all /api/* routes
    cors_origins = Config.ALLOW_ORIGINS
    if cors_origins == "*":
        # Allow all origins in development
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        # Restrict to specific origins in production
        CORS(
            app,
            resources={r"/api/*": {"origins": cors_origins}},
            supports_credentials=False,
        )
    
    print(f"[CORS] Allowed origins: {cors_origins}")

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(community_bp)
    app.register_blueprint(stocks_bp)
    app.register_blueprint(summaries_bp)
    app.register_blueprint(rank_bp)
    app.register_blueprint(news_bp)
    app.register_blueprint(chatbot_bp)

    # Simple health check
    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    # Log routes on startup (handy for debugging)
    try:
        print("\n=== URL MAP ===")
        for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
            methods = ", ".join(sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS")))
            print(f"{rule.rule:40} [{methods}] -> {rule.endpoint}")
        print("===============\n")
    except Exception as e:
        print(f"Route dump skipped: {e}")

    return app


app = create_app()

if __name__ == "__main__":
    # Local/dev run. In containers you’ll usually run via gunicorn:
    # gunicorn -w 2 -b 0.0.0.0:5001 app:app
    app.run(host="0.0.0.0", port=5001, debug=True)
