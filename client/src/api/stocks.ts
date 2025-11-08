import client from "./client";

/** --- API response types (minimal, just what we use) --- */
export type Quote = {
  ok: boolean;
  c?: number;  d?: number;  dp?: number;
  h?: number;  l?: number;  o?: number;  pc?: number;
  t?: number;
};

export type Candles = {
  ok: boolean;
  s: string;
  symbol: string;
  t: number[]; c: number[]; o: number[]; h: number[]; l: number[];
  meta?: { source?: string; resolution?: string; from?: number; to?: number; count?: number; };
};

export type LookupItem = {
  symbol: string;
  description?: string;
  displaySymbol?: string;
  type?: string;
};



export type Profile = { ok: boolean; ticker?: string; name?: string; exchange?: string; currency?: string; };
export type Metrics = { ok: boolean; metric?: Record<string, unknown>; };

/** Generic safe GET that preserves the type of data */
async function safeGet<T>(url: string, params: any = {}): Promise<T | null> {
  try {
    const res = await client.get(url, { params });
    return (res.data as T) ?? null;
  } catch {
    return null;
  }
}

/** Typed API helpers */
export const getQuote   = (symbol: string) => safeGet<Quote>("/stocks/quote", { symbol });
export const getCandles = (symbol: string, resolution: "D" | "W" | "M" | "60" = "D", count = 180) =>
  safeGet<Candles>("/stocks/candles", { symbol, resolution, count });
export const getProfile = (symbol: string) => safeGet<Profile>("/stocks/profile", { symbol });
export const getMetrics = (symbol: string) => safeGet<Metrics>("/stocks/metrics", { symbol });
export const searchSymbols = (q: string) =>
  safeGet<{ ok: boolean; result: LookupItem[] }>("/stocks/lookup", { q });

