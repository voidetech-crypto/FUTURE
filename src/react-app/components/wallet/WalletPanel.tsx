import { useState } from "react";
import { Settings, X } from "lucide-react";

interface WalletPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Trade {
  time: string;
  name: string;
  nameIcon: string;
  nameIconColor: string;
  token: {
    icon: string;
    name: string;
    duration: string;
  };
  amount: number;
  amountColor: "green" | "red";
  marketCap: string;
}

export default function WalletPanel({ isOpen, onClose }: WalletPanelProps) {
  const [activeTab, setActiveTab] = useState<"Manager" | "Trades">("Trades");

  // Empty trades array - data will be populated later
  const trades: Trade[] = [];

  if (!isOpen) return null;

  return (
    <div className="w-[400px] bg-[#0a0a0a] border-l border-gray-800 flex flex-col flex-shrink-0">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0a0a0a]">
        {/* Left: Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("Manager")}
            className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
              activeTab === "Manager"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => setActiveTab("Trades")}
            className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
              activeTab === "Trades"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Trades
          </button>
        </div>

        {/* Right: Close Button */}
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content - Trades Table */}
      {activeTab === "Trades" && (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0a0a0a] border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">
                  <div className="flex items-center">
                    <button className="text-gray-400 hover:text-white transition-colors pr-5">
                      <Settings className="w-4 h-4" />
                    </button>
                    <span>Name</span>
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Market</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">
                  <div className="flex items-center gap-1">
                    Amount
                    <span className="text-[10px]">$</span>
                  </div>
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Price</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                    No trades yet
                  </td>
                </tr>
              ) : (
                trades.map((trade, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium ${
                            trade.nameIconColor === "red"
                              ? "bg-red-600"
                              : "bg-purple-600"
                          } text-white`}
                        >
                          {trade.nameIcon}
                        </div>
                        <span className="text-xs text-white">{trade.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative w-6 h-6 rounded overflow-hidden flex-shrink-0">
                          {trade.token.icon === "solana" ? (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-[8px] text-white font-bold">SOL</span>
                            </div>
                          ) : trade.token.icon === "mountain" ? (
                            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                              <div className="w-3 h-3 bg-white/20 rounded-sm"></div>
                            </div>
                          ) : trade.token.icon === "tiger" ? (
                            <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                              <span className="text-[8px] text-white">🐯</span>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                              <span className="text-[8px] text-white">🐕</span>
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#0a0a0a]"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-white">{trade.token.name}</span>
                          <span className="text-[10px] text-gray-400">{trade.token.duration}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 flex items-center justify-center">
                          <div className="w-0.5 h-3 bg-gray-600"></div>
                          <div className="w-0.5 h-3 bg-gray-600 -ml-0.5"></div>
                          <div className="w-0.5 h-3 bg-gray-600 -ml-0.5"></div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            trade.amountColor === "green" ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {trade.amount.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-white">{trade.marketCap}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Manager" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Manager content coming soon</p>
        </div>
      )}
    </div>
  );
}

