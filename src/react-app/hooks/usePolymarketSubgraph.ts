import { useState, useEffect } from "react";

export interface PolymarketSubgraphMarket {
  id: string;
  title: string;
  category: string;
  slug: string;
  image: string;
  description: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  volumeNum?: number;
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
  topOutcomes?: Array<{ name: string; price: number }>;
  isYesNo?: boolean;
  active: boolean;
}

export interface PolymarketSubgraphResponse {
  success: boolean;
  markets: PolymarketSubgraphMarket[];
  total: number;
  error?: string;
}

      export function usePolymarketSubgraphMarkets(options?: {
        limit?: number;
        category?: string;
        search?: string;
        timePeriod?: string;
        marketType?: string;
        offset?: number;
        featured?: boolean;
        new?: boolean;
        tagSlug?: string;
      }) {
  const [data, setData] = useState<PolymarketSubgraphMarket[]>([]);
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
            if (options?.offset) {
              params.set("offset", options.offset.toString());
            }
            if (options?.tagSlug) {
              params.set("tagSlug", options.tagSlug);
            }

      console.log("Fetching markets from subgraph with params:", params.toString());
      const response = await fetch(`/api/polymarket/markets-subgraph?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Subgraph API response not OK:", response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const result: PolymarketSubgraphResponse = await response.json();
      console.log("Received subgraph markets:", result.success, result.total, "markets array length:", result.markets?.length);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch markets from subgraph");
      }

      setData(result.markets || []);
    } catch (err) {
      console.error("Error fetching markets from subgraph:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.limit, options?.category, options?.search, options?.timePeriod, options?.marketType, options?.tagSlug]);

  return {
    data,
    loading,
    error,
    refetch: fetchMarkets,
    total: data.length
  };
}

