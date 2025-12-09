# StockLens

A full-stack stock market community platform with real-time data, AI-powered analysis, intelligent chatbot, and community discussions.

## 🌟 Features

### Stock Analysis
- 📈 Real-time stock quotes and price charts (1D, 5D, 1M, 1Y views)
- 📊 Stock metrics: 52-week high/low, P/E ratio, EPS (TTM)
- 🏢 Company information and profiles
- 📰 Intelligent news aggregation with symbol filtering
- 🌙 Light/Dark mode with persistent theme preference

### Community
- 💬 Create and discuss stock threads with stance (Buy/Sell/Neutral)
- 👍 Vote on threads and comments (up/down voting)
- ↩️ Reply to comments (1-level nested replies)
- 📊 Community sentiment analysis per stock
- ⭐ Reliability scoring based on community votes

### Intelligent Chatbot
- 🤖 AWS Lambda powered agent API for stock insights
- 💭 Multi-turn conversation with session persistence
- 📥 Export chat history as text file
- 🔄 Automatic fallback chain: Agent API → OpenAI → Ollama

### Authentication & Security
- 🔐 User registration and login with JWT tokens
- 🔑 Password recovery with security questions
- 👤 Profile management and theme preferences
- 🎨 Avatar color customization

### User Experience
- 🌗 Automatic theme detection and persistence
- 🎯 Responsive design (mobile-friendly)
- ⚡ Real-time UI updates
- 🎨 Smooth transitions and animations

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

### Port already in use?
Change ports in `docker-compose.yml`:
```yaml
ports:
  - "5173:5173"  # Change left number for frontend
  - "5001:5001"  # Change left number for backend
```

### MongoDB connection failed
Ensure MongoDB container is running:
```bash
docker compose ps
docker compose logs mongo
```

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

## Performance Tips

- News filtering optimizes query size (fetches 3x, filters down)
- Comments use 1-level nesting to keep structure simple
- Chart data limited to 180 periods per view
- Theme CSS uses variables for instant updates
- Session IDs ensure chatbot context isolation

## Testing

### Manual testing checklist
- [ ] Create account and login
- [ ] Toggle theme (light/dark) and verify persistence
- [ ] Search and view stock (verify chart loads)
- [ ] Create community thread with stance
- [ ] Vote on thread/comment (verify toggle)
- [ ] Chat with agent about a stock
- [ ] Export chat history
- [ ] Logout and verify theme persists on login

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add feature"`
3. Push to origin: `git push origin feature/your-feature`
4. Open pull request to `main` branch

## License

MIT License - See LICENSE file for details

## Support

For issues and feature requests, please open a GitHub issue or contact the development team.

---

**Last Updated**: December 5, 2025
**Current Version**: 1.0.0
