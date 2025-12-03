import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/react-app/components/ui/Button";
import { Card } from "@/react-app/components/ui/Card";

export default function Alerts() {
  const [marketId, setMarketId] = useState("");
  const [priceType, setPriceType] = useState("Mid Price");
  const [alertCondition, setAlertCondition] = useState("UP - Price goes above target");
  const [targetPrice, setTargetPrice] = useState("0.50");
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const handleConnectTelegram = () => {
    // TODO: Implement Telegram connection
    setIsTelegramConnected(true);
  };

  const handleCreateAlert = () => {
    if (!isTelegramConnected) {
      alert("Please connect Telegram first");
      return;
    }
    // TODO: Implement alert creation
    console.log("Creating alert:", { marketId, priceType, alertCondition, targetPrice });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] font-['Geist',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-center">
        <div className="w-full max-w-7xl">
          {/* Connect Telegram Section - Horizontal Bar */}
          <Card className="mb-0 mt-1 pt-2 px-4 pb-2.5 bg-gray-900 border border-gray-800 lg:border-b-0 lg:rounded-tl-md lg:rounded-tr-md lg:rounded-bl-none lg:rounded-br-none rounded-md lg:rounded-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Connect Telegram to Receive Alerts</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Link your Telegram account to receive instant notifications when your price alerts are triggered.
              </p>
            </div>
            
            <Button
              onClick={() => setIsWalletConnected(!isWalletConnected)}
              className="text-xs py-1.5 px-3 rounded-full bg-blue-600 hover:bg-blue-800 flex items-center gap-2"
            >
              Connect Telegram
              <img 
                src="https://telegram.org/img/t_logo.png" 
                alt="Telegram" 
                className="w-5 h-5"
              />
            </Button>
          </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* How it works Section */}
          <Card className="pt-2 px-4 pb-4 bg-gray-900 border border-gray-800 lg:border-r lg:border-b-0 lg:rounded-tl-none lg:rounded-tr-none lg:rounded-bl-md lg:rounded-br-none rounded-md lg:rounded-none flex flex-col">
            <h2 className="text-base font-semibold text-white mb-4">How it works</h2>
            
            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">1</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-xs mb-0.5">Connect Telegram</h3>
                  <p className="text-gray-400 text-xs">Link your Telegram account</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">2</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-xs mb-0.5">Choose a market</h3>
                  <p className="text-gray-400 text-xs">Search for any Polymarket market</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">3</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-xs mb-0.5">Set your condition</h3>
                  <p className="text-gray-400 text-xs">Define when you want to be notified</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">4</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-xs mb-0.5">Create alert</h3>
                  <p className="text-gray-400 text-xs">Set your target price and create the alert</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">5</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-xs mb-0.5">Manage & get notified</h3>
                  <p className="text-gray-400 text-xs">
                    Manage and receive Telegram alerts
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Create Alert Section */}
          <Card className="pt-2 px-4 pb-4 bg-gray-900 border border-gray-800 lg:border-l-0 lg:border-r lg:border-b-0 lg:rounded-none rounded-md flex flex-col">
            <h2 className="text-base font-semibold text-white mb-4">Create Alert</h2>
            
            <div className="space-y-3">
              {/* Market ID */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Market ID
                </label>
                <input
                  type="text"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  placeholder="e.g. 529277"
                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none rounded-md"
                />
                <p className="text-xs text-gray-500 mt-0.5">Paste market ID from the opportunities table</p>
              </div>

              {/* Price Type */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Price Type
                </label>
                <div className="relative">
                  <select
                    value={priceType}
                    onChange={(e) => setPriceType(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-white appearance-none focus:border-blue-500 focus:outline-none pr-8 rounded-md"
                  >
                    <option value="Mid Price">Mid Price</option>
                    <option value="Best Bid">Best Bid</option>
                    <option value="Best Ask">Best Ask</option>
                    <option value="Last Trade">Last Trade</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Choose which price to monitor for this alert</p>
              </div>

              {/* Alert Condition */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Alert Condition
                </label>
                <div className="relative">
                  <select
                    value={alertCondition}
                    onChange={(e) => setAlertCondition(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-white appearance-none focus:border-blue-500 focus:outline-none pr-8 rounded-md"
                  >
                    <option value="UP - Price goes above target">UP - Price goes above target</option>
                    <option value="DOWN - Price goes below target">DOWN - Price goes below target</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Trigger when price crosses the target threshold</p>
              </div>

              {/* Target Price */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Target Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    min="0"
                    max="1"
                    step="0.01"
                    className="w-full pl-6 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Price between 0 and 1</p>
              </div>

              {/* Create Alert Button */}
              <Button
                onClick={handleCreateAlert}
                disabled={!isTelegramConnected || !marketId || !targetPrice}
                className={`w-full text-xs py-1.5 rounded-md ${
                  !isTelegramConnected 
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {!isTelegramConnected ? "Connect Telegram First" : "Create Alert"}
              </Button>

              {!isTelegramConnected && (
                <p className="text-xs text-gray-400 text-center">
                  You need to connect Telegram first
                </p>
              )}
            </div>
          </Card>

          {/* Manage Alerts Section */}
          <Card className="pt-2 px-4 pb-4 bg-gray-900 border border-gray-800 lg:border-l-0 lg:border-r lg:border-b-0 lg:rounded-none rounded-md flex flex-col">
            <h2 className="text-base font-semibold text-white mb-4">Manage Alerts</h2>
            
            <div className="text-center py-8">
              <p className="text-gray-400 text-xs">No alerts set</p>
            </div>
          </Card>

          {/* Recent Activity Section */}
          <Card className="pt-2 px-4 pb-4 bg-gray-900 border border-gray-800 lg:border-l-0 lg:border-b-0 lg:rounded-tr-none lg:rounded-tl-none lg:rounded-br-md lg:rounded-bl-none rounded-md lg:rounded-none flex flex-col">
            <h2 className="text-base font-semibold text-white mb-4">Recent Activity</h2>
            
            <div className="text-center py-8">
              <p className="text-gray-400 text-xs">No recent activity</p>
            </div>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

