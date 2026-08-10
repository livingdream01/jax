import https from "https";

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "APEX/1.0" }, rejectUnauthorized: false }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

export interface TickerInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  high?: number;
  low?: number;
  volume?: number;
}

// Yahoo Finance v8 chart API (no key needed)
export async function getStock(symbol: string): Promise<TickerInfo | null> {
  try {
    const safe = symbol.toUpperCase().trim();
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${safe}?interval=1d&range=1d`;
    const data = await fetchJSON(url);
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const price = meta.regularMarketPrice;
    const change = prevClose ? +(price - prevClose).toFixed(2) : 0;
    const changePercent = prevClose ? +((price - prevClose) / prevClose * 100).toFixed(2) : 0;
    return {
      symbol: safe,
      name: meta.shortName || safe,
      price,
      change,
      changePercent,
      currency: meta.currency || "USD",
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
    };
  } catch {
    return null;
  }
}

export async function getCrypto(coinId: string): Promise<TickerInfo | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId.toLowerCase().trim()}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const data = await fetchJSON(url);
    const m = data?.market_data;
    if (!m) return null;
    return {
      symbol: (data.symbol || coinId).toUpperCase(),
      name: data.name || coinId,
      price: m.current_price?.usd,
      change: +(m.price_change_24h_in_currency?.usd || 0).toFixed(2),
      changePercent: +(m.price_change_percentage_24h_in_currency?.usd || 0).toFixed(2),
      high: m.high_24h?.usd,
      low: m.low_24h?.usd,
      volume: m.total_volume?.usd,
    };
  } catch {
    return null;
  }
}

// Coin name/resolution (e.g. "bitcoin" → "bitcoin", "BTC" → "bitcoin")
const CRYPTO_MAP: Record<string, string> = {
  btc: "bitcoin", eth: "ethereum", xrp: "ripple", sol: "solana", ada: "cardano",
  doge: "dogecoin", dot: "polkadot", avax: "avalanche-2", matic: "polygon",
  link: "chainlink", uni: "uniswap", shib: "shiba-inu", ltc: "litecoin",
  atom: "cosmos", near: "near", usdc: "usdc", usdt: "tether", bnb: "binancecoin",
};

export function resolveCryptoId(input: string): string {
  return CRYPTO_MAP[input.toLowerCase().trim()] || input.toLowerCase().trim();
}

export function formatTicker(t: TickerInfo): string {
  const arrow = t.change > 0 ? "▲" : t.change < 0 ? "▼" : "—";
  const pct = t.changePercent >= 0 ? `+${t.changePercent}` : `${t.changePercent}`;
  let out = `**${t.name} (${t.symbol})** — $${t.price.toLocaleString()} ${arrow} ${pct}%\n`;
  if (t.high) out += `  High: $${t.high.toLocaleString()}  Low: $${t.low?.toLocaleString()}`;
  if (t.volume) out += `  Vol: ${t.volume.toLocaleString()}`;
  return out;
}