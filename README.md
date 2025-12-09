# StockLens

A full-stack stock market community platform with real-time data, AI-powered analysis, intelligent chatbot, and community discussions.


## Prerequisites

- Docker & Docker Compose
- Git

## Quick Start


1. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env  # or create .env with your API keys
   ```
   
   Required environment variables:
   - `MONGO_URI` - MongoDB connection string (default: `mongodb://localhost:27017/stocklens`)
   - `JWT_SECRET` - Secret key for JWT tokens (generate with `python -c "import secrets; print(secrets.token_hex(32))"`)
   - `FINNHUB_API_KEY` - Get from [finnhub.io](https://finnhub.io)
   - `NEWSAPI_KEY` - Get from [newsapi.org](https://newsapi.org)
   - `OLLAMA_HOST` - Ollama service URL (default: `http://localhost:11434`)
   - `OPENAI_API_KEY` - Optional, for OpenAI fallback

2. **Build and run with Docker**
   ```bash
   cd deploy
   docker compose build --no-cache
   docker compose up
   ```

3. **Access the app**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:5001
   - **MongoDB**: localhost:27017

## Development Commands

### View logs
```bash
docker compose logs -f api      # Backend logs
docker compose logs -f client   # Frontend logs
docker compose logs -f mongo    # Database logs
```

### Stop services
```bash
docker compose down
```

### Rebuild after code changes
```bash
docker compose up --build
```

### Run specific service
```bash
docker compose up api    # Backend only
docker compose up client # Frontend only
```

## Project Structure

```
StockLens/
├── client/              # React frontend (TypeScript, Vite)
│   ├── src/
│   │   ├── pages/      # Page components (Dashboard, Stock, Community, etc.)
│   │   ├── components/ # Reusable components (Chatbot, ThreadCard, etc.)
│   │   ├── api/        # API client functions
│   │   └── App.tsx     # Main app with theme management
│   └── package.json
├── server/             # Flask backend (Python)
│   ├── blueprints/     # API route handlers
│   ├── services/       # External API integrations
│   ├── core/           # Core utilities (auth, db, config)
│   ├── models/         # Data schemas
│   ├── app.py          # Flask app entry point
│   └── requirements.txt
└── deploy/             # Docker configuration
    ├── docker-compose.yml
    ├── Dockerfile.api
    └── Dockerfile.client
```

## API Endpoints

### Stocks
```
GET  /api/stocks/quote?symbol=AAPL
GET  /api/stocks/candles?symbol=AAPL&resolution=D&count=180
GET  /api/stocks/profile?symbol=AAPL
GET  /api/stocks/metrics?symbol=AAPL
GET  /api/stocks/lookup?q=apple
GET  /api/news?symbol=AAPL&limit=8
```

### Community
```
GET    /api/community/threads?symbol=AAPL
POST   /api/community/threads (create thread)
GET    /api/community/comments?threadId=...
POST   /api/community/comments (create comment)
POST   /api/community/vote (vote on thread/comment)
GET    /api/community/sentiment?symbol=AAPL
```

### Chat & AI
```
POST   /api/chatbot/ask (send message to agent)
```

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

## Technology Stack

### Frontend
- **React** 18.x with TypeScript
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **Chart.js** - Stock price charts
- **CSS Modules** - Component scoped styling

### Backend
- **Flask** - Python web framework
- **MongoDB** - NoSQL database
- **PyJWT** - JWT authentication
- **Requests** - HTTP library for external APIs

### External APIs
- **Finnhub** - Real-time stock data, company profiles, metrics
- **NewsAPI** - Financial news aggregation (17 whitelisted sources)
- **AWS Lambda** - AI chatbot backend 
- **OpenAI** - GPT models for fallback analysis
- **Ollama** - Local LLM alternative

## Key Features Detail

### News Filtering
News articles are intelligently filtered in two tiers:
1. **Priority 1**: Articles containing stock symbol in title or description
2. **Priority 2**: General financial news from whitelisted sources

Only trusted financial sources are used: Bloomberg, Reuters, CNBC, WSJ, Seeking Alpha, etc.

### Voting System
- Toggle votes: Click same button twice to remove your vote
- Thread votes affect reliability score calculation
- Comment votes show community sentiment

### Reliability Score
Calculated per thread: `(upvotes - downvotes) / (upvotes + downvotes + 5)`
- Used to rank community discussions
- Influences sentiment analysis

### Theme System
- Light mode and dark mode with CSS variables
- Theme preference saved to localStorage (`sl_theme`)
- Persists across login/logout sessions
- Real-time CSS variable updates for all components

## Troubleshooting

### API key errors
1. Verify all required API keys in `.env`
2. Check key permissions and rate limits
3. For Finnhub: Free tier has 60 calls/minute limit

### Chatbot not responding
Check fallback chain:
1. AWS Lambda Agent API (primary)
2. OpenAI API (if key set)
3. Ollama (if available)

Set `OLLAMA_HOST=http://ollama:11434` for Docker

### Frontend not loading
```bash
# Clear node_modules and reinstall
rm -rf client/node_modules
docker compose up --build
```

