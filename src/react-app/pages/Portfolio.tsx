import { useState } from "react";
import { Download, Search, Upload } from "lucide-react";
import { Card } from "@/react-app/components/ui/Card";
import TradingViewChart from "@/react-app/components/ui/TradingViewChart";
import { PnlCardGenerator } from "@/react-app/components/ui/PnlCardGenerator";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<"active" | "closed" | "activity">("active");
  const [pnlTimeframe, setPnlTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">("1M");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPnlCardGeneratorOpen, setIsPnlCardGeneratorOpen] = useState(false);

  // Mock data for the chart
  const chartData = [
    { time: Date.now() - 7 * 24 * 60 * 60 * 1000, value: 500 },
    { time: Date.now() - 6 * 24 * 60 * 60 * 1000, value: 500  },
    { time: Date.now() - 5 * 24 * 60 * 60 * 1000, value: 500 },
    { time: Date.now() - 4 * 24 * 60 * 60 * 1000, value: 500  },
    { time: Date.now() - 3 * 24 * 60 * 60 * 1000, value: 500 },
    { time: Date.now() - 2 * 24 * 60 * 60 * 1000, value: 500 },
    { time: Date.now() - 1 * 24 * 60 * 60 * 1000, value: 500 },
    { time: Date.now(), value: 500 },
  ];

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `${Math.round(price * 100)}`;
    }
  };

  // Mock function to get timeframe PNL (replace with actual data later)
  const getTimeframePnl = () => {
    return 0;
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] font-['Geist',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 pt-[18px] pb-4">
        {/* Three Panels Section */}
        <div className="pt-0 pb-0 border border-gray-800 rounded-t-md min-h-[280px]">
          <div className="grid grid-cols-1 lg:grid-cols-3 mb-0 h-full">
            {/* Balance Panel */}
            <Card className="py-2 px-4 bg-gray-900 border-0 lg:border-r border-gray-800 lg:border-b-0 lg:rounded-tl-md lg:rounded-tr-none lg:rounded-bl-none lg:rounded-br-none rounded-md lg:rounded-none flex flex-col min-h-[280px]">
              <h3 className="text-sm font-medium text-white mb-2 -mt-[1px]">Balance</h3>
              <div className="space-y-2 flex-1">
                <div className="mt-[1px]">
                  <div className="text-xs text-gray-400 mb-0.5">Positions Value</div>
                  <div className="text-base text-white">
                    {formatCurrency(0)}
                  </div>
                </div>
                <div className="mt-[1px]">
                  <div className="text-xs text-gray-400 mb-0.5">Biggest Win</div>
                  <div className="text-base text-white">
                    {formatCurrency(0)}
                  </div>
                </div>
                <div className="mt-[1px]">
                  <div className="text-xs text-gray-400 mb-0.5">Predictions</div>
                  <div className="text-base text-white">
                    {(0).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* PNL Panel */}
            <Card className="py-2 px-4 bg-gray-900 border-0 lg:border-r border-gray-800 lg:border-b-0 lg:rounded-none rounded-md flex flex-col min-h-[280px]">
              <div className="mb-2 -mt-[1px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">PNL</h3>
                  <div className="flex items-center gap-1">
                    {(["1d", "7d", "30d", "Max"] as const).map((period) => {
                      const periodMap: Record<string, "1D" | "1W" | "1M" | "ALL"> = {
                        "1d": "1D",
                        "7d": "1W",
                        "30d": "1M",
                        "Max": "ALL"
                      };
                      return (
                        <button
                          key={period}
                          onClick={() => setPnlTimeframe(periodMap[period])}
                          className={`px-1 py-1 text-xs transition-colors ${
                            pnlTimeframe === periodMap[period]
                              ? "text-white"
                              : "text-gray-500 hover:text-gray-400"
                          }`}
                        >
                          {period}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[148px] -mx-2">
                <TradingViewChart
                  height={213}
                  data={chartData}
                  lineColor="#14B8A6"
                  areaColor="rgba(20, 184, 166, 0.3)"
                  transparent={false}
                  showTimeScale={false}
                  showPriceScale={false}
                  showGrid={false}
                  showCrosshair={false}
                  priceFormat={{ type: 'price', precision: 0 }}
                  color="#111827"
                />
              </div>
            </Card>

            {/* Performance Panel */}
            <Card className="py-2 px-4 bg-gray-900 border-0 lg:border-b-0 lg:rounded-tr-md lg:rounded-tl-none lg:rounded-br-none lg:rounded-bl-none rounded-md lg:rounded-none flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between mb-2 -mt-[1px]">
                <h3 className="text-sm font-medium text-white">Performance</h3>
                <button 
                  onClick={() => setIsPnlCardGeneratorOpen(true)}
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="space-y-2 flex-1">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">
                    {pnlTimeframe === "1D" ? "1d" : pnlTimeframe === "1W" ? "7d" : pnlTimeframe === "1M" ? "30d" : "Max"} Profit/Loss
                  </div>
                  <div className="text-lg text-white">
                    {getTimeframePnl() >= 0 ? "+" : ""}${getTimeframePnl().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="pt-1.5 border-t border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">&gt;500%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-white">0</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">200% ~ 500%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      <span className="text-xs text-white">0</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">0% ~ 200%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-700 rounded-full"></div>
                      <span className="text-xs text-white">0</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">0% ~ -50%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                      <span className="text-xs text-white">0</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">&lt;-50%</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-800 rounded-full"></div>
                      <span className="text-xs text-white">0</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs and Table Section */}
        <Card className="bg-gray-900 border border-gray-800 mt-0 lg:rounded-t-none rounded-b-md flex flex-col">
          <div className="border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between gap-6 px-4">
              <div className="flex items-center gap-6">
                {[
                  { key: "active" as const, label: "Active Positions", count: 0 },
                  { key: "closed" as const, label: "Closed Positions", count: 0 },
                  { key: "activity" as const, label: "Activity", count: 0 }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === key
                        ? "text-white border-blue-500"
                        : "text-gray-400 border-transparent hover:text-gray-300"
                    }`}
                  >
                    {label} {count > 0 && <span className="text-gray-500">({count})</span>}
                  </button>
                ))}
              </div>
              <div className="relative max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "active" 
                      ? "Search active positions..." 
                      : activeTab === "closed"
                      ? "Search closed positions..."
                      : "Search activity..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="overflow-y-auto h-[calc(100vh-480px)]">
            <div className="overflow-x-auto">
              {(activeTab === "active" || activeTab === "closed") && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Outcome</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Avg</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Current</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Value</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="py-24 text-center">
                        <div className="text-gray-400 text-sm">No {searchTerm ? "matching " : ""}{activeTab === "active" ? "active" : "closed"} positions found</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {activeTab === "activity" && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Amount</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Price</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">PNL</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="py-24 text-center">
                        <div className="text-gray-400 text-sm">No {searchTerm ? "matching " : ""}activity found</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* PNL Card Generator */}
      <PnlCardGenerator
        isOpen={isPnlCardGeneratorOpen}
        onClose={() => setIsPnlCardGeneratorOpen(false)}
        pnlData={{
          pnl: getTimeframePnl(),
          predictions: 0, // TODO: Replace with actual predictions count
          profileViews: 0 // TODO: Replace with actual profile views count
        }}
        currentTimeframe={pnlTimeframe}
        onTimeframeChange={setPnlTimeframe}
      />
    </div>
  );
}

