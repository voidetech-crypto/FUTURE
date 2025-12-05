import { useState, useEffect, useMemo } from "react";
import { Star, Trash2, LineChart } from "lucide-react";
import { formatYesPrice, formatNoPrice } from "@/react-app/utils/priceFormat";
import MarketWindow from "@/react-app/components/trading/MarketWindow";

export default function WatchlistRow() {
  // Selected market for MarketWindow
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  
  // Watchlist state - store in localStorage for persistence (use array to maintain insertion order)
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [watchedOutcomes, setWatchedOutcomes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('watchedOutcomes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activePositions, setActivePositions] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('activePositions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [activeFilter, setActiveFilter] = useState<"watchlist" | "positions">("watchlist");
  const [marketCache, setMarketCache] = useState<Record<string, any>>(() => {
    // Load cache from localStorage on mount
    try {
      const cached = localStorage.getItem('watchlist_market_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 10 minutes
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          return data || {};
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return {};
  });
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // Listen for watchlist changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('watchlist');
        setWatchlist(saved ? JSON.parse(saved) : []);
      } catch {
        setWatchlist([]);
      }
      try {
        const savedPositions = localStorage.getItem('activePositions');
        setActivePositions(savedPositions ? new Set(JSON.parse(savedPositions)) : new Set());
      } catch {
        setActivePositions(new Set());
      }
      try {
        const savedOutcomes = localStorage.getItem('watchedOutcomes');
        setWatchedOutcomes(savedOutcomes ? JSON.parse(savedOutcomes) : []);
      } catch {
        setWatchedOutcomes([]);
      }
    };

    // Listen for custom watchlist/positions update events
    window.addEventListener('watchlistUpdated', handleStorageChange);
    window.addEventListener('activePositionsUpdated', handleStorageChange);
    window.addEventListener('watchedOutcomesUpdated', handleStorageChange);
    // Also listen for storage events (other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Check localStorage on interval as fallback
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('watchlistUpdated', handleStorageChange);
      window.removeEventListener('activePositionsUpdated', handleStorageChange);
      window.removeEventListener('watchedOutcomesUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Toggle watchlist
  const handleWatchlistToggle = (marketId: string) => {
    const wasInWatchlist = watchlist.includes(marketId);
    
    // Update watchlist - maintain insertion order (new items go to the right)
    let newWatchlist: string[];
    if (wasInWatchlist) {
      // Remove from watchlist
      newWatchlist = watchlist.filter(id => id !== marketId);
    } else {
      // Add to the end (right side) of the watchlist
      newWatchlist = [...watchlist, marketId];
    }
    
    // Update watched outcomes - remove all outcomes for this market when removing from watchlist
    let newWatchedOutcomes: string[] = watchedOutcomes;
    let hasOutcomeChanges = false;
    if (wasInWatchlist) {
      // Remove all outcomes for this market
      newWatchedOutcomes = watchedOutcomes.filter(key => !key.startsWith(`${marketId}:`));
      hasOutcomeChanges = newWatchedOutcomes.length !== watchedOutcomes.length;
    }
    
    // Update state
    setWatchlist(newWatchlist);
    if (hasOutcomeChanges) {
      setWatchedOutcomes(newWatchedOutcomes);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
      window.dispatchEvent(new CustomEvent('watchlistUpdated'));
      
      if (hasOutcomeChanges) {
        localStorage.setItem('watchedOutcomes', JSON.stringify(newWatchedOutcomes));
        window.dispatchEvent(new CustomEvent('watchedOutcomesUpdated'));
      }
    } catch (e) {
      console.error('Failed to save watchlist:', e);
    }
  };

  // Combine watchlist markets and watched outcomes for display
  // Maintain insertion order - new items appear on the right
  const displaySet = useMemo(() => {
    if (activeFilter === "watchlist") {
      // Start with watchlist markets in their insertion order
      const marketIds: string[] = [...watchlist];
      // Add market IDs from watched outcomes that aren't already in the watchlist
      watchedOutcomes.forEach((outcomeKey) => {
        const [marketId] = outcomeKey.split(':');
        if (marketId && !marketIds.includes(marketId)) {
          marketIds.push(marketId); // Add to the end (right side)
        }
      });
      return new Set(marketIds);
    } else {
      return activePositions;
    }
  }, [activeFilter, watchlist, watchedOutcomes, activePositions]);
  
  const emptyMessage = activeFilter === "watchlist" ? "No markets in watchlist" : "No active positions";
  // Maintain order: use watchlist order first, then add watched outcomes markets
  const displayIds = useMemo(() => {
    if (activeFilter === "watchlist") {
      const orderedIds: string[] = [...watchlist];
      watchedOutcomes.forEach((outcomeKey) => {
        const [marketId] = outcomeKey.split(':');
        if (marketId && !orderedIds.includes(marketId)) {
          orderedIds.push(marketId);
        }
      });
      return orderedIds;
    }
    return Array.from(displaySet);
  }, [activeFilter, watchlist, watchedOutcomes, displaySet]);
  const displayKey = useMemo(() => displayIds.join(','), [displayIds]);
  const displayMarkets = displayIds
    .map((id) => marketCache[id])
    .filter(Boolean);

  useEffect(() => {
    if (displayIds.length === 0) {
      setLoadingMarkets(false);
      return;
    }

    const idsToFetch = displayIds.filter((id) => !marketCache[id]);
    if (idsToFetch.length === 0) {
      setLoadingMarkets(false);
      return;
    }

    let cancelled = false;
    setLoadingMarkets(true);

    const fetchMarketsById = async () => {
      try {
        const results = await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const response = await fetch(`/api/polymarket/markets/${id}`);
              if (!response.ok) {
                return null;
              }
              const result = await response.json();
              return result.success ? result.market : null;
            } catch (err) {
              console.error("Failed to fetch market", id, err);
              return null;
            }
          })
        );

        if (cancelled) return;

        setMarketCache((prev) => {
          const updated = { ...prev };
          idsToFetch.forEach((id, index) => {
            if (results[index]) {
              updated[id] = results[index];
            }
          });
          // Save to localStorage
          try {
            localStorage.setItem('watchlist_market_cache', JSON.stringify({
              data: updated,
              timestamp: Date.now()
            }));
          } catch (e) {
            // Ignore cache errors
          }
          return updated;
        });
      } finally {
        if (!cancelled) {
          setLoadingMarkets(false);
        }
      }
    };

    fetchMarketsById();

    return () => {
      cancelled = true;
    };
  }, [displayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-shrink-0 border-b border-gray-800 relative" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw', paddingLeft: 'calc(50vw - 50%)', paddingRight: 'calc(50vw - 50%)', paddingTop: 0, paddingBottom: 0, borderBottomWidth: '1px', minHeight: '20px' }}>
      <div className="flex items-center gap-2 overflow-x-auto min-h-[2px] absolute left-0 top-0" style={{ paddingLeft: '0.5rem', paddingTop: 0, paddingBottom: 0, marginTop: '0px', marginBottom: '0px', width: '100%' }}>
        <div className="flex items-center gap-1 pr-1">
          <button
            onClick={() => setActiveFilter("watchlist")}
            className="p-0.5 rounded-full transition-colors flex items-center justify-center"
            aria-pressed={activeFilter === "watchlist"}
            title="Watchlist markets"
          >
            <Star
              className={`w-3 h-3 ${activeFilter === "watchlist" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              strokeWidth={2.5}
            />
          </button>
          <button
            onClick={() => setActiveFilter("positions")}
            className="p-0.5 rounded-full transition-colors flex items-center justify-center"
            aria-pressed={activeFilter === "positions"}
            title="Active positions"
          >
            <LineChart
              className={`w-3 h-3 ${activeFilter === "positions" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              strokeWidth={2.5}
            />
          </button>
        </div>
        <div className="w-px h-7 bg-gray-800 flex-shrink-0" style={{ marginTop: '-8px' }}></div>
        {displayIds.length === 0 ? (
          <div className="text-xs text-gray-500 px-1 flex items-center" style={{ height: '16px' }}>{emptyMessage}</div>
        ) : displayMarkets.length === 0 && loadingMarkets ? (
          <div className="text-xs text-gray-500 px-1 flex items-center" style={{ height: '16px' }}>Loading markets...</div>
        ) : displayMarkets.length === 0 ? (
          <div className="text-xs text-gray-500 px-1 flex items-center" style={{ height: '16px' }}>{emptyMessage}</div>
        ) : (
          displayMarkets
            .map((market: any) => {
              // Check if this market has any watched outcomes
              const marketWatchedOutcomes = watchedOutcomes
                .filter(key => key.startsWith(`${market.id}:`))
                .map(key => key.split(':')[1]);
              
              // Helper function to check if an outcome is resolved
              const isOutcomeResolved = (price: number, noPrice: number): boolean => {
                return Math.abs(price - 1) < 0.001 || Math.abs(price - 0) < 0.001 ||
                       Math.abs(noPrice - 1) < 0.001 || Math.abs(noPrice - 0) < 0.001;
              };
              
              // Determine market type and get prices
              const isYesNoMarket = market.isYesNo === true || 
                (market.isYesNo !== false && market.outcomes && 
                 market.outcomes.length === 2 && 
                 market.outcomes.some((o: string) => o.toLowerCase().includes('yes')) &&
                 market.outcomes.some((o: string) => o.toLowerCase().includes('no')));
              
              const hasMultiChoiceOutcomes = market.topOutcomes && market.topOutcomes.length >= 2;
              
              // If there are watched outcomes for this market, show those instead of the top outcome
              let topPrice = 0;
              let topNoPrice = 0;
              let topOutcomeName = '';
              
              if (marketWatchedOutcomes.length > 0 && market.topOutcomes) {
                // Find the watched outcome in topOutcomes
                const watchedOutcome = market.topOutcomes.find((outcome: any) => 
                  marketWatchedOutcomes.includes(outcome.name)
                );
                
                if (watchedOutcome) {
                  topPrice = Number(watchedOutcome.price) || 0;
                  topNoPrice = watchedOutcome.noPrice !== undefined 
                    ? Number(watchedOutcome.noPrice) 
                    : (1 - topPrice);
                  topOutcomeName = watchedOutcome.name || '';
                }
              }
              
              // If no watched outcome found or no watched outcomes, use default logic
              if (!topOutcomeName) {
                if (isYesNoMarket) {
                  topPrice = Number(market.yesPrice) || 0;
                  topNoPrice = Number(market.noPrice) || 0;
                  // For Yes/No markets, check if market is resolved
                  if (!isOutcomeResolved(topPrice, topNoPrice)) {
                    // Market is not resolved, use Yes outcome
                    if (market.outcomes && market.outcomes.length > 0) {
                      const yesOutcome = market.outcomes.find((o: string) => o.toLowerCase().includes('yes'));
                      topOutcomeName = yesOutcome || market.outcomes[0] || '';
                    }
                  } else {
                    // Market is resolved, don't show it (or show placeholder)
                    topPrice = 0;
                    topNoPrice = 0;
                    topOutcomeName = '';
                  }
                } else {
                  // Multi-choice markets: filter out resolved outcomes and pick the one with highest price
                  if (market.topOutcomes && Array.isArray(market.topOutcomes) && market.topOutcomes.length > 0) {
                    // Filter out resolved outcomes and sort by price (highest first)
                    const nonResolvedOutcomes = market.topOutcomes
                      .map((outcome: any) => ({
                        name: outcome.name || '',
                        price: Number(outcome.price) || 0,
                        noPrice: outcome.noPrice !== undefined ? Number(outcome.noPrice) : (1 - (Number(outcome.price) || 0))
                      }))
                      .filter((outcome: any) => !isOutcomeResolved(outcome.price, outcome.noPrice))
                      .sort((a: any, b: any) => b.price - a.price); // Sort by price descending
                    
                    if (nonResolvedOutcomes.length > 0) {
                      const topOutcome = nonResolvedOutcomes[0];
                      topPrice = topOutcome.price;
                      topNoPrice = topOutcome.noPrice;
                      topOutcomeName = topOutcome.name;
                    } else {
                      // All outcomes are resolved
                      topPrice = 0;
                      topNoPrice = 0;
                      topOutcomeName = '';
                    }
                  } else if (market.outcomes && market.outcomes.length > 0) {
                    // Fallback to outcomes array if topOutcomes not available
                    topOutcomeName = market.outcomes[0] || '';
                    // Try to get price from yesPrice/noPrice if available
                    topPrice = Number(market.yesPrice) || 0;
                    topNoPrice = Number(market.noPrice) || (1 - topPrice);
                    // Check if resolved
                    if (isOutcomeResolved(topPrice, topNoPrice)) {
                      topPrice = 0;
                      topNoPrice = 0;
                      topOutcomeName = '';
                    }
                  }
                }
              }
              
              // Get first 12 characters of title
              const shortTitle = market.title ? market.title.substring(0, 12) : '';
              
              // Format outcome name: first 3 letters of each word
              const formatOutcomeName = (name: string) => {
                if (!name) return '';
                return name.split(' ')
                  .map(word => word.substring(0, 3))
                  .join(' ');
              };
              const shortOutcomeName = formatOutcomeName(topOutcomeName);
              
              return (
                <div
                  key={market.id}
                  onClick={() => setSelectedMarket(market)}
                  className="group flex items-center gap-1 cursor-pointer flex-shrink-0"
                  style={{ height: '16px' }}
                >
                  <div className="w-4 h-4 bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {market.image ? (
                      <img
                        src={market.image}
                        alt={market.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-3 h-3 bg-gray-600 rounded ${market.image ? 'hidden' : ''}`}></div>
                  </div>
                  <span className="text-xs text-white whitespace-nowrap">{shortTitle}</span>
                  {shortOutcomeName && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">{shortOutcomeName}</span>
                  )}
                  <span className="text-xs text-green-800 whitespace-nowrap">{formatYesPrice(topPrice)}</span>
                  <span className="text-xs text-red-800 whitespace-nowrap">{formatNoPrice(topNoPrice)}</span>
                  {activeFilter === "watchlist" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWatchlistToggle(market.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-0.5"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                    </button>
                  )}
                </div>
              );
            })
        )}
      </div>
      
      {/* Market Window Overlay */}
      <MarketWindow 
        market={selectedMarket} 
        isOpen={!!selectedMarket}
        onClose={() => setSelectedMarket(null)}
      />
    </div>
  );
}

