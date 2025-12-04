// Simple store to track the last leaderboard API call timeframe
// This allows UserProfileModal to automatically use the same timeframe
// that was used in the last leaderboard API call

type LeaderboardTimeframe = "day" | "week" | "month" | "all";
type ModalTimeframe = "1D" | "1W" | "1M" | "ALL";

let lastLeaderboardTimeframe: LeaderboardTimeframe | null = null;

export function setLastLeaderboardTimeframe(timeframe: LeaderboardTimeframe) {
  lastLeaderboardTimeframe = timeframe;
  console.log('[lastLeaderboardTimeframe] Updated to:', timeframe);
}

export function getLastLeaderboardTimeframe(): LeaderboardTimeframe | null {
  return lastLeaderboardTimeframe;
}

export function getLastLeaderboardTimeframeAsModal(): ModalTimeframe | null {
  if (!lastLeaderboardTimeframe) return null;
  
  const mapping: Record<LeaderboardTimeframe, ModalTimeframe> = {
    day: "1D",
    week: "1W",
    month: "1M",
    all: "ALL"
  };
  
  return mapping[lastLeaderboardTimeframe];
}

