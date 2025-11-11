# StockLens

A full-stack stock market community platform with real-time data, AI-powered summaries, and community discussions.

## Prerequisites

- Docker & Docker Compose
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/SultanX2026/Senior-Project.git
   cd Senior-Project
   ```

2. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env  # or create .env with your API keys
   ```
   
   Required environment variables:
   - `MONGO_URI` - MongoDB connection string (default: `mongodb://localhost:27017/stocklens`)
   - `JWT_SECRET` - Secret key for JWT tokens
   - `FINNHUB_API_KEY` - Get from [finnhub.io](https://finnhub.io)
   - `NEWSAPI_KEY` - Get from [newsapi.org](https://newsapi.org)
   - `OLLAMA_HOST` - Ollama service URL (default: `http://localhost:11434`)
   - `OPENAI_API_KEY` - Optional, for GPT summaries

3. **Build and run with Docker**
   ```bash
   cd deploy
   docker compose build --no-cache
   docker compose up
   ```

4. **Access the app**
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

## Project Structure

- **client/** - React frontend (TypeScript, Vite)
- **server/** - Flask backend (Python)
- **deploy/** - Docker configuration

## Features

- 📈 Real-time stock data and charts
- 💬 Community discussions and threads
- 🤖 AI-powered stock summaries
- 📰 News aggregation
- ⭐ Stock rankings and ratings

## Troubleshooting

- **Port already in use?** Change ports in `docker-compose.yml`
- **MongoDB connection failed?** Ensure MongoDB is running via Docker
- **API key errors?** Verify `.env` file has correct keys
