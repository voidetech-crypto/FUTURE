import { useState } from "react";
import { Card } from "@/react-app/components/ui/Card";
import { UserProfileModal } from "@/react-app/components/ui/UserProfileModal";
import { User } from "lucide-react";
import { useLeaderboard, LeaderboardSortBy, LeaderboardTimeframe } from "@/react-app/hooks/useLeaderboard";

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>("profit");
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>("day");
  const [selectedUser, setSelectedUser] = useState<{ address: string; username: string } | null>(null);
  const { data, loading, error, sortData } = useLeaderboard(timeframe, 50);

  const handleUserClick = (trader: any) => {
    setSelectedUser({
      address: trader.address,
      username: trader.username
    });
  };

  const formatCurrency = (amount: number | string) => {
    // Handle string inputs (like "MOCKDATA")
    if (typeof amount === 'string') {
      return amount;
    }
    
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  };

  const formatPercentage = (value: number | string) => {
    // Handle string inputs (like "MOCKDATA")
    if (typeof value === 'string') {
      return value;
    }
    return `${value.toFixed(1)}%`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-sm font-medium text-yellow-500">#{rank}</span>;
      case 2:
        return <span className="text-sm font-medium text-gray-400">#{rank}</span>;
      case 3:
        return <span className="text-sm font-medium text-amber-600">#{rank}</span>;
      default:
        return <span className="text-sm font-medium text-gray-400">#{rank}</span>;
    }
  };

  const sortedData = sortData(sortBy);
  // Skip first 3 entries for the table (they're shown in the podium)
  const tableData = sortedData.slice(3);

  if (loading) {
    return (
      <div className="h-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .leaderboard-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .leaderboard-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .leaderboard-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }
        .leaderboard-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .leaderboard-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 #1a1a1a;
        }
      `}</style>
      <div className="h-full bg-[#0a0a0a] overflow-y-auto leaderboard-scrollbar">
      <div className="px-4 py-3 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <h1 className="text-2xl font-medium text-white -mt-[1px]">Polymarket Leaderboard</h1>
            </div>
          </div>

          

          {/* Time Period Selector */}
          <div className="flex flex-wrap gap-4 items-center mb-5">
            <div className="flex gap-2">
              <span className="text-sm text-gray-400">Timeframe:</span>
              {[
                { value: "day" as LeaderboardTimeframe, label: "24H" },
                { value: "week" as LeaderboardTimeframe, label: "7D" },
                { value: "month" as LeaderboardTimeframe, label: "30D" },
                { value: "all" as LeaderboardTimeframe, label: "All Time" }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTimeframe(period.value)}
                  className={`px-3 py-1 text-xs transition-colors rounded-full ${
                    timeframe === period.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              {[
                { key: "profit" as LeaderboardSortBy, label: "Profit" },
                { key: "volume" as LeaderboardSortBy, label: "Volume" },
                { key: "roi" as LeaderboardSortBy, label: "ROI" }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-1 text-xs transition-colors rounded-full ${
                    sortBy === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {sortedData.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-4 -mt-2">
            {/* 2nd Place */}
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 p-4 text-center cursor-pointer hover:bg-gray-700/50 transition-colors rounded-md"
                  onClick={() => handleUserClick(sortedData[1])}>
              <div className="flex justify-center mb-2">
                <span className="text-xs font-semibold text-gray-300">2</span>
              </div>
              <div className="mb-2">
                <div className="w-10 h-10 rounded-full mx-auto mb-1 bg-slate-700 flex items-center justify-center">
                  {sortedData[1].avatar ? (
                    <img 
                      src={sortedData[1].avatar} 
                      alt={sortedData[1].username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <h3 className="text-xs font-medium text-white truncate">{sortedData[1].username}</h3>
              </div>
              <div className="text-base font-bold text-green-400">{formatCurrency(sortedData[1].totalProfit)}</div>
              <div className="text-[11px] text-gray-400">ROI: {formatPercentage(sortedData[1].roiPercentage)}</div>
            </Card>

            {/* 1st Place */}
            <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30 p-4 text-center cursor-pointer hover:bg-yellow-600/10 transition-colors rounded-md"
                  onClick={() => handleUserClick(sortedData[0])}>
              <div className="flex justify-center mb-2">
                <span className="text-xs font-semibold text-yellow-400">1</span>
              </div>
              <div className="mb-2">
                <div className="w-12 h-12 rounded-full mx-auto mb-1 ring-1 ring-yellow-500 bg-slate-700 flex items-center justify-center">
                  {sortedData[0].avatar ? (
                    <img 
                      src={sortedData[0].avatar} 
                      alt={sortedData[0].username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <h3 className="text-sm font-medium text-white truncate">{sortedData[0].username}</h3>
              </div>
              <div className="text-lg font-bold text-yellow-400">{formatCurrency(sortedData[0].totalProfit)}</div>
              <div className="text-xs text-gray-300">ROI: {formatPercentage(sortedData[0].roiPercentage)}</div>
            </Card>

            {/* 3rd Place */}
            <Card className="bg-gradient-to-br from-amber-700/20 to-amber-900/20 border-amber-600/30 p-4 text-center cursor-pointer hover:bg-amber-700/10 transition-colors rounded-md"
                  onClick={() => handleUserClick(sortedData[2])}>
              <div className="flex justify-center mb-2">
                <span className="text-xs font-semibold text-amber-400">3</span>
              </div>
              <div className="mb-2">
                <div className="w-10 h-10 rounded-full mx-auto mb-1 bg-slate-700 flex items-center justify-center">
                  {sortedData[2].avatar ? (
                    <img 
                      src={sortedData[2].avatar} 
                      alt={sortedData[2].username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <h3 className="text-xs font-medium text-white truncate">{sortedData[2].username}</h3>
              </div>
              <div className="text-base font-bold text-amber-400">{formatCurrency(sortedData[2].totalProfit)}</div>
              <div className="text-[11px] text-gray-400">ROI: {formatPercentage(sortedData[2].roiPercentage)}</div>
            </Card>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <Card className="bg-gray-900 border-gray-800 rounded-md">
          <div className="overflow-x-auto leaderboard-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">Rank</th>
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">Trader</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">ROI</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">Volume</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">Profit</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((trader) => (
                  <tr 
                    key={trader.address} 
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => handleUserClick(trader)}
                  >
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(trader.rank)}
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          {trader.avatar ? (
                            <img 
                              src={trader.avatar} 
                              alt={trader.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{trader.username}</div>
                          <div className="text-xs text-gray-400">{trader.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className={`text-sm font-medium ${
                        trader.roiPercentage >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {trader.roiPercentage >= 0 ? "+" : ""}{formatPercentage(trader.roiPercentage)}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="text-sm text-white font-medium">
                        {formatCurrency(trader.totalVolume)}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className={`text-sm font-medium ${
                        trader.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {trader.totalProfit >= 0 ? "+" : ""}{formatCurrency(trader.totalProfit)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          userAddress={selectedUser?.address || ""}
          username={selectedUser?.username || ""}
          initialTimeframe={
            (() => {
              const mapped = timeframe === "day" ? "1D" :
                             timeframe === "week" ? "1W" :
                             timeframe === "month" ? "1M" :
                             "ALL";
              console.log('[Leaderboard] Passing timeframe to modal:', { leaderboardTimeframe: timeframe, mappedTimeframe: mapped });
              return mapped;
            })()
          }
        />
      </div>
    </div>
    </>
  );
}
