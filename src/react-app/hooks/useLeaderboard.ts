import { useState, useEffect } from "react";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  address: string;
  totalVolume: number;
  totalProfit: number;
  accuracy: number;
  marketsTraded: number;
  winStreak: number;
  avatar?: string;
  totalTrades: number;
  avgPositionSize: number;
  roiPercentage: number;
  activeMarkets: number;
  lastActiveDate: string;
}

export type LeaderboardTimeframe = "day" | "week" | "month" | "all";
export type LeaderboardSortBy = "rank" | "volume" | "profit" | "accuracy" | "winStreak" | "roi";

interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  timeframe: string;
  total: number;
  error?: string;
}

export function useLeaderboard(timeframe: LeaderboardTimeframe = "all", limit: number = 50) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/polymarket/leaderboard?timeframe=${timeframe}&limit=${limit}`;
      console.log(`[useLeaderboard] Fetching leaderboard for timeframe: ${timeframe}`, url);
      
      const response = await fetch(url);
      const result: LeaderboardResponse = await response.json();
      
      console.log(`[useLeaderboard] Response for ${timeframe}:`, {
        success: result.success,
        count: result.leaderboard?.length || 0,
        timeframe: result.timeframe
      });
      
      if (result.success) {
        setData(result.leaderboard);
      } else {
        setError(result.error || "Failed to fetch leaderboard");
      }
    } catch (err) {
      console.error(`[useLeaderboard] Error for timeframe ${timeframe}:`, err);
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, limit]);

  const sortData = (sortBy: LeaderboardSortBy): LeaderboardEntry[] => {
    return [...data].sort((a, b) => {
      switch (sortBy) {
        case "volume":
          return b.totalVolume - a.totalVolume;
        case "profit":
          return b.totalProfit - a.totalProfit;
        case "accuracy":
          return b.accuracy - a.accuracy;
        case "winStreak":
          return b.winStreak - a.winStreak;
        case "roi":
          return b.roiPercentage - a.roiPercentage;
        case "rank":
        default:
          return a.rank - b.rank;
      }
    });
  };

  return {
    data,
    loading,
    error,
    sortData,
    refresh: fetchLeaderboard
  };
}
