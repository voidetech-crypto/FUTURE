import { useState, useEffect, useCallback } from "react";

export interface PolymarketMarket {
  id: string;
  title: string;
  category: string;
  slug: string;
  image: string;
  description: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  volumeNum?: number; // Numeric volume for sorting
  change: string;
  trending: boolean;
  endDate: string;
  liquidity: string;
  lastPrice: number;
  bestBid: number;
  bestAsk: number;
  hourlyChange: string;
  weeklyChange: string;
  monthlyChange: string;
  outcomes: string[];
  topOutcomes?: Array<{ name: string; price: number }>; // Top 2 outcomes with prices
  isYesNo?: boolean; // Whether this is a Yes/No market
  active: boolean;
  resolverWallet?: string; // Resolver wallet address
}

export interface PolymarketResponse {
  success: boolean;
  markets: PolymarketMarket[];
  total: number;
  error?: string;
}

export function usePolymarketMarkets(options?: {
  limit?: number;
  category?: string;
  search?: string;
  timePeriod?: string;
  marketType?: string;
}) {
  const [data, setData] = useState<PolymarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      // Limit to prevent memory issues - allow up to 500 for showing all markets
      const limit = options?.limit ? Math.min(options.limit, 500) : 200;
      params.set("limit", limit.toString());
      if (options?.category && options.category !== "all" && options.category !== "All") params.set("category", options.category);
      if (options?.search) params.set("search", options.search);
      if (options?.timePeriod) params.set("timePeriod", options.timePeriod);
      if (options?.marketType) params.set("marketType", options.marketType);

      console.log("Fetching markets with params:", params.toString());
      const response = await fetch(`/api/polymarket/markets?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response not OK:", response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const result: PolymarketResponse = await response.json();
      console.log("Received markets:", result.success, result.total, "markets array length:", result.markets?.length);
      
      if (result.markets && result.markets.length > 0) {
        console.log("First market sample:", {
          id: result.markets[0].id,
          title: result.markets[0].title,
          yesPrice: result.markets[0].yesPrice,
          noPrice: result.markets[0].noPrice
        });
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch markets");
      }

      setData(result);
    } catch (err) {
      console.error("Error fetching markets:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData({ success: false, markets: [], total: 0, error: err instanceof Error ? err.message : "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.limit, options?.category, options?.search, options?.timePeriod, options?.marketType]);

  return {
    data: data?.markets || [],
    loading,
    error,
    refetch: fetchMarkets,
    total: data?.total || 0
  };
}

export function usePolymarketMarket(marketId: string) {
  const [market, setMarket] = useState<PolymarketMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[usePolymarketMarket] Fetching market with ID: ${marketId}`);
      const response = await fetch(`/api/polymarket/markets/${marketId}`);
      console.log(`[usePolymarketMarket] Response status: ${response.status}`);
      
      const result = await response.json();
      console.log(`[usePolymarketMarket] Response success: ${result.success}`);
      console.log(`[usePolymarketMarket] Response market keys:`, result.market ? Object.keys(result.market) : []);
      console.log(`[usePolymarketMarket] Response market topOutcomes:`, result.market?.topOutcomes?.length || 0);

      if (!result.success) {
        console.error(`[usePolymarketMarket] API returned error:`, result.error);
        throw new Error(result.error || "Failed to fetch market");
      }

      console.log(`[usePolymarketMarket] Setting market data:`, {
        id: result.market?.id,
        title: result.market?.title,
        topOutcomesCount: result.market?.topOutcomes?.length,
        outcomesCount: result.market?.outcomes?.length
      });
      setMarket(result.market);
    } catch (err) {
      console.error(`[usePolymarketMarket] Error fetching market:`, err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setMarket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (marketId) {
      fetchMarket();
    }
  }, [marketId]);

  return {
    market,
    loading,
    error,
    refetch: fetchMarket
  };
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  date: string;
}

export function usePolymarketPriceHistory(marketId: string, interval: string, tokenId?: string) {
  const [history, setHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[usePolymarketPriceHistory] Fetching history for marketId: ${marketId}, interval: ${interval}, tokenId: ${tokenId || 'not provided'}`);

      const params = new URLSearchParams();
      params.set("interval", interval);
      if (tokenId) {
        params.set("tokenId", tokenId);
      }

      const response = await fetch(`/api/polymarket/markets/${marketId}/history?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch price history");
      }

      console.log(`[usePolymarketPriceHistory] Received ${result.history?.length || 0} history points`);
      setHistory(result.history || []);
    } catch (err) {
      console.error(`[usePolymarketPriceHistory] Error:`, err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (marketId) {
      fetchHistory();
    }
  }, [marketId, interval, tokenId]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  };
}

export function usePolymarketCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/polymarket/categories");
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch categories");
        }

        setCategories(result.categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error
  };
}

export interface PlatformStats {
  volume24hr: string;
  volume24hrNum: number;
  activeMarkets: number;
  totalLiquidity: string;
  totalLiquidityNum: number;
}

const STATS_CACHE_KEY = 'polymarket_stats_cache';
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function usePolymarketStats() {
  const [stats, setStats] = useState<PlatformStats | null>(() => {
    // Try to load from cache on mount
    try {
      const cached = localStorage.getItem(STATS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < STATS_CACHE_TTL) {
          return data;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/polymarket/stats");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch platform stats");
      }

      // Cache the stats
      try {
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({
          data: result.stats,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore cache errors
      }

      setStats(result.stats);
    } catch (err) {
      console.error("Error fetching platform stats:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      const fallbackStats = {
        volume24hr: "$0",
        volume24hrNum: 0,
        activeMarkets: 0,
        totalLiquidity: "$0",
        totalLiquidityNum: 0
      };
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if we don't have cached data or cache is stale
    const cached = localStorage.getItem(STATS_CACHE_KEY);
    let refreshInterval: NodeJS.Timeout | null = null;
    let initialTimeout: NodeJS.Timeout | null = null;
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < STATS_CACHE_TTL) {
          setStats(data);
          setLoading(false);
          // Set up refresh when cache expires
          const timeUntilExpiry = STATS_CACHE_TTL - (Date.now() - timestamp);
          initialTimeout = setTimeout(() => {
            fetchStats();
            refreshInterval = setInterval(fetchStats, STATS_CACHE_TTL);
          }, Math.max(0, timeUntilExpiry));
          
          return () => {
            if (initialTimeout) clearTimeout(initialTimeout);
            if (refreshInterval) clearInterval(refreshInterval);
          };
        }
      } catch (e) {
        // If cache parse fails, fetch fresh data
      }
    }
    
    // Fetch if no cache or cache is stale
    fetchStats();
    // Refresh stats every 5 minutes
    refreshInterval = setInterval(fetchStats, STATS_CACHE_TTL);
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}
