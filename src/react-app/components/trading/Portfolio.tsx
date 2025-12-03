import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/Card";
import { DollarSign } from "lucide-react";

export default function Portfolio() {
  const positions = [
    {
      id: 1,
      market: "MOCKDATA",
      position: "MOCKDATA",
      shares: "MOCKDATA",
      avgPrice: "MOCKDATA",
      currentPrice: "MOCKDATA",
      pnl: "MOCKDATA",
      pnlPercent: "MOCKDATA"
    },
    {
      id: 2,
      market: "MOCKDATA",
      position: "MOCKDATA", 
      shares: "MOCKDATA",
      avgPrice: "MOCKDATA",
      currentPrice: "MOCKDATA",
      pnl: "MOCKDATA",
      pnlPercent: "MOCKDATA"
    },
    {
      id: 3,
      market: "MOCKDATA",
      position: "MOCKDATA",
      shares: "MOCKDATA",
      avgPrice: "MOCKDATA",
      currentPrice: "MOCKDATA",
      pnl: "MOCKDATA",
      pnlPercent: "MOCKDATA"
    }
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 p-2">
            <div className="text-xs text-gray-400">Balance</div>
            <div className="text-sm text-white">MOCKDATA</div>
          </div>
          <div className="bg-gray-800 p-2">
            <div className="text-xs text-gray-400">Total P&L</div>
            <div className="text-sm text-green-400">MOCKDATA</div>
          </div>
          <div className="bg-gray-800 p-2">
            <div className="text-xs text-gray-400">Open</div>
            <div className="text-sm text-white">MOCKDATA</div>
          </div>
        </div>

        {/* Positions List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {positions.map((position) => (
            <div key={position.id} className="p-2 bg-gray-800 border border-gray-700">
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <div className="text-xs text-white truncate">{position.market}</div>
                  <div className="text-xs text-gray-400">
                    {position.position} • {position.shares} shares
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-green-400">
                    {position.pnl}
                  </div>
                  <div className="text-xs text-green-400">
                    {position.pnlPercent}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Avg: {position.avgPrice}</span>
                <span>Current: {position.currentPrice}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
