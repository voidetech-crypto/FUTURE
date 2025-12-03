import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/Card";
import { Button } from "@/react-app/components/ui/Button";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { usePolymarketMarkets } from "@/react-app/hooks/usePolymarketData";
import { formatYesPrice, formatNoPrice } from "@/react-app/utils/priceFormat";

export default function QuickTrade() {
  const [selectedMarket, setSelectedMarket] = useState("");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"yes" | "no">("yes");

  const { data: markets, loading } = usePolymarketMarkets({ limit: 5 });
  
  // Auto-select first market if none selected
  if (!selectedMarket && markets.length > 0) {
    setSelectedMarket(markets[0].id);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          Quick Trade
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Market Selection */}
        <div className="flex-1 flex flex-col">
          <label className="text-xs text-gray-400 mb-2">Select Market</label>
          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-xs text-gray-400">Loading markets...</div>
              </div>
            ) : markets.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-xs text-gray-400">No markets available</div>
              </div>
            ) : (
              markets.map((market) => (
                <div
                  key={market.id}
                  className={`p-2 border cursor-pointer text-xs ${
                    selectedMarket === market.id
                      ? "border-blue-500 bg-blue-950"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                  onClick={() => setSelectedMarket(market.id)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white truncate">{market.title}</span>
                    <span className={`text-xs ${
                      market.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {market.change}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatYesPrice(market.yesPrice)}</span>
                    <span>{formatNoPrice(market.noPrice)}</span>
                    <span>{market.volume}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trade Type Selection */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Position</label>
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant={tradeType === "yes" ? "trading" : "outline"}
              onClick={() => setTradeType("yes")}
              className="flex items-center justify-center gap-1 text-xs h-7"
            >
              <TrendingUp className="w-3 h-3" />
              Yes
            </Button>
            <Button
              variant={tradeType === "no" ? "danger" : "outline"}
              onClick={() => setTradeType("no")}
              className="flex items-center justify-center gap-1 text-xs h-7"
            >
              <TrendingDown className="w-3 h-3" />
              No
            </Button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Amount (USDC)</label>
          <input
            type="number"
            value={tradeAmount}
            onChange={(e) => setTradeAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-xs h-7"
          />
          <div className="flex gap-1 mt-1">
            {[10, 25, 50, 100].map((amount) => (
              <Button
                key={amount}
                variant="ghost"
                onClick={() => setTradeAmount(amount.toString())}
                className="text-xs text-gray-400 hover:text-white h-6 px-2"
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Execute Trade */}
        <Button
          variant="trading"
          className="w-full text-xs h-7"
          disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
        >
          Execute Trade
        </Button>
      </CardContent>
    </Card>
  );
}
