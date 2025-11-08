// client/src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuote, getCandles, getProfile } from "../api/stocks";
import { communitySentiment } from "../api/community";
import { searchSymbols } from "../api/stocks";
import Spark from "../components/Spark";

const DEFAULTS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "NFLX"];
const LS_KEY = "stocklens_custom_universe";
const CHUNK = 8;

type Row = {
  symbol: string;
  name?: string;            // <-- company name
  price?: number;
  changePct?: number;
  candles?: number[];
  communityScore?: number;
};

export default function Dashboard() {
  const nav = useNavigate();

  const [custom, setCustom] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean).map((s) => s.toUpperCase()) : [];
    } catch {
      return [];
    }
  });

  const universe = useMemo(() => [...DEFAULTS, ...custom], [custom]);
  const [visible, setVisible] = useState<number>(CHUNK);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>(universe.map((s) => ({ symbol: s })));

  useEffect(() => {
    setRows(universe.map((s) => ({ symbol: s })));
  }, [universe]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const take = Math.min(universe.length, visible + 8);
      const symbols = universe.slice(0, take);

      const updated: Row[] = [];
      for (const symbol of symbols) {
        try {
          const [q, cds, prof, comm] = await Promise.all([
            getQuote(symbol),
            getCandles(symbol, "D", 90),
            getProfile(symbol).catch(() => null),   // <-- grab company name
            communitySentiment(symbol).catch(() => null),
          ]);

          updated.push({
            symbol,
            name: prof?.name || prof?.ticker || undefined,
            price: typeof q?.c === "number" ? q.c : undefined,
            changePct: typeof q?.dp === "number" ? q.dp : undefined,
            candles: Array.isArray(cds?.c) ? cds.c : [],
            communityScore: typeof comm?.score === "number" ? comm.score : 0,
          });
        } catch {
          updated.push({
            symbol,
            name: undefined,
            price: undefined,
            changePct: undefined,
            candles: [],
            communityScore: 0,
          });
        }
      }

      if (!cancelled) {
        setRows((prev) => {
          const map = new Map(prev.map((r) => [r.symbol, r]));
          for (const r of updated) map.set(r.symbol, { ...map.get(r.symbol), ...r });
          return universe.map((s) => map.get(s) ?? { symbol: s });
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [universe, visible]);

  async function handleAddSymbol(input: string) {
    const q = (input || "").trim();
    if (!q) return;

    const typedUpper = q.toUpperCase();
    if (universe.includes(typedUpper)) {
      setQuery("");
      const idx = universe.indexOf(typedUpper);
      if (idx >= 0) setVisible((v) => Math.max(v, Math.ceil((idx + 1) / CHUNK) * CHUNK));
      return;
    }

    const res = await searchSymbols(q);
    const list = res?.result || [];
    if (!list.length) {
      setQuery("");
      return;
    }

    const upperQ = q.toUpperCase();
    const exact = list.find((r: any) => (r.symbol || "").toUpperCase() === upperQ);
    const usish = list.find((r: any) => {
      const blob = `${r.description || ""} ${r.displaySymbol || ""} ${r.symbol || ""}`;
      return /NYSE|NASDAQ|NMS|USA|US\b/i.test(blob);
    });
    const picked = (exact?.symbol || usish?.symbol || list[0].symbol || "").toUpperCase();
    if (!picked) {
      setQuery("");
      return;
    }

    if (universe.includes(picked)) {
      setQuery("");
      const idx = universe.indexOf(picked);
      if (idx >= 0) setVisible((v) => Math.max(v, Math.ceil((idx + 1) / CHUNK) * CHUNK));
      return;
    }

    const next = [...custom, picked];
    setCustom(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setQuery("");

    const idx = [...DEFAULTS, ...next].indexOf(picked);
    if (idx >= 0) setVisible((v) => Math.max(v, Math.ceil((idx + 1) / CHUNK) * CHUNK));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleAddSymbol(query);
  }

  return (
    <div>
      {/* Title + search (unchanged) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>StockLens</h1>
        <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            style={{ width: 300, padding: "6px 8px" }}
            placeholder="Search: Apple or AAPL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <div style={{ marginLeft: "auto" }}>
          {visible < universe.length && (
            <button onClick={() => setVisible((v) => Math.min(universe.length, v + CHUNK))}>
              Load more
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
          gap: 24,
        }}
      >
        {rows.slice(0, visible).map((r) => {
          const price = r.price !== undefined ? r.price : "—";
          const chg = r.changePct !== undefined ? `${r.changePct.toFixed(2)}%` : "—";
          const scorePct = ((r.communityScore ?? 0) * 100).toFixed(0);

          return (
            <div
              key={r.symbol}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 20,
                background: "#fff",
                boxShadow: "0 1px 6px rgba(0,0,0,.05)",
                minHeight: 170,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: 22 }}>{r.symbol}</strong>
                  {/* Company name under the symbol */}
                  {r.name && (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{r.name}</div>
                  )}
                </div>
                <button onClick={() => nav(`/stock/${r.symbol}`)}>Open</button>
              </div>

              <div style={{ display: "flex", gap: 18, marginTop: 6, alignItems: "center" }}>
                <div>
                  <div>
                    Price: <b>{price}</b>
                  </div>
                  <div>
                    Change: <b>{chg}</b>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    Community score: <b>{scorePct}</b>
                  </div>
                  <div
                    style={{
                      height: 6,
                      width: 280,
                      background: "#eee",
                      borderRadius: 4,
                      overflow: "hidden",
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        width: `${((r.communityScore ?? 0) + 1) * 50}%`,
                        height: "100%",
                        background: "#7cbf84",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginLeft: "auto" }}>
                  <Spark values={r.candles || []} width={150} height={110} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visible < universe.length && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => setVisible((v) => Math.min(universe.length, v + CHUNK))}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
