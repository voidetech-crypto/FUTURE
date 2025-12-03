import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/Card";
import { Button } from "@/react-app/components/ui/Button";
import { ArrowUpDown, CreditCard, Banknote } from "lucide-react";

export default function OnRamp() {
  const [mode, setMode] = useState<"swap" | "fiat">("swap");
  const [fromAmount, setFromAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("MOCKDATA");
  const [toCurrency, setToCurrency] = useState("MOCKDATA");

  const currencies = [
    { symbol: "MOCKDATA", name: "MOCKDATA" },
    { symbol: "MOCKDATA", name: "MOCKDATA" },
    { symbol: "MOCKDATA", name: "MOCKDATA" },
    { symbol: "MOCKDATA", name: "MOCKDATA" },
    { symbol: "MOCKDATA", name: "MOCKDATA" }
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          On-Ramp & Swap
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant={mode === "swap" ? "default" : "outline"}
            onClick={() => setMode("swap")}
            className="text-xs h-7"
          >
            Crypto Swap
          </Button>
          <Button
            variant={mode === "fiat" ? "default" : "outline"}
            onClick={() => setMode("fiat")}
            className="text-xs h-7"
          >
            Buy w/ Fiat
          </Button>
        </div>

        {mode === "swap" ? (
          /* Crypto Swap */
          <div className="flex-1 flex flex-col gap-3">
            {/* From */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">From</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="MOCKDATA"
                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-xs h-7"
                />
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 text-white text-xs h-7"
                >
                  {currencies.map((currency) => (
                    <option key={currency.symbol} value={currency.symbol}>
                      {currency.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ArrowUpDown className="w-3 h-3" />
              </Button>
            </div>

            {/* To */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">To</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value="MOCKDATA"
                  readOnly
                  placeholder="MOCKDATA"
                  className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs h-7"
                />
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="px-2 py-1 bg-gray-800 border border-gray-700 text-white text-xs h-7"
                >
                  {currencies.map((currency) => (
                    <option key={currency.symbol} value={currency.symbol}>
                      {currency.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate Info */}
            <div className="bg-gray-800 p-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Rate</span>
                <span className="text-white">MOCKDATA</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Fee</span>
                <span className="text-white">MOCKDATA</span>
              </div>
            </div>

            <Button variant="trading" className="text-xs h-7">
              Execute Swap
            </Button>
          </div>
        ) : (
          /* Fiat On-Ramp */
          <div className="flex-1 flex flex-col gap-3">
            {/* Amount */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Amount (USD)</label>
              <input
                type="number"
                placeholder="MOCKDATA"
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-xs h-7"
              />
            </div>

            {/* Currency Selection */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Buy</label>
              <select className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white text-xs h-7">
                <option value="MOCKDATA">MOCKDATA</option>
                <option value="MOCKDATA">MOCKDATA</option>
                <option value="MOCKDATA">MOCKDATA</option>
              </select>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Payment Method</label>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs h-7">
                  <CreditCard className="w-3 h-3 mr-2" />
                  MOCKDATA
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs h-7">
                  <Banknote className="w-3 h-3 mr-2" />
                  MOCKDATA
                </Button>
              </div>
            </div>

            <Button variant="trading" className="text-xs h-7">
              Buy Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
