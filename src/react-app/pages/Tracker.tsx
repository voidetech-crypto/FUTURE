import { useState } from "react";
import { Search, Download, Upload, Settings, Bell, ExternalLink, Trash2 } from "lucide-react";
import { Card } from "@/react-app/components/ui/Card";

interface Wallet {
  id: string;
  created: string;
  name: string;
  icon?: string;
  iconColor?: string;
  address: string;
  balance: string;
  lastActive: string;
}

interface LiveTrade {
  id: string;
  time: string;
  name: string;
  token: string;
  amount: string;
  price: string;
}

export default function Tracker() {
  const [activeTab, setActiveTab] = useState("Wallet Manager");
  const [searchTerm, setSearchTerm] = useState("");

  // Empty wallets array
  const wallets: Wallet[] = [];

  const liveTrades: LiveTrade[] = [];

  const getIconColor = (color?: string) => {
    switch (color) {
      case "purple": return "bg-purple-500";
      case "orange": return "bg-orange-500";
      case "red": return "bg-red-500";
      case "green": return "bg-green-500";
      case "blue": return "bg-blue-500";
      case "pink": return "bg-pink-500";
      default: return "bg-gray-500";
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const filteredWallets = wallets.filter(wallet =>
    wallet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLiveTrades = liveTrades.filter(trade =>
    trade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] font-['Geist',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header Section */}
        <div className="mb-4">
          {/* Top Bar with Tabs, Search and Actions */}
          <div className="flex items-center gap-4 mb-4">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              {["Wallet Manager", "Live Trades"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-full  ${
                  activeTab === tab
                    ? "bg-gray-700 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm rounded-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <button className="px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-full transition-colors flex items-center gap-1">
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>
              <button className="px-3 py-2 text-sm text-gray-300 hover:text-white bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-full transition-colors flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
                Add Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-gray-900 border border-gray-800 rounded-md">
          <div className="overflow-x-auto" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {activeTab === "Wallet Manager" ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-300">
                      Created
                      <span className="ml-1 text-gray-500"></span>
                    </th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-300">
                      Name
                      <span className="ml-1 text-gray-500"></span>
                    </th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-300">
                      Balance
                      <span className="ml-1 text-gray-500"></span>
                    </th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-300">
                      Last Active
                      <span className="ml-1 text-gray-500"></span>
                    </th>
                    <th className="text-right py-1.5 px-3 text-xs font-medium text-gray-400">
                      <button className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-gray-900 border border-gray-800 hover:bg-gray-800 rounded-full transition-colors">
                        Remove All
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <div className="text-gray-400 text-sm">Log in to track wallets</div>
                      </td>
                    </tr>
                  ) : (
                    filteredWallets.map((wallet) => (
                      <tr
                        key={wallet.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-2 px-3 text-sm text-gray-400">{wallet.created}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {wallet.iconColor ? (
                              <div className={`w-5 h-5 ${getIconColor(wallet.iconColor)} rounded-full flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white text-[10px] font-medium">{getInitial(wallet.name)}</span>
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-[10px] font-medium">{getInitial(wallet.name)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white">{wallet.name}</span>
                              <span className="text-xs text-gray-500">{wallet.address}</span>
                              <ExternalLink className="w-3 h-3 text-gray-500" />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 text-sm">≡</span>
                            <span className="text-sm text-white">{wallet.balance}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-400">{wallet.lastActive}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1 text-red-400 hover:text-red-300 transition-colors">
                            <Bell className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-gray-300 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Time</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Amount</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLiveTrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <div className="text-gray-400 text-sm">No live trades yet</div>
                      </td>
                    </tr>
                  ) : (
                    filteredLiveTrades.map((trade) => (
                      <tr
                        key={trade.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-400">{trade.time}</td>
                        <td className="py-3 px-4 text-sm text-white">{trade.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-300">{trade.token}</td>
                        <td className="py-3 px-4 text-sm text-right text-white">{trade.amount}</td>
                        <td className="py-3 px-4 text-sm text-right text-white">{trade.price}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

