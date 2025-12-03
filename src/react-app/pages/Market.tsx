import { useParams, useNavigate } from "react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ChevronDown, Star, Copy } from "lucide-react";
import { Card } from "@/react-app/components/ui/Card";
import { usePolymarketMarket, usePolymarketPriceHistory } from "@/react-app/hooks/usePolymarketData";
import TradingViewMultiSeriesChart from "@/react-app/components/ui/TradingViewMultiSeriesChart";
import { formatYesPrice, formatNoPrice } from "@/react-app/utils/priceFormat";

export default function Market() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [selectedOutcomePrice, setSelectedOutcomePrice] = useState<number | null>(null);
  const [selectedOutcomeName, setSelectedOutcomeName] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [tradeAmount, setTradeAmount] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [amountUnit, setAmountUnit] = useState<"USD" | "Shares">("USD");
  const [amountUnitDropdownOpen, setAmountUnitDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState("MAX");
  const [rulesHovered, setRulesHovered] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [outcomeNameWraps, setOutcomeNameWraps] = useState(false);
  const outcomeNameRef = useRef<HTMLHeadingElement>(null);
  
  const marketIdToFetch = id || "";
  
  // Fetch full market details
  const { market: fullMarket, loading: marketLoading, error: marketError } = usePolymarketMarket(marketIdToFetch);
  
  // Use fullMarket as displayMarket
  const displayMarket = fullMarket;
  
  // Debug: Log market data to see category
  useEffect(() => {
    if (displayMarket) {
      console.log("Market.tsx - displayMarket:", displayMarket);
      console.log("Market.tsx - category:", displayMarket.category);
      console.log("Market.tsx - tags:", (displayMarket as any).tags);
    }
  }, [displayMarket]);
  
  // Reset selection when market changes
  useEffect(() => {
    if (marketIdToFetch) {
      setSelectedOutcomeName(null);
      setSelectedOutcomePrice(null);
      setSelectedOutcome("yes");
      setTradeAmount("1000"); // Default to $1000
    }
  }, [marketIdToFetch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (amountUnitDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.amount-unit-dropdown')) {
          setAmountUnitDropdownOpen(false);
        }
      }
    };

    if (amountUnitDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [amountUnitDropdownOpen]);

  // Check if market is in watchlist and listen for updates
  useEffect(() => {
    const checkWatchlist = () => {
      try {
        const saved = localStorage.getItem('watchlist');
        const watchlist = saved ? new Set(JSON.parse(saved)) : new Set();
        const marketId = marketIdToFetch;
        setIsWatched(watchlist.has(marketId));
      } catch {
        setIsWatched(false);
      }
    };

    checkWatchlist();

    const handleWatchlistUpdate = () => {
      checkWatchlist();
    };

    window.addEventListener('watchlistUpdated', handleWatchlistUpdate);
    window.addEventListener('storage', handleWatchlistUpdate);
    
    return () => {
      window.removeEventListener('watchlistUpdated', handleWatchlistUpdate);
      window.removeEventListener('storage', handleWatchlistUpdate);
    };
  }, [marketIdToFetch]);

  // Toggle watchlist
  const handleWatchlistToggle = () => {
    try {
      const saved = localStorage.getItem('watchlist');
      const watchlist = saved ? new Set(JSON.parse(saved)) : new Set();
      const marketId = marketIdToFetch;
      
      if (watchlist.has(marketId)) {
        watchlist.delete(marketId);
      } else {
        watchlist.add(marketId);
      }
      
      localStorage.setItem('watchlist', JSON.stringify(Array.from(watchlist)));
      window.dispatchEvent(new CustomEvent('watchlistUpdated'));
      setIsWatched(watchlist.has(marketId));
    } catch (e) {
      console.error('Failed to toggle watchlist:', e);
    }
  };

  // Copy market ID
  const handleCopyMarket = async () => {
    try {
      const marketId = marketIdToFetch;
      await navigator.clipboard.writeText(marketId);
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to copy market ID:', err);
    }
  };

  // Compute formatted All-Time Volume from available fields
  const allTimeVolumeFormatted = useMemo(() => {
    const fetchedVolume = (displayMarket as any)?.volume;
    if (fetchedVolume) {
      const volumeStr = String(fetchedVolume);
      return volumeStr.startsWith('$') ? volumeStr : `$${volumeStr}`;
    }

    const numericFrom = (value: unknown): number | undefined => {
      if (typeof value === 'number' && isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
        return isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    };

    const volumeNum = numericFrom((displayMarket as any)?.volumeNum)
      ?? numericFrom((displayMarket as any)?.volume)
      ?? 0;

    return `$${Number(volumeNum).toLocaleString()}`;
  }, [displayMarket]);

  // Determine if this is a Yes/No market or multi-choice
  const isYesNoMarket = displayMarket?.isYesNo === true || 
    (displayMarket?.isYesNo !== false && displayMarket?.outcomes && 
     displayMarket.outcomes.length === 2 && 
     displayMarket.outcomes.some((o: string) => o.toLowerCase().includes('yes')) &&
     displayMarket.outcomes.some((o: string) => o.toLowerCase().includes('no')));

  // Helper function to check if an outcome is resolved
  const isOutcomeResolved = (price: number, noPrice: number): boolean => {
    return Math.abs(price - 1) < 0.001 || Math.abs(price - 0) < 0.001 ||
           Math.abs(noPrice - 1) < 0.001 || Math.abs(noPrice - 0) < 0.001;
  };

  // Get all outcomes - show ALL outcomes if it's a multi-choice market (not Yes/No)
  const allOutcomes = useMemo(() => {
    if (isYesNoMarket) return [];
    
    let outcomes: any[] = [];
    
    if (displayMarket?.topOutcomes && Array.isArray(displayMarket.topOutcomes) && displayMarket.topOutcomes.length > 0) {
      outcomes = displayMarket.topOutcomes.map((outcome: any) => {
        const price = Number(outcome.price) || 0;
        const noPrice = Number(outcome.noPrice) || (1 - price);
        return {
          name: outcome.name || outcome.label || String(outcome),
          price: price,
          noPrice: noPrice,
          volume: typeof outcome.volume === 'string' ? outcome.volume : 
                  (outcome.volumeNum ? `$${Number(outcome.volumeNum).toLocaleString()}` : 
                  (displayMarket?.volumeNum ? `$${Number(displayMarket.volumeNum).toLocaleString()}` : 
                  (displayMarket?.volume || "0"))),
          volumeNum: outcome.volumeNum || parseFloat(String(outcome.volume || "0").replace(/[^0-9.]/g, '')) || 0,
          volume24hr: typeof outcome.volume24hr === 'string'
            ? outcome.volume24hr
            : (outcome.volume24hr ? `$${Number(outcome.volume24hr).toLocaleString()}` : undefined),
          volume24hrNum: outcome.volume24hrNum
            ?? (typeof outcome.volume24hr === 'number' ? outcome.volume24hr
                : (typeof outcome.volume24hr === 'string'
                    ? parseFloat(String(outcome.volume24hr).replace(/[^0-9.]/g, '')) : undefined)),
          image: outcome.image || outcome.icon || displayMarket?.image || "",
          isResolved: isOutcomeResolved(price, noPrice),
          yesTokenId: (outcome as any).yesTokenId || "",
          noTokenId: (outcome as any).noTokenId || "",
          oneWeekPriceChange: (outcome as any).oneWeekPriceChange ?? null,
          liquidityClob: (outcome as any).liquidityClob ?? null,
        };
      });
    }
    else if (displayMarket?.outcomes && Array.isArray(displayMarket.outcomes) && displayMarket.outcomes.length > 0) {
      let outcomePrices: Record<string, number> = {};
      if (displayMarket.outcomePrices) {
        try {
          outcomePrices = typeof displayMarket.outcomePrices === 'string' 
            ? JSON.parse(displayMarket.outcomePrices)
            : displayMarket.outcomePrices;
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      outcomes = displayMarket.outcomes.map((outcomeName: string, index: number) => {
        const price = Number(outcomePrices[outcomeName] ?? 
                     outcomePrices[index] ?? 
                     outcomePrices[`outcome${index}`] ?? 
                     (displayMarket.lastTradePrice && index === 0 ? displayMarket.lastTradePrice : 0));
        const noPrice = 1 - price;
        return {
          name: outcomeName,
          price: price,
          noPrice: noPrice,
          volume: displayMarket?.volumeNum || displayMarket?.volume || "0",
          image: displayMarket?.image || "",
          isResolved: isOutcomeResolved(price, noPrice),
        };
      });
    }
    
    return outcomes.sort((a, b) => {
      if (a.isResolved && !b.isResolved) return 1;
      if (!a.isResolved && b.isResolved) return -1;
      return (b.price || 0) - (a.price || 0);
    });
  }, [displayMarket, isYesNoMarket]);

  const hasMultiChoiceOutcomes = allOutcomes.length > 0;
  
  // Set default to first (most likely) outcome when market loads
  useEffect(() => {
    if (!marketLoading && marketIdToFetch) {
      if (!tradeAmount || tradeAmount === "") {
        setTradeAmount("1000");
      }
      
      if (hasMultiChoiceOutcomes && allOutcomes.length > 0) {
        const firstOutcome = allOutcomes[0];
        if (firstOutcome && !firstOutcome.isResolved) {
          setSelectedOutcomeName(firstOutcome.name);
          setSelectedOutcome("yes");
          setSelectedOutcomePrice(firstOutcome.price);
        }
      } else if (isYesNoMarket) {
        setSelectedOutcomeName(null);
        setSelectedOutcome("yes");
        setSelectedOutcomePrice(null);
      }
    }
  }, [marketLoading, hasMultiChoiceOutcomes, allOutcomes, isYesNoMarket, marketIdToFetch, tradeAmount]);

  // Check if outcome name wraps to multiple lines
  useEffect(() => {
    const checkWrapping = () => {
      if (outcomeNameRef.current) {
        const element = outcomeNameRef.current;
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 20;
        const isWrapping = element.scrollHeight > lineHeight * 1.5;
        setOutcomeNameWraps(isWrapping);
      } else {
        setOutcomeNameWraps(false);
      }
    };

    checkWrapping();
    const timeoutId = setTimeout(checkWrapping, 100);
    
    window.addEventListener('resize', checkWrapping);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkWrapping);
    };
  }, [selectedOutcomeName]);

  // Get all outcomes with valid token IDs for fetching history
  const outcomesWithTokenIds = useMemo(() => {
    if (marketLoading || !fullMarket) return [];
    
    if (isYesNoMarket) {
      if (fullMarket?.topOutcomes && fullMarket.topOutcomes.length > 0) {
        const firstOutcome = fullMarket.topOutcomes[0];
        const yesTokenId = (firstOutcome as any).yesTokenId || "";
        const noTokenId = (firstOutcome as any).noTokenId || "";
        if (yesTokenId && noTokenId) {
          return [
            { name: "Yes", tokenId: yesTokenId, color: "#1e9a5a" },
            { name: "No", tokenId: noTokenId, color: "#dc2626" }
          ];
        }
      }
      return [];
    }
    
    const colorPalette = [
      "#1e9a5a", "#dc2626", "#2563eb", "#f97316", "#8b5cf6",
      "#0f766e", "#10b981", "#db2777", "#0891b2", "#d9a21f",
    ];
    
    return allOutcomes
      .filter((outcome: any) => outcome.yesTokenId && !outcome.isResolved)
      .map((outcome: any, index: number) => ({
        name: outcome.name,
        tokenId: outcome.yesTokenId,
        color: colorPalette[index % colorPalette.length] || `hsl(${(index * 137.5) % 360}, 70%, 50%)`
      }));
  }, [allOutcomes, isYesNoMarket, fullMarket, marketLoading]);

  const outcomesToFetch = outcomesWithTokenIds.slice(0, 10);
  const shouldFetchHistory = !marketLoading && outcomesToFetch.length > 0;
  
  const outcome1 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[0] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[0] ? outcomesToFetch[0].tokenId : undefined
  );
  const outcome2 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[1] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[1] ? outcomesToFetch[1].tokenId : undefined
  );
  const outcome3 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[2] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[2] ? outcomesToFetch[2].tokenId : undefined
  );
  const outcome4 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[3] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[3] ? outcomesToFetch[3].tokenId : undefined
  );
  const outcome5 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[4] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[4] ? outcomesToFetch[4].tokenId : undefined
  );
  const outcome6 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[5] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[5] ? outcomesToFetch[5].tokenId : undefined
  );
  const outcome7 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[6] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[6] ? outcomesToFetch[6].tokenId : undefined
  );
  const outcome8 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[7] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[7] ? outcomesToFetch[7].tokenId : undefined
  );
  const outcome9 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[8] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[8] ? outcomesToFetch[8].tokenId : undefined
  );
  const outcome10 = usePolymarketPriceHistory(
    shouldFetchHistory && outcomesToFetch[9] ? marketIdToFetch : "",
    timeframe,
    shouldFetchHistory && outcomesToFetch[9] ? outcomesToFetch[9].tokenId : undefined
  );
  
  const outcomeHistories = [outcome1, outcome2, outcome3, outcome4, outcome5, outcome6, outcome7, outcome8, outcome9, outcome10];
  const historyLoading = outcomeHistories.some(h => h.loading);

  const chartData = useMemo(() => {
    try {
      const series = outcomesToFetch.map((outcome, index) => {
        const history = outcomeHistories[index]?.history || [];
        return {
          name: outcome.name,
          data: history.map((point: any) => {
            const timestamp = typeof point.timestamp === 'number' ? point.timestamp : parseInt(String(point.timestamp || 0));
            const price = typeof point.price === 'number' ? point.price : parseFloat(String(point.price || 0));
            return {
              time: timestamp,
              value: price
            };
          }).filter((p: any) => p.time && !isNaN(p.value)),
          color: outcome.color
        };
      }).filter(s => s.data.length > 0);
      
      return series;
    } catch (error) {
      console.error('[Market] Error transforming chart data:', error);
      return [];
    }
  }, [outcomesToFetch, outcomeHistories]);

  const selectedOutcomeData = useMemo(() => {
    if (selectedOutcomeName && allOutcomes.length > 0) {
      return allOutcomes.find((o: any) => o.name === selectedOutcomeName) || null;
    }
    return null;
  }, [selectedOutcomeName, allOutcomes]);

  const yesPrice = useMemo(() => {
    if (selectedOutcomeData) {
      return selectedOutcomeData.price;
    }
    return displayMarket?.yesPrice || 0;
  }, [selectedOutcomeData, displayMarket]);

  const noPrice = useMemo(() => {
    if (selectedOutcomeData) {
      return selectedOutcomeData.noPrice;
    }
    return displayMarket?.noPrice || 0;
  }, [selectedOutcomeData, displayMarket]);

  const currentOutcomePrice = selectedOutcome === "yes" ? yesPrice : noPrice;
  
  const potentialPayout = tradeAmount && currentOutcomePrice > 0 
    ? (parseFloat(tradeAmount) / currentOutcomePrice).toFixed(2) 
    : "0";

  const creationDate = displayMarket?.createdAt || displayMarket?.startDateIso || displayMarket?.startDate || new Date().toISOString();
  const endDate = displayMarket?.endDate || displayMarket?.endDateIso || null;
  
  // Extract category - check category field first, then try to extract from tags if available
  const marketCategory = useMemo(() => {
    if (displayMarket?.category && displayMarket.category !== "" && displayMarket.category !== "Other") {
      return displayMarket.category;
    }
    // Try to extract from tags if category is missing
    const tags = (displayMarket as any)?.tags || [];
    if (tags.length > 0) {
      const validCategories = ["Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"];
      if (typeof tags[0] === 'object' && tags[0] !== null) {
        const categoryTag = tags.find((tag: any) => 
          validCategories.includes(tag.name || tag.label || "")
        ) || tags[0];
        return categoryTag.name || categoryTag.label || categoryTag.slug || "Other";
      } else {
        return tags.find((tag: string) => validCategories.includes(tag)) || tags[0] || "Other";
      }
    }
    return displayMarket?.category || "Other";
  }, [displayMarket]);

  if (marketLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-gray-400">Loading market...</div>
      </div>
    );
  }

  if (marketError || !displayMarket) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="text-red-400 mb-2">Market not found</div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back to Markets
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .market-window-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .market-window-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="h-full overflow-y-auto bg-[#0a0a0a] market-window-scrollbar">
        <div className="max-w-7xl mx-auto p-4">
          {/* Header */}
          <div className="flex-shrink-0 pl-4 pr-6 -pt-2 pb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {displayMarket?.image && (
                  <img 
                    src={displayMarket.image} 
                    alt={displayMarket.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="text-xl font-semibold text-white">{displayMarket?.title}</h1>
                    <button
                      onClick={handleWatchlistToggle}
                      className="transition-opacity hover:opacity-80"
                      title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      <Star 
                        className={`w-5 h-5 transition-colors ${
                          isWatched ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                        }`}
                      />
                    </button>
                    <button
                      onClick={handleCopyMarket}
                      className="transition-opacity hover:opacity-80 flex-shrink-0 w-5 h-5 flex items-center justify-center outline-none focus:outline-none"
                      title="Copy market ID"
                      type="button"
                    >
                      <Copy className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{marketCategory}</span>
                    <span>•</span>
                    <span>
                      {allTimeVolumeFormatted} All-Time Volume
                    </span>
                    <span>•</span>
                    <span>Created {new Date(creationDate).toLocaleDateString()}</span>
                    {endDate && (
                      <>
                        <span>•</span>
                        <span>Ends {new Date(endDate).toLocaleDateString()}</span>
                      </>
                    )}
                    {displayMarket?.description && (
                      <>
                        <span>•</span>
                        <div 
                          className="relative"
                          onMouseEnter={() => setRulesHovered(true)}
                          onMouseLeave={() => setRulesHovered(false)}
                        >
                          <span 
                            className="cursor-pointer hover:text-white transition-colors inline-block"
                            style={{ 
                              padding: '0 2px 2px',
                              margin: '0 -2px 0',
                              backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
                              backgroundSize: '4px 4px',
                              backgroundRepeat: 'repeat-x',
                              backgroundPosition: '2px calc(100% - 1px)'
                            }}
                          >
                            Rules
                          </span>
                          {rulesHovered && (
                            <>
                              <div 
                                className="absolute top-full left-0 w-full h-2"
                                onMouseEnter={() => setRulesHovered(true)}
                                onMouseLeave={() => setRulesHovered(false)}
                              />
                              <div 
                                className="absolute top-full left-0 mt-2 w-96 max-w-[90vw] bg-gray-900 border border-gray-800 rounded-md shadow-xl z-50 p-4"
                                onMouseEnter={() => setRulesHovered(true)}
                                onMouseLeave={() => setRulesHovered(false)}
                              >
                                <div className="text-sm text-gray-300 break-words leading-relaxed mb-3">
                                  {displayMarket.description}
                                </div>
                                {displayMarket?.resolverWallet && (
                                  <div className="pt-3 border-t border-gray-800">
                                    <div className="text-xs text-gray-400 mb-1">Resolver Wallet:</div>
                                    <a
                                      href={`https://polygonscan.com/address/${displayMarket.resolverWallet}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-400 hover:text-blue-300 font-mono break-all underline"
                                    >
                                      {displayMarket.resolverWallet}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/")}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to markets"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pl-4 pr-4 pt-1 pb-6 market-window-scrollbar">
            <div className="flex flex-col lg:flex-row gap-3 items-start">
              {/* Main Content - Left Side */}
              <div className="space-y-3 flex-1 flex flex-col" style={{ maxWidth: 'calc(100% - 320px - 0.75rem)' }}>
                {/* Chart Section */}
                <Card className="p-4 bg-gray-900 border-gray-800 rounded-md">
                  <div className="flex items-center justify-between -mt-2 mb-1 -ml-3">
                    <div className="flex gap-0">
                      {["6H", "1D", "1W", "1M", "MAX"].map((period) => (
                        <button
                          key={period}
                          onClick={() => setTimeframe(period)}
                          className={`px-2 py-0 text-xs transition-colors ${
                            timeframe === period
                              ? "text-white"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                    {chartData.length > 0 && (
                      <div className="flex items-center gap-3 overflow-hidden">
                        {chartData.map((series) => (
                          <div key={series.name} className="flex items-center gap-1.5 flex-shrink-0">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: series.color }}
                            ></div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{series.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className={`w-full ${outcomeNameWraps ? 'h-[336px]' : 'h-[316px]'}`}>
                    {historyLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400">Loading chart data...</div>
                      </div>
                    ) : !chartData.length || chartData.every(s => s.data.length === 0) ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400">Log in to see price history</div>
                      </div>
                    ) : chartData.length > 0 ? (
                      <TradingViewMultiSeriesChart
                        height={outcomeNameWraps ? 350 : 330}
                        series={chartData
                          .filter(series => series.data && series.data.length > 0)
                          .map(series => ({
                            name: series.name,
                            data: series.data,
                            color: series.color,
                            lineColor: series.color,
                            type: "area"
                          }))}
                        priceFormat={{ type: 'price', precision: 2 }}
                        backgroundColor="#111827"
                        fixedYAxisRange={{ min: 0, max: 1 }}
                        expandRight={16}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400">No chart data available</div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Market Outcomes */}
                <Card className="bg-[#111111] border border-gray-800 rounded-md" style={{ width: 'calc(100% + 330px)' }}>
                  {isYesNoMarket ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className="p-4 bg-green-900/20 border border-green-800 rounded-lg cursor-pointer hover:bg-green-900/30 transition-colors"
                        onClick={() => {
                          setSelectedOutcome("yes");
                          setSelectedOutcomePrice(displayMarket?.yesPrice || 0);
                          setSelectedOutcomeName(null);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium" style={{ color: '#14532d' }}>Yes</span>
                          <span className="text-white text-lg font-normal">
                            {formatYesPrice(displayMarket?.yesPrice || 0)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {((displayMarket?.yesPrice || 0) * 100).toFixed(1)}% chance
                        </div>
                        <div className="mt-2 bg-green-600 h-2 rounded-full" 
                             style={{ width: `${((displayMarket?.yesPrice || 0) * 100)}%` }} />
                      </div>

                      <div 
                        className="p-4 bg-red-900/20 border border-red-800 rounded-lg cursor-pointer hover:bg-red-900/30 transition-colors"
                        onClick={() => {
                          setSelectedOutcome("no");
                          setSelectedOutcomePrice(displayMarket?.noPrice || 0);
                          setSelectedOutcomeName(null);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium" style={{ color: '#7f1d1d' }}>No</span>
                          <span className="text-white text-lg font-normal">
                            {formatNoPrice(displayMarket?.noPrice || 0)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {((displayMarket?.noPrice || 0) * 100).toFixed(1)}% chance
                        </div>
                        <div className="mt-2 bg-red-600 h-2 rounded-full" 
                             style={{ width: `${((displayMarket?.noPrice || 0) * 100)}%` }} />
                      </div>
                    </div>
                  ) : hasMultiChoiceOutcomes && allOutcomes.length > 0 ? (
                    <div className="overflow-x-auto bg-gray-900 rounded-md">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left py-2 px-4 text-xs font-medium text-gray-400">Outcome</th>
                            <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">Volume</th>
                            <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">24hr Volume</th>
                            <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">7D Change</th>
                            <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">Liquidity</th>
                            <th className="py-2 px-4 text-xs font-medium text-gray-400 text-center">Prices</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allOutcomes.map((outcome: any, index: number) => (
                            <tr
                              key={index}
                              className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                                selectedOutcomeName === outcome.name
                                  ? "bg-gray-800/50"
                                  : "hover:bg-gray-800/30"
                              } ${outcome.isResolved ? "opacity-60" : ""}`}
                              onClick={() => {
                                if (!outcome.isResolved) {
                                  setSelectedOutcome("yes");
                                  setSelectedOutcomePrice(outcome.price);
                                  setSelectedOutcomeName(outcome.name);
                                }
                              }}
                            >
                              <td className="py-2 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden rounded">
                                    {outcome.image ? (
                                      <img 
                                        src={outcome.image} 
                                        alt={outcome.name}
                                        className="w-full h-full object-cover"
                                        onError={e => {
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    ) : null}
                                    <div className={`w-6 h-6 bg-gray-600 ${outcome.image ? 'hidden' : ''}`}></div>
                                  </div>
                                  <span className="text-sm font-medium text-white truncate">{outcome.name}</span>
                                </div>
                              </td>
                              
                              <td className="py-2 px-4 text-right">
                                <span className="text-sm text-gray-300">
                                  {(() => {
                                    let volumeNum = 0;
                                    if (typeof outcome.volume === 'string') {
                                      volumeNum = parseFloat(outcome.volume.replace(/[^0-9.]/g, '')) || 0;
                                    } else {
                                      volumeNum = Number(outcome.volume || 0);
                                    }
                                    return `$${Math.floor(volumeNum).toLocaleString()}`;
                                  })()}
                                </span>
                              </td>
                              
                              <td className="py-2 px-4 text-right">
                                <span className="text-sm text-gray-300">
                                  {(() => {
                                    let volumeNum = 0;
                                    const vol24 = (outcome as any).volume24hr ?? (outcome as any).volume24hrNum;
                                    if (typeof vol24 === 'string') {
                                      volumeNum = parseFloat(vol24.replace(/[^0-9.]/g, '')) || 0;
                                    } else if (typeof vol24 === 'number') {
                                      volumeNum = vol24 || 0;
                                    } else {
                                      if (typeof outcome.volume === 'string') {
                                        volumeNum = parseFloat(outcome.volume.replace(/[^0-9.]/g, '')) || 0;
                                      } else {
                                        volumeNum = Number(outcome.volume || 0);
                                      }
                                    }
                                    return `$${Math.floor(volumeNum).toLocaleString()}`;
                                  })()}
                                </span>
                              </td>
                              
                              <td className="py-2 px-4 text-right">
                                <span 
                                  className="text-sm font-medium"
                                  style={{
                                    color: (() => {
                                      const change = (outcome as any).oneWeekPriceChange;
                                      if (change == null) return '#9CA3AF';
                                      return change >= 0 ? '#10b981' : '#ef4444';
                                    })()
                                  }}
                                >
                                  {(() => {
                                    const change = (outcome as any).oneWeekPriceChange;
                                    if (change == null) return '—';
                                    const percentage = Number(change) * 100;
                                    const sign = percentage >= 0 ? '+' : '';
                                    return `${sign}${percentage.toFixed(2)}%`;
                                  })()}
                                </span>
                              </td>
                              
                              <td className="py-2 px-4 text-right">
                                <span className="text-sm text-gray-300">
                                  {(() => {
                                    const liquidityClob = (outcome as any).liquidityClob;
                                    if (liquidityClob != null) {
                                      if (typeof liquidityClob === 'string') {
                                        return liquidityClob.startsWith('$') ? liquidityClob : `$${liquidityClob}`;
                                      } else if (typeof liquidityClob === 'number') {
                                        return `$${Math.floor(liquidityClob).toLocaleString()}`;
                                      }
                                    }
                                    return '—';
                                  })()}
                                </span>
                              </td>
                              
                              <td className="py-2 px-4">
                                {!outcome.isResolved ? (
                                  <div className="flex items-center gap-0 justify-end">
                                    <div 
                                      className="bg-green-900 hover:bg-green-800 transition-colors px-2 py-1 text-xs text-center w-16 cursor-pointer rounded-md"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOutcome("yes");
                                        setSelectedOutcomePrice(outcome.price);
                                        setSelectedOutcomeName(outcome.name);
                                      }}
                                    >
                                      <span className="text-white font-normal">{formatYesPrice(outcome.price)}</span>
                                    </div>
                                    <div 
                                      className="bg-red-900 hover:bg-red-800 transition-colors px-2 py-1 text-xs text-center w-16 cursor-pointer rounded-md"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOutcome("no");
                                        setSelectedOutcomePrice(outcome.noPrice);
                                        setSelectedOutcomeName(outcome.name);
                                      }}
                                    >
                                      <span className="text-white font-normal">{formatNoPrice(outcome.noPrice)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 text-right">Resolved</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium" style={{ color: '#14532d' }}>Yes</span>
                          <span className="text-white text-lg font-normal">
                            {formatYesPrice(displayMarket?.yesPrice || 0)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {((displayMarket?.yesPrice || 0) * 100).toFixed(1)}% chance
                        </div>
                        <div className="mt-2 bg-green-600 h-2 rounded-full" 
                             style={{ width: `${((displayMarket?.yesPrice || 0) * 100)}%` }} />
                      </div>

                      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium" style={{ color: '#7f1d1d' }}>No</span>
                          <span className="text-white text-lg font-normal">
                            {formatNoPrice(displayMarket?.noPrice || 0)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {((displayMarket?.noPrice || 0) * 100).toFixed(1)}% chance
                        </div>
                        <div className="mt-2 bg-red-600 h-2 rounded-full" 
                             style={{ width: `${((displayMarket?.noPrice || 0) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Trading Sidebar - Right Side */}
              <div className="space-y-3" style={{ width: '320px', flexShrink: 0 }}>
                <Card className="p-4 bg-gray-900 border-gray-800 rounded-md">
                  <div className="flex items-center justify-between -mt-2 mb-2">
                    {selectedOutcomeName ? (
                      <h3 ref={outcomeNameRef} className="text-sm font-medium text-white break-words">{selectedOutcomeName}</h3>
                    ) : (
                      <div></div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTradeType("buy")}
                          className={`text-xs font-medium transition-colors cursor-pointer ${
                            tradeType === "buy"
                              ? "text-white"
                              : "text-gray-500"
                          }`}
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => setTradeType("sell")}
                          className={`text-xs font-medium transition-colors cursor-pointer ${
                            tradeType === "sell"
                              ? "text-white"
                              : "text-gray-500"
                          }`}
                        >
                          Sell
                        </button>
                      </div>
                      <div className="h-4 w-px bg-gray-600"></div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOrderType("market")}
                          className={`text-xs font-medium transition-colors cursor-pointer ${
                            orderType === "market"
                              ? "text-white"
                              : "text-gray-500"
                          }`}
                        >
                          Market
                        </button>
                        <button
                          onClick={() => setOrderType("limit")}
                          className={`text-xs font-medium transition-colors cursor-pointer ${
                            orderType === "limit"
                              ? "text-white"
                              : "text-gray-500"
                          }`}
                        >
                          Limit
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex mb-3">
                    <button
                      onClick={() => {
                        setSelectedOutcome("yes");
                        if (selectedOutcomeData) {
                          setSelectedOutcomePrice(selectedOutcomeData.price);
                        } else {
                          setSelectedOutcomePrice(null);
                          setSelectedOutcomeName(null);
                        }
                      }}
                      className={`py-2.5 px-3 transition-colors flex-1 rounded-l-md ${
                        selectedOutcome === "yes"
                          ? "hover:opacity-90"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                      style={selectedOutcome === "yes" ? { backgroundColor: '#14532d' } : {}}
                    >
                      <div className="text-xs text-white font-light">
                        {formatYesPrice(yesPrice)}
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOutcome("no");
                        if (selectedOutcomeData) {
                          setSelectedOutcomePrice(selectedOutcomeData.noPrice);
                        } else {
                          setSelectedOutcomePrice(null);
                          setSelectedOutcomeName(null);
                        }
                      }}
                      className={`py-1.5 px-3 transition-colors flex-1 rounded-r-md ${
                        selectedOutcome === "no"
                          ? "hover:opacity-90"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                      style={selectedOutcome === "no" ? { backgroundColor: '#7f1d1d' } : {}}
                    >
                      <div className="text-xs text-white font-light">
                        {formatNoPrice(noPrice)}
                      </div>
                    </button>
                  </div>

                  <div className="mb-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Available to Trade</span>
                      <span className="text-xs text-white">$1000.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Current Position</span>
                      <span className="text-xs text-white">0 shares</span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">Size</span>
                      <div className="w-full pl-20 pr-20 py-3 bg-gray-900 border border-gray-600 rounded-md"></div>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <input
                          type="number"
                          value={tradeAmount}
                          onChange={(e) => {
                            const newAmount = e.target.value;
                            setTradeAmount(newAmount);
                            const availableBalance = 1000;
                            if (availableBalance > 0 && newAmount) {
                              const newPercentage = Math.min(100, Math.max(0, (parseFloat(newAmount) / availableBalance) * 100));
                              setPercentage(Math.round(newPercentage));
                            } else {
                              setPercentage(0);
                            }
                          }}
                          placeholder="0.00"
                          className="w-20 text-right bg-transparent border-none text-xs text-white font-light placeholder-gray-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="relative amount-unit-dropdown">
                          <button
                            onClick={() => setAmountUnitDropdownOpen(!amountUnitDropdownOpen)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            <span>{amountUnit}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {amountUnitDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 min-w-[80px]">
                              <button
                                onClick={() => {
                                  setAmountUnit("USD");
                                  setAmountUnitDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                                  amountUnit === "USD"
                                    ? "text-white bg-gray-700"
                                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                                }`}
                              >
                                USD
                              </button>
                              <button
                                onClick={() => {
                                  setAmountUnit("Shares");
                                  setAmountUnitDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                                  amountUnit === "Shares"
                                    ? "text-white bg-gray-700"
                                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                                }`}
                              >
                                Shares
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-2 mt-0">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative py-2 ml-2">
                        <div className="relative h-2 bg-gray-800 rounded-full">
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full flex justify-between items-center pointer-events-none">
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                          </div>
                          <div 
                            className="absolute left-0 top-0 h-full bg-blue-800 rounded-full transition-all pointer-events-none"
                            style={{ width: `${percentage}%` }}
                          ></div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={percentage}
                            onChange={(e) => {
                              const newPercentage = parseInt(e.target.value);
                              setPercentage(newPercentage);
                              const availableBalance = 1000;
                              const newAmount = (availableBalance * newPercentage / 100).toFixed(2);
                              setTradeAmount(newAmount);
                            }}
                            className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer z-20"
                            style={{ WebkitAppearance: 'none', appearance: 'none' }}
                          />
                          <div 
                            className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all pointer-events-none z-10"
                            style={{ left: `calc(${percentage}% - 6px)` }}
                          ></div>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={percentage}
                          onChange={(e) => {
                            const newPercentage = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setPercentage(newPercentage);
                            const availableBalance = 1000;
                            const newAmount = (availableBalance * newPercentage / 100).toFixed(2);
                            setTradeAmount(newAmount);
                          }}
                          className="w-14 pl-2 pr-6 py-1 bg-gray-900 border border-gray-600 text-xs text-white font-light placeholder-gray-500 focus:border-blue-500 focus:outline-none rounded-md text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">%</span>
                      </div>
                    </div>
                  </div>

                  {tradeAmount && (
                    <div className="bg-gray-800 px-4 py-2 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-gray-400">You receive</span>
                        <span className="text-sm text-white">{potentialPayout} shares</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Potential payout</span>
                        <span className="text-sm font-semibold" style={{ color: '#1f7a47' }}>${potentialPayout}</span>
                      </div>
                    </div>
                  )}

                  <button
                    className="button-3d w-full relative border-none bg-transparent p-0 cursor-pointer outline-offset-4 transition-[filter] duration-[250ms] select-none touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.filter = 'brightness(110%)';
                        const front = e.currentTarget.querySelector('.button-3d-front') as HTMLElement;
                        const shadow = e.currentTarget.querySelector('.button-3d-shadow') as HTMLElement;
                        if (front) {
                          front.style.transform = 'translateY(-6px)';
                          front.style.transition = 'transform 250ms cubic-bezier(.3, .7, .4, 1.5)';
                        }
                        if (shadow) {
                          shadow.style.transform = 'translateY(4px)';
                          shadow.style.transition = 'transform 250ms cubic-bezier(.3, .7, .4, 1.5)';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                      const front = e.currentTarget.querySelector('.button-3d-front') as HTMLElement;
                      const shadow = e.currentTarget.querySelector('.button-3d-shadow') as HTMLElement;
                      if (front) {
                        front.style.transform = 'translateY(-4px)';
                        front.style.transition = 'transform 600ms cubic-bezier(.3, .7, .4, 1)';
                      }
                      if (shadow) {
                        shadow.style.transform = 'translateY(2px)';
                        shadow.style.transition = 'transform 600ms cubic-bezier(.3, .7, .4, 1)';
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!e.currentTarget.disabled) {
                        const front = e.currentTarget.querySelector('.button-3d-front') as HTMLElement;
                        const shadow = e.currentTarget.querySelector('.button-3d-shadow') as HTMLElement;
                        if (front) {
                          front.style.transform = 'translateY(-2px)';
                          front.style.transition = 'transform 34ms';
                        }
                        if (shadow) {
                          shadow.style.transform = 'translateY(1px)';
                          shadow.style.transition = 'transform 34ms';
                        }
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!e.currentTarget.disabled) {
                        const front = e.currentTarget.querySelector('.button-3d-front') as HTMLElement;
                        const shadow = e.currentTarget.querySelector('.button-3d-shadow') as HTMLElement;
                        if (front) {
                          front.style.transform = 'translateY(-6px)';
                          front.style.transition = 'transform 250ms cubic-bezier(.3, .7, .4, 1.5)';
                        }
                        if (shadow) {
                          shadow.style.transform = 'translateY(4px)';
                          shadow.style.transition = 'transform 250ms cubic-bezier(.3, .7, .4, 1.5)';
                        }
                      }
                    }}
                  >
                    <span 
                      className="button-3d-shadow absolute top-0 left-0 w-full h-full rounded-xl bg-black/25 will-change-transform transition-transform duration-[600ms]"
                      style={{
                        transform: 'translateY(2px)',
                        transitionTimingFunction: 'cubic-bezier(.3, .7, .4, 1)',
                      }}
                    ></span>
                    <span 
                      className="absolute top-0 left-0 w-full h-full rounded-xl"
                      style={{
                        background: selectedOutcome === 'yes' 
                          ? 'linear-gradient(to left, rgba(20, 83, 45, 0.2) 0%, rgba(20, 83, 45, 0.25) 8%, rgba(20, 83, 45, 0.25) 92%, rgba(20, 83, 45, 0.2) 100%)'
                          : 'linear-gradient(to left, rgba(127, 29, 29, 0.2) 0%, rgba(127, 29, 29, 0.25) 8%, rgba(127, 29, 29, 0.25) 92%, rgba(127, 29, 29, 0.2) 100%)',
                      }}
                    ></span>
                    <span 
                      className="button-3d-front block relative py-3 px-6 rounded-xl text-sm font-medium text-white will-change-transform transition-transform duration-[600ms]"
                      style={{
                        background: selectedOutcome === 'yes' ? '#14532d' : '#7f1d1d',
                        transform: 'translateY(-4px)',
                        transitionTimingFunction: 'cubic-bezier(.3, .7, .4, 1)',
                      }}
                    >
                      Trade
                    </span>
                  </button>

                  <div className="mt-2.5 -mb-2 text-xs text-gray-500 text-center">
                    By trading, you agree to the Terms of Use
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Notification Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
          <Copy className="w-4 h-4 text-green-400" />
          <span className="text-sm text-white">Market id copied to clipboard</span>
        </div>
      </div>
    </>
  );
}
