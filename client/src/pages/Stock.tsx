import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuote, getCandles, getProfile, getMetrics } from "../api/stocks";
import { communitySentiment } from "../api/community";
import BigChart from "../components/BigChart";
import { getNews, Article as NewsArticle } from "../api/news";

type View = "1D" | "5D" | "1M" | "6M";

const VIEW_TO_REQ = (v: View) => {
  switch (v) {
    case "1D": return { resolution: "60" as const, count: 8 };         // ~8 trading hours
    case "5D": return { resolution: "60" as const, count: 40 };        // 5 * 8h
    case "1M": return { resolution: "D"  as const, count: 30 };
    case "6M": return { resolution: "D"  as const, count: 180 };
  }
};

// put this near the top of Stock.tsx (or inside the component before return)
function formatNewsDate(d?: string | number | null) {
  if (!d) return "";
  if (typeof d === "number") {
    // epoch seconds -> ms
    return new Date(d * 1000).toLocaleDateString();
  }
  // ISO string
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

  const [view, setView] = useState<View>("1D");
  const [candles, setCandles] = useState<number[]>([]);
  const [times, setTimes] = useState<number[]>([]);

  const [news, setNews] = useState<NewsArticle[]>([]);

  // core (doesn't depend on view)
  useEffect(() => {
    (async () => {
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
    })();
  }, [symbol]);

  // candles (depends on view)
  useEffect(() => {
    (async () => {
      const req = VIEW_TO_REQ(view);
      const cndl = await getCandles(symbol, req.resolution, req.count);
      if (cndl && Array.isArray(cndl.c)) {
        setCandles(cndl.c);
        setTimes(Array.isArray(cndl.t) ? cndl.t : []);
      } else {
        setCandles([]);
        setTimes([]);
      }
    })();
  }, [symbol, view]);

  // news
  useEffect(() => {
    (async () => {
      const items = await getNews(symbol, 8);
      setNews(items ?? []);
    })();
  }, [symbol]);

  const q = quote || {};
  const c = comm || {};
  const pretty = (n: any, d = 2) => (typeof n === "number" && isFinite(n) ? n.toFixed(d) : "—");
  const capB = (n: any) => (typeof n === "number" && isFinite(n) && n > 0 ? (n / 1_000_000_000).toFixed(2) : "—");

  const ResButton = ({ v }: { v: View }) => (
    <button
      onClick={() => setView(v)}
      style={{
        marginLeft: 8,
        padding: "4px 8px",
        border: "1px solid #ccc",
        borderRadius: 6,
        background: view === v ? "#eee" : "#fff",
        fontWeight: view === v ? 700 : 400,
      }}
    >
      {v}
    </button>
  );

  return (
      <div>
        <h1>{symbol} — Stats</h1>

        <div style={{display:"grid", gridTemplateColumns:"1.35fr .65fr", gap:16, alignItems:"start"}}>
          {/* left column */}
          <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, background:"#fff"}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <h3 style={{margin:0}}>Price</h3>
              <div>
                <ResButton v="1D" />
                <ResButton v="5D" />
                <ResButton v="1M" />
                <ResButton v="6M" />
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div>Last: <b>{q.c ?? "—"}</b></div>
              <div>Change: <b>{typeof q.dp==='number' ? `${q.dp.toFixed(2)}%` : "—"}</b></div>
              <div>Open / High / Low: {q.o ?? "—"} / {q.h ?? "—"} / {q.l ?? "—"}</div>
              <div>Prev Close: {q.pc ?? "—"}</div>
            </div>

            <BigChart
              values={candles}
              times={times}
              width={980}
              height={340}
              resolution={VIEW_TO_REQ(view).resolution}
            />

            {/* news */}
            <div style={{ marginTop: 18, borderTop: "1px solid #eee", paddingTop: 12 }}>
              <h3 style={{ margin: "0 0 10px 0" }}>Latest news</h3>
              {news.length === 0 ? (
                <div style={{ color: "#666" }}>No recent articles.</div>
              ) : (
                <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12}}>
                  {news.map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer" style={{textDecoration:"none", color:"inherit"}}>
                      <div style={{border:"1px solid #ddd", borderRadius:10, overflow:"hidden", background:"#fff", height:"100%", display:"flex", flexDirection:"column"}}>
                        {a.image && (
                          <img src={a.image} alt="" loading="lazy" style={{ width:"100%", height:140, objectFit:"cover" }} />
                        )}
                        <div style={{ padding:10, display:"flex", flexDirection:"column", gap:6 }}>
                          <div style={{ fontSize:12, color:"#666" }}>
                            {a.source || "News"}
                            {a.publishedAt ? ` · ${formatNewsDate(a.publishedAt)}` : ""}
                          </div>
                          <div style={{ fontWeight:600, lineHeight:1.2 }}>{a.title}</div>
                          {a.description && <div style={{ fontSize:13, color:"#444" }}>{a.description}</div>}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* right column */}
          <div style={{display:"grid", gap:16}}>
            <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, background:"#fff"}}>
              <h3>Company</h3>
              <div><b>{profile?.name || profile?.ticker || symbol}</b></div>
              <div>{profile?.exchange} · {profile?.currency}</div>
              <div>{profile?.finnhubIndustry}</div>
              {profile?.country && <div>Country: {profile.country}</div>}
              {profile?.weburl && <div style={{marginTop:6}}><a href={profile.weburl} target="_blank">Website ↗</a></div>}
            </div>

            <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, background:"#fff"}}>
              <h3>Key Metrics</h3>
              <div>Market Cap: <b>{capB(metrics?.marketCapitalization)}</b> B</div>
              <div>52W High / Low: <b>{pretty(metrics?.["52WeekHigh"])}</b> / <b>{pretty(metrics?.["52WeekLow"])}</b></div>
              <div>PE (TTM): <b>{pretty(metrics?.peBasicExclExtraTTM)}</b></div>
              <div>EPS (TTM): <b>{pretty(metrics?.epsBasicExclExtraItemsTTM)}</b></div>
              <div>Revenue (TTM): <b>{capB(metrics?.revenueTTM)}</b> B</div>
              <div>Net Margin (TTM): <b>{pretty(metrics?.netProfitMarginTTM)}</b></div>
            </div>

            <div style={{border:"1px solid #ddd", borderRadius:12, padding:12, background:"#fff"}}>
              <h3>Community</h3>
              <div>Score: <b>{typeof c.score==='number' ? (c.score*100).toFixed(0) : "—"}</b></div>
              <div style={{height:8, background:"#eee", borderRadius:4, overflow:"hidden", marginTop:4}}>
                <div style={{width:`${((c.score??0)+1)*50}%`, height:"100%", background:"#7cbf84"}} />
              </div>
              <button style={{marginTop:12}} onClick={()=>nav(`/community?symbol=${symbol}`)}>Open Community</button>
            </div>
          </div>
        </div>
      </div>
  );
}
