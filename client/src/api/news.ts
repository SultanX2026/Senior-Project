// client/src/api/news.ts
export type Article = {
  title: string;
  url: string;
  image?: string | null;
  source?: string;
  publishedAt?: number | string | null;
  description?: string | null;
};

export async function getNews(symbol: string, limit = 8): Promise<Article[]> {
  const q = new URLSearchParams({ symbol, limit: String(limit) });
  const res = await fetch(`/api/news?${q.toString()}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.articles) ? data.articles : [];
}
