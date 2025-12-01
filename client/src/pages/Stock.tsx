import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuote, getCandles, getProfile, getMetrics } from "../api/stocks";
import { communitySentiment } from "../api/community";
import { getNews, Article as NewsArticle } from "../api/news";
import styles from "./Stock.module.css";

type View = "1d" | "5d" | "1mo" | "1y";

const VIEW_TO_REQ = (v: View) => {
  switch (v) {
    case "1d": return { resolution: "60" as const, count: 8 };
    case "5d": return { resolution: "60" as const, count: 40 };
    case "1mo": return { resolution: "D" as const, count: 30 };
    case "1y": return { resolution: "W" as const, count: 52 };
  }
};

function formatNewsDate(d?: string | number | null) {
  if (!d) return "";
  if (typeof d === "number") {
    return new Date(d * 1000).toLocaleDateString();
  }
  const t = Date.parse(d);
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString();
}

export default function Stock() {
  const nav = useNavigate();
  const { symbol: param } = useParams();
  const symbol = (param || "AAPL").toUpperCase();

  const [quote, setQuote] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [comm, setComm] = useState<any>(null);
  const [view, setView] = useState<View>("1d");
  const [candles, setCandles] = useState<{ o?: number[]; h?: number[]; l?: number[]; c?: number[]; t?: number[] }>({});
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [chart, setChart] = useState<any>(null);
  const [marketOpen, setMarketOpen] = useState(false);

  // Check if market is open (US stock market: Mon-Fri 9:30 AM - 4:00 PM ET)
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      // Convert to ET timezone
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = etTime.getDay();
      const hours = etTime.getHours();
      const minutes = etTime.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      // Market open: Monday (1) - Friday (5), 9:30 AM (570 min) - 4:00 PM (960 min)
      const isOpen = day >= 1 && day <= 5 && currentMinutes >= 570 && currentMinutes < 960;
      setMarketOpen(isOpen);
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch core data
  useEffect(() => {
    (async () => {
      try {
        const [q, prof, metr, c] = await Promise.all([
          getQuote(symbol),
          getProfile(symbol),
          getMetrics(symbol),
          communitySentiment(symbol).catch(() => null),
        ]);
        if (q && q.ok !== false) setQuote(q);
        if (prof && prof.ok !== false) setProfile(prof);
        if (metr && metr.metric) setMetrics(metr.metric);
        if (c) setComm(c);
      } catch (e) {
        console.error("Error fetching stock data:", e);
      }
    })();
  }, [symbol]);

  // Fetch candles
  useEffect(() => {
    (async () => {
      try {
        const req = VIEW_TO_REQ(view);
        const cndl = await getCandles(symbol, req.resolution, req.count);
        if (cndl && Array.isArray(cndl.c)) {
          setCandles(cndl);
        } else {
          setCandles({});
        }
      } catch (e) {
        console.error("Error fetching candles:", e);
        setCandles({});
      }
    })();
  }, [symbol, view]);

  // Fetch news
  useEffect(() => {
    (async () => {
      try {
        const items = await getNews(symbol, 8);
        setNews(items ?? []);
      } catch (e) {
        console.error("Error fetching news:", e);
        setNews([]);
      }
    })();
  }, [symbol]);

  // Initialize or update chart
  useEffect(() => {
    const initChart = () => {
      if (!candles.c || candles.c.length === 0) return;
      
      const ctx = document.getElementById("stockChart") as HTMLCanvasElement;
      if (!ctx) return;

      const chartLib = (window as any).Chart;
      if (!chartLib) {
        console.error("Chart.js not loaded");
        return;
      }

      try {
        // Get current theme
        const theme = document.documentElement.getAttribute("data-theme") || "dark";
        const isDark = theme === "dark";
        
        const tickColor = isDark ? "#a0a0c0" : "#666666";
        const gridColor = isDark ? "rgba(102, 126, 234, 0.1)" : "rgba(102, 126, 234, 0.05)";
        
        // Destroy existing chart if it exists
        if (chart) {
          chart.destroy();
        }

        const newChart = new chartLib(ctx, {
          type: "line",
          data: {
            labels: (candles.t || []).map((t: number) => new Date(t * 1000).toLocaleDateString()),
            datasets: [
              {
                label: symbol,
                data: candles.c,
                borderColor: "#667eea",
                backgroundColor: "rgba(102, 126, 234, 0.1)",
                tension: 0.1,
                fill: true,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                spanGaps: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
                titleColor: isDark ? "#fff" : "#000",
                bodyColor: isDark ? "#fff" : "#000",
                borderColor: isDark ? "#2d2d44" : "#e5e5e7",
              },
            },
            scales: {
              y: { 
                beginAtZero: false,
                ticks: {
                  color: tickColor,
                },
                grid: {
                  color: gridColor,
                },
              },
              x: {
                ticks: {
                  color: tickColor,
                },
                grid: {
                  color: gridColor,
                },
              },
            },
          },
        });
        setChart(newChart);
      } catch (e) {
        console.error("Error initializing chart:", e);
      }
    };

    // Small delay to ensure Chart.js is loaded
    const timer = setTimeout(initChart, 100);
    return () => clearTimeout(timer);
  }, [candles, view, chart]);

  const q = quote || {};
  const c = comm || {};
  const isPositive = (q.dp ?? 0) >= 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>📈</div>
          <h1>Stock Lens</h1>
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.marketStatus}>
            <span className={`${styles.statusDot} ${marketOpen ? styles.statusOpen : styles.statusClosed}`}></span>
            <span id="market-status">{marketOpen ? "Market Open" : "Market Closed"}</span>
          </div>
          <div className={styles.lastUpdate}>
            Last updated: <span id="last-update">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          {/* Stock Info Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.stockSymbol}>{symbol}</h2>
              <div className={styles.stockPrice}>
                <span>${q.c ?? "—"}</span>
                <span className={`${styles.stockChange} ${isPositive ? styles.positive : styles.negative}`}>
                  {isPositive ? "▲" : "▼"} {typeof q.dp === "number" ? `${q.dp.toFixed(2)}%` : "—"}
                </span>
              </div>
            </div>
            <div className={styles.stockDetails}>
              <div>Open: <b>${q.o ?? "—"}</b></div>
              <div>High: <b>${q.h ?? "—"}</b></div>
              <div>Low: <b>${q.l ?? "—"}</b></div>
              <div>Prev Close: <b>${q.pc ?? "—"}</b></div>
            </div>
          </section>

          {/* Chart Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 id="chart-title">{symbol} Price Chart</h2>
              <div className={styles.timeRange}>
                {(["1d", "5d", "1mo", "1y"] as View[]).map((v) => (
                  <button
                    key={v}
                    className={`${styles.rangeBtn} ${view === v ? styles.active : ""}`}
                    onClick={() => setView(v)}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.chartContainer}>
              <canvas id="stockChart"></canvas>
            </div>
          </section>

          {/* News Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Market News</h2>
            </div>
            <div className={styles.newsContainer}>
              {news.length === 0 ? (
                <div className={styles.loading}>Loading news...</div>
              ) : (
                news.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.newsItem}
                  >
                    <div className={styles.newsTitle}>{a.title}</div>
                    {a.description && (
                      <div className={styles.newsDescription}>{a.description}</div>
                    )}
                    <div className={styles.newsMeta}>
                      <span>{a.source || "News"}</span>
                      <span>{formatNewsDate(a.publishedAt)}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          {/* Company Info */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Company</h2>
            </div>
            <div className={styles.companyInfo}>
              <div className={styles.companyName}>
                {profile?.name || profile?.ticker || symbol}
              </div>
              <div className={styles.companyDetails}>
                <div>{profile?.exchange} · {profile?.currency}</div>
                <div>{profile?.finnhubIndustry}</div>
                {profile?.country && <div>📍 {profile.country}</div>}
              </div>
              {profile?.weburl && (
                <a href={profile.weburl} target="_blank" rel="noreferrer" className={styles.link}>
                  Visit Website →
                </a>
              )}
            </div>
          </section>

          {/* Key Metrics */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Key Metrics</h2>
            </div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.label}>Market Cap</span>
                <span className={styles.value}>
                  {metrics?.marketCapitalization
                    ? `$${(metrics.marketCapitalization / 1_000_000_000).toFixed(2)}B`
                    : "—"}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>52W High</span>
                <span className={styles.value}>
                  ${metrics?.["52WeekHigh"]?.toFixed(2) || "—"}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>52W Low</span>
                <span className={styles.value}>
                  ${metrics?.["52WeekLow"]?.toFixed(2) || "—"}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>P/E Ratio</span>
                <span className={styles.value}>
                  {metrics?.peBasicExclExtraTTM?.toFixed(2) || "—"}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>EPS (TTM)</span>
                <span className={styles.value}>
                  ${metrics?.epsBasicExclExtraItemsTTM?.toFixed(2) || "—"}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Revenue (TTM)</span>
                <span className={styles.value}>
                  ${(metrics?.revenueTTM / 1_000_000_000)?.toFixed(2) || "—"}B
                </span>
              </div>
            </div>
          </section>

          {/* Community Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Community</h2>
            </div>
            <div className={styles.communityInfo}>
              <div className={styles.sentimentScore}>
                <div className={styles.scoreLabel}>Sentiment Score</div>
                <div className={styles.scoreValue}>
                  {typeof c.score === "number" ? (c.score * 100).toFixed(0) : "—"}%
                </div>
              </div>
              <div className={styles.scoreBar}>
                <div
                  className={styles.scoreBarFill}
                  style={{
                    width: `${((c.score ?? 0) + 1) * 50}%`,
                  }}
                ></div>
              </div>
              <button
                className={styles.communityBtn}
                onClick={() => nav(`/community?symbol=${symbol}`)}
              >
                View Community Threads →
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
