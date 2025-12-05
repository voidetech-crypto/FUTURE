import { useState, useEffect, useMemo, useRef } from "react";
import { X, DollarSign, Calendar, TrendingUp, BarChart3, ChevronDown, Star, Copy } from "lucide-react";
import { Button } from "@/react-app/components/ui/Button";
import { Card } from "@/react-app/components/ui/Card";
import { usePolymarketMarket, usePolymarketPriceHistory } from "@/react-app/hooks/usePolymarketData";
import TradingViewMultiSeriesChart from "@/react-app/components/ui/TradingViewMultiSeriesChart";
import { formatYesPrice, formatNoPrice, formatPriceInCents } from "@/react-app/utils/priceFormat";

interface MarketWindowProps {
  market: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function MarketWindow({ market, isOpen, onClose }: MarketWindowProps) {
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
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [rulesHovered, setRulesHovered] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [outcomeNameWraps, setOutcomeNameWraps] = useState(false);
  const [watchedOutcomes, setWatchedOutcomes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('watchedOutcomes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  // Store market in ref to persist during close animation
  const marketRef = useRef<any>(null);
  const outcomeNameRef = useRef<HTMLHeadingElement>(null);
  
  // Use stored market for rendering (persists during close animation)
  const currentMarket = market || marketRef.current;
  
  // Get market ID - try multiple possible ID fields
  const marketIdToFetch = currentMarket?.id || currentMarket?.questionID || currentMarket?.question_id || currentMarket?.conditionId || "";
  
  // Log market data with all possible ID fields
  useEffect(() => {
    console.log("MarketWindow - Props market:", market);
    console.log("MarketWindow - Current market:", currentMarket);
    console.log("MarketWindow - market ID fields:", {
      id: currentMarket?.id,
      questionID: currentMarket?.questionID,
      question_id: currentMarket?.question_id,
      conditionId: currentMarket?.conditionId,
      selectedId: marketIdToFetch
    });
  }, [market, currentMarket, marketIdToFetch]);

  // Fetch full market details when window opens
  const { market: fullMarket, loading: marketLoading, error: marketError } = usePolymarketMarket(marketIdToFetch);

  // Log market data
  useEffect(() => {
    console.log("MarketWindow - marketLoading:", marketLoading);
    console.log("MarketWindow - marketError:", marketError);
    console.log("MarketWindow - fullMarket:", fullMarket);
  }, [marketLoading, marketError, fullMarket]);

  // Store market when it's available
  useEffect(() => {
    if (market) {
      marketRef.current = market;
    }
  }, [market]);

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
        const watchlist: string[] = saved ? JSON.parse(saved) : [];
        const marketId = marketIdToFetch;
        setIsWatched(watchlist.includes(marketId));
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
      const watchlist: string[] = saved ? JSON.parse(saved) : [];
      const marketId = marketIdToFetch;
      
      let newWatchlist: string[];
      if (watchlist.includes(marketId)) {
        // Remove from watchlist
        newWatchlist = watchlist.filter(id => id !== marketId);
      } else {
        // Add to the end (right side) of the watchlist
        newWatchlist = [...watchlist, marketId];
      }
      
      localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
      window.dispatchEvent(new CustomEvent('watchlistUpdated'));
      setIsWatched(newWatchlist.includes(marketId));
    } catch (e) {
      console.error('Failed to toggle watchlist:', e);
    }
  };

  // Toggle outcome watchlist
  const handleOutcomeWatchlistToggle = (outcome: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    try {
      // Use the actual market ID - prioritize fullMarket.id (from API) as it matches what WatchlistRow uses
      // Convert to string to ensure consistency
      const actualMarketId = String(
        fullMarket?.id || 
        displayMarket?.id || 
        currentMarket?.id ||
        marketIdToFetch || 
        ""
      );
      
      if (!actualMarketId) {
        console.error('[MarketWindow] No market ID available for outcome watchlist');
        return;
      }
      
      const outcomeId = `${actualMarketId}:${outcome.name}`;
      
      console.log('[MarketWindow] Toggling outcome watchlist:', {
        outcomeName: outcome.name,
        actualMarketId,
        fullMarketId: fullMarket?.id,
        displayMarketId: displayMarket?.id,
        currentMarketId: currentMarket?.id,
        marketIdToFetch,
        outcomeId,
        currentWatchedOutcomes: watchedOutcomes
      });
      
      let newWatchedOutcomes: string[];
      
      if (watchedOutcomes.includes(outcomeId)) {
        // Remove from watched outcomes
        newWatchedOutcomes = watchedOutcomes.filter(id => id !== outcomeId);
        console.log('[MarketWindow] Removing outcome from watchlist');
      } else {
        // Add to the end (right side) of the watched outcomes
        newWatchedOutcomes = [...watchedOutcomes, outcomeId];
        console.log('[MarketWindow] Adding outcome to watchlist');
      }
      
      console.log('[MarketWindow] New watched outcomes:', newWatchedOutcomes);
      
      localStorage.setItem('watchedOutcomes', JSON.stringify(newWatchedOutcomes));
      window.dispatchEvent(new CustomEvent('watchedOutcomesUpdated'));
      setWatchedOutcomes(newWatchedOutcomes);
      
      // Also ensure the market itself is in the main watchlist if any of its outcomes are watched
      const saved = localStorage.getItem('watchlist');
      const watchlist: string[] = saved ? JSON.parse(saved) : [];
      if (!watchlist.includes(actualMarketId) && newWatchedOutcomes.some(id => id.startsWith(`${actualMarketId}:`))) {
        const newWatchlist = [...watchlist, actualMarketId];
        localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
        window.dispatchEvent(new CustomEvent('watchlistUpdated'));
        console.log('[MarketWindow] Added market to watchlist:', actualMarketId);
      }
    } catch (e) {
      console.error('Failed to toggle outcome watchlist:', e);
    }
  };

  // Listen for watched outcomes updates
  useEffect(() => {
    const handleWatchedOutcomesUpdate = () => {
      try {
        const saved = localStorage.getItem('watchedOutcomes');
        setWatchedOutcomes(saved ? JSON.parse(saved) : []);
      } catch {
        setWatchedOutcomes([]);
      }
    };

    window.addEventListener('watchedOutcomesUpdated', handleWatchedOutcomesUpdate);
    window.addEventListener('storage', handleWatchedOutcomesUpdate);
    
    return () => {
      window.removeEventListener('watchedOutcomesUpdated', handleWatchedOutcomesUpdate);
      window.removeEventListener('storage', handleWatchedOutcomesUpdate);
    };
  }, []);

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

  // Handle smooth open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Trigger animation after mount
      setTimeout(() => setIsVisible(true), 10);
    } else {
      // Start fade out animation
      setIsVisible(false);
      // Unmount after animation completes (matching transition duration)
      setTimeout(() => {
        setIsMounted(false);
        // Clear market ref after unmount
        marketRef.current = null;
      }, 400);
    }
  }, [isOpen]);

  // Use full market data if available, otherwise fall back to current market (which persists during close)
  // Always prefer fullMarket when it's loaded (not loading and has data)
  const displayMarket = (!marketLoading && fullMarket) ? fullMarket : currentMarket;
  
  useEffect(() => {
    console.log("MarketWindow - displayMarket:", displayMarket);
    console.log("MarketWindow - displayMarket?.topOutcomes:", displayMarket?.topOutcomes);
    console.log("MarketWindow - displayMarket?.outcomes:", displayMarket?.outcomes);
    console.log("MarketWindow - displayMarket?.isYesNo:", displayMarket?.isYesNo);
  }, [displayMarket]);

  // Compute formatted All-Time Volume from available fields
  const allTimeVolumeFormatted = useMemo(() => {
    // Prefer the exact string from the Overview list item to match MarketOverview
    const overviewVolume = (currentMarket as any)?.volume;
    if (overviewVolume) {
      const volumeStr = String(overviewVolume);
      // Ensure it has a dollar sign (add if missing)
      return volumeStr.startsWith('$') ? volumeStr : `$${volumeStr}`;
    }

    // Next prefer the string from the fully fetched market if available
    const fetchedVolume = (displayMarket as any)?.volume;
    if (fetchedVolume) {
      const volumeStr = String(fetchedVolume);
      // Ensure it has a dollar sign (add if missing)
      return volumeStr.startsWith('$') ? volumeStr : `$${volumeStr}`;
    }

    // Finally, fall back to numeric formatting from volumeNum or parsed volume
    const numericFrom = (value: unknown): number | undefined => {
      if (typeof value === 'number' && isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
        return isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    };

    const volumeNum = numericFrom((displayMarket as any)?.volumeNum)
      ?? numericFrom((currentMarket as any)?.volumeNum)
      ?? numericFrom((displayMarket as any)?.volume)
      ?? numericFrom((currentMarket as any)?.volume)
      ?? 0;

    return `$${Number(volumeNum).toLocaleString()}`;
  }, [displayMarket, currentMarket]);

  // Compute formatted 24hr Volume from available fields
  const volume24hrFormatted = useMemo(() => {
    // Prefer the exact string from the Overview list item
    const overviewVolume24hr = (currentMarket as any)?.volume24hr;
    if (overviewVolume24hr) {
      const volumeStr = String(overviewVolume24hr);
      // Ensure it has a dollar sign (add if missing)
      return volumeStr.startsWith('$') ? volumeStr : `$${volumeStr}`;
    }

    // Next prefer the string from the fully fetched market if available
    const fetchedVolume24hr = (displayMarket as any)?.volume24hr;
    if (fetchedVolume24hr) {
      const volumeStr = String(fetchedVolume24hr);
      // Ensure it has a dollar sign (add if missing)
      return volumeStr.startsWith('$') ? volumeStr : `$${volumeStr}`;
    }

    // Finally, fall back to numeric formatting from volume24hrNum or parsed volume24hr
    const numericFrom = (value: unknown): number | undefined => {
      if (typeof value === 'number' && isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
        return isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    };

    const volume24hrNum = numericFrom((displayMarket as any)?.volume24hrNum)
      ?? numericFrom((currentMarket as any)?.volume24hrNum)
      ?? numericFrom((displayMarket as any)?.volume24hr)
      ?? numericFrom((currentMarket as any)?.volume24hr)
      ?? 0;

    if (volume24hrNum === 0) return "$0";
    
    // Format with K/M suffixes
    if (volume24hrNum >= 1000000) {
      return `$${(volume24hrNum / 1000000).toFixed(2)}M`;
    } else if (volume24hrNum >= 1000) {
      return `$${(volume24hrNum / 1000).toFixed(2)}K`;
    } else {
      return `$${Number(volume24hrNum).toLocaleString()}`;
    }
  }, [displayMarket, currentMarket]);

  // Determine if this is a Yes/No market or multi-choice
  const isYesNoMarket = displayMarket?.isYesNo === true || 
    (displayMarket?.isYesNo !== false && displayMarket?.outcomes && 
     displayMarket.outcomes.length === 2 && 
     displayMarket.outcomes.some((o: string) => o.toLowerCase().includes('yes')) &&
     displayMarket.outcomes.some((o: string) => o.toLowerCase().includes('no')));

  // Helper function to check if an outcome is resolved
  const isOutcomeResolved = (price: number, noPrice: number): boolean => {
    // An outcome is resolved if either price is 1 (or very close to 1) or 0 (or very close to 0)
    return Math.abs(price - 1) < 0.001 || Math.abs(price - 0) < 0.001 ||
           Math.abs(noPrice - 1) < 0.001 || Math.abs(noPrice - 0) < 0.001;
  };

  // Get all outcomes - show ALL outcomes if it's a multi-choice market (not Yes/No)
  const allOutcomes = useMemo(() => {
    // If it's a Yes/No market, don't show outcomes list
    if (isYesNoMarket) return [];
    
    let outcomes: any[] = [];
    
    // If we have topOutcomes with full data, use ALL of them (not just first 2)
    if (displayMarket?.topOutcomes && Array.isArray(displayMarket.topOutcomes) && displayMarket.topOutcomes.length > 0) {
      console.log("MarketWindow - topOutcomes found:", displayMarket.topOutcomes.length, "outcomes");
      // Map all outcomes from topOutcomes
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
          // include 24h volume if present on the outcome
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
    // Fallback: create outcomes from outcomes array if available
    else if (displayMarket?.outcomes && Array.isArray(displayMarket.outcomes) && displayMarket.outcomes.length > 0) {
      // Try to get prices from outcomePrices if available
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
    
    // Sort outcomes: non-resolved first (by likelihood), then resolved outcomes at the bottom
    return outcomes.sort((a, b) => {
      // If one is resolved and the other isn't, put resolved at bottom
      if (a.isResolved && !b.isResolved) return 1;
      if (!a.isResolved && b.isResolved) return -1;
      // If both are resolved or both are not resolved, sort by price (highest first)
      return (b.price || 0) - (a.price || 0);
    });
  }, [displayMarket, isYesNoMarket]);

  // Check if we should show multi-choice outcomes display
  const hasMultiChoiceOutcomes = allOutcomes.length > 0;
  
  // Set default to first (most likely) outcome when market opens or changes
  useEffect(() => {
    if (isOpen && !marketLoading && marketIdToFetch) {
      // Set default trade amount to $1000
      if (!tradeAmount || tradeAmount === "") {
        setTradeAmount("1000");
      }
      
      if (hasMultiChoiceOutcomes && allOutcomes.length > 0) {
        // For multi-choice markets, set first outcome
        const firstOutcome = allOutcomes[0];
        if (firstOutcome && !firstOutcome.isResolved) {
          setSelectedOutcomeName(firstOutcome.name);
          setSelectedOutcome("yes");
          setSelectedOutcomePrice(firstOutcome.price);
        }
      } else if (isYesNoMarket) {
        // For Yes/No markets, ensure default Yes selection
        setSelectedOutcomeName(null);
        setSelectedOutcome("yes");
        setSelectedOutcomePrice(null);
      }
    }
  }, [isOpen, marketLoading, hasMultiChoiceOutcomes, allOutcomes, isYesNoMarket, marketIdToFetch, tradeAmount]);

  // Check if outcome name wraps to multiple lines
  useEffect(() => {
    const checkWrapping = () => {
      if (outcomeNameRef.current) {
        const element = outcomeNameRef.current;
        // Check if the element's scrollHeight is greater than its line height (indicating wrapping)
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 20;
        const isWrapping = element.scrollHeight > lineHeight * 1.5; // Allow some tolerance
        setOutcomeNameWraps(isWrapping);
      } else {
        setOutcomeNameWraps(false);
      }
    };

    // Check immediately and after a short delay to ensure DOM is updated
    checkWrapping();
    const timeoutId = setTimeout(checkWrapping, 100);
    
    // Also check on window resize
    window.addEventListener('resize', checkWrapping);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkWrapping);
    };
  }, [selectedOutcomeName, isOpen]);
  
  useEffect(() => {
    console.log("MarketWindow - allOutcomes:", allOutcomes);
    console.log("MarketWindow - allOutcomes.length:", allOutcomes.length);
    console.log("MarketWindow - hasMultiChoiceOutcomes:", hasMultiChoiceOutcomes);
    console.log("MarketWindow - isYesNoMarket:", isYesNoMarket);
  }, [allOutcomes, hasMultiChoiceOutcomes, isYesNoMarket]);

  // Get token IDs for the selected outcome
  // IMPORTANT: Only return token IDs if they're actually available from clobTokenIds
  // Don't return empty strings which would trigger the fallback CLOB API call
  const selectedOutcomeTokenIds = useMemo(() => {
    console.log(`[MarketWindow] Getting token IDs - selectedOutcomeName: ${selectedOutcomeName}, allOutcomes.length: ${allOutcomes.length}, isYesNoMarket: ${isYesNoMarket}, marketLoading: ${marketLoading}`);
    
    // Wait for market to load before trying to get token IDs
    if (marketLoading || !fullMarket) {
      console.log(`[MarketWindow] Market still loading, returning empty token IDs`);
      return { yesTokenId: "", noTokenId: "" };
    }
    
    // For multi-choice markets, use the selected outcome or default to first
    if (allOutcomes.length > 0) {
      const outcomeToUse = selectedOutcomeName 
        ? allOutcomes.find((o: any) => o.name === selectedOutcomeName)
        : allOutcomes[0]; // Default to first outcome if none selected
      
      if (outcomeToUse) {
        const yesTokenId = (outcomeToUse as any).yesTokenId || "";
        const noTokenId = (outcomeToUse as any).noTokenId || "";
        // Only return token IDs if they're actually present (from clobTokenIds)
        if (yesTokenId && noTokenId) {
          console.log(`[MarketWindow] Using outcome "${outcomeToUse.name}" - Yes Token ID: ${yesTokenId}, No Token ID: ${noTokenId}`);
          return { yesTokenId, noTokenId };
        } else {
          console.log(`[MarketWindow] Outcome "${outcomeToUse.name}" has empty token IDs, waiting for data`);
          return { yesTokenId: "", noTokenId: "" };
        }
      }
    }
    
    // For Yes/No markets, try to get from fullMarket
    if (isYesNoMarket && fullMarket?.topOutcomes && fullMarket.topOutcomes.length > 0) {
      const firstOutcome = fullMarket.topOutcomes[0];
      const yesTokenId = (firstOutcome as any).yesTokenId || "";
      const noTokenId = (firstOutcome as any).noTokenId || "";
      if (yesTokenId && noTokenId) {
        console.log(`[MarketWindow] Yes/No market - Yes Token ID: ${yesTokenId}, No Token ID: ${noTokenId}`);
        return { yesTokenId, noTokenId };
      } else {
        console.log(`[MarketWindow] Yes/No market has empty token IDs, waiting for data`);
        return { yesTokenId: "", noTokenId: "" };
      }
    }
    
    console.log(`[MarketWindow] No token IDs found`);
    return { yesTokenId: "", noTokenId: "" };
  }, [selectedOutcomeName, allOutcomes, isYesNoMarket, fullMarket, marketLoading]);

  // Get all outcomes with valid token IDs for fetching history
  const outcomesWithTokenIds = useMemo(() => {
    if (marketLoading || !fullMarket) return [];
    
    if (isYesNoMarket) {
      // For Yes/No markets, use the single outcome
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
    
    // For multi-choice markets, get all outcomes with token IDs
    // Filter out resolved outcomes - they should not appear in the chart
    // Use distinct colors for each outcome
    const colorPalette = [
      "#1e9a5a", // rich green
      "#dc2626", // rich red
      "#2563eb", // mid blue
      "#f97316", // warm orange
      "#8b5cf6", // violet
      "#0f766e", // teal
      "#10b981", // emerald green (changed from amber to avoid orange similarity)
      "#db2777", // pink
      "#0891b2", // cyan
      "#d9a21f", // golden
    ];
    
    return allOutcomes
      .filter((outcome: any) => outcome.yesTokenId && !outcome.isResolved) // Exclude resolved outcomes
      .map((outcome: any, index: number) => ({
        name: outcome.name,
        tokenId: outcome.yesTokenId,
        color: colorPalette[index % colorPalette.length] || `hsl(${(index * 137.5) % 360}, 70%, 50%)`
      }));
  }, [allOutcomes, isYesNoMarket, fullMarket, marketLoading]);

  // Fetch history for all outcomes - we'll fetch up to 10 outcomes to avoid too many API calls
  const outcomesToFetch = outcomesWithTokenIds.slice(0, 10);
  const shouldFetchHistory = !marketLoading && outcomesToFetch.length > 0;
  
  // Fetch history for each outcome (limited to first 10 to avoid performance issues)
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

  // Transform price history data for TradingView chart
  const chartData = useMemo(() => {
    try {
      const series = outcomesToFetch.map((outcome, index) => {
        const history = outcomeHistories[index]?.history || [];
    return {
          name: outcome.name,
          data: history.map((point: any) => {
            // Ensure timestamp is a valid number
            const timestamp = typeof point.timestamp === 'number' ? point.timestamp : parseInt(String(point.timestamp || 0));
            // Ensure price is a valid number
            const price = typeof point.price === 'number' ? point.price : parseFloat(String(point.price || 0));
            return {
              time: timestamp,
              value: price
            };
          }).filter((p: any) => p.time && !isNaN(p.value)), // Filter out invalid data points
          color: outcome.color
        };
      }).filter(s => s.data.length > 0); // Only include series with data
      
      console.log(`[MarketWindow] Chart data - ${series.length} series with ${series.reduce((sum, s) => sum + s.data.length, 0)} total points`);
      
      return series;
    } catch (error) {
      console.error('[MarketWindow] Error transforming chart data:', error);
      return [];
    }
  }, [outcomesToFetch, outcomeHistories]);

  // Get the selected outcome if one is selected
  const selectedOutcomeData = useMemo(() => {
    if (selectedOutcomeName && allOutcomes.length > 0) {
      return allOutcomes.find((o: any) => o.name === selectedOutcomeName) || null;
    }
    return null;
  }, [selectedOutcomeName, allOutcomes]);

  // Always show the correct Yes price
  const yesPrice = useMemo(() => {
    if (selectedOutcomeData) {
      return selectedOutcomeData.price;
    }
    return displayMarket?.yesPrice || currentMarket?.yesPrice || 0;
  }, [selectedOutcomeData, displayMarket, currentMarket]);

  // Always show the correct No price
  const noPrice = useMemo(() => {
    if (selectedOutcomeData) {
      return selectedOutcomeData.noPrice;
    }
    return displayMarket?.noPrice || currentMarket?.noPrice || 0;
  }, [selectedOutcomeData, displayMarket, currentMarket]);

  // Use selected outcome price for payout calculation
  const currentOutcomePrice = selectedOutcome === "yes" ? yesPrice : noPrice;
  
  const potentialPayout = tradeAmount && currentOutcomePrice > 0 
    ? (parseFloat(tradeAmount) / currentOutcomePrice).toFixed(2) 
    : "0";


  // Format creation date - try to get from market data or use current date as fallback
  const creationDate = displayMarket?.createdAt || displayMarket?.startDateIso || displayMarket?.startDate || new Date().toISOString();
  
  // Format end date - try to get from market data
  const endDate = displayMarket?.endDate || displayMarket?.endDateIso || null;
  
  console.log("MarketWindow - About to render:", {
    isOpen,
    hasMarket: !!currentMarket,
    marketLoading,
    hasFullMarket: !!fullMarket,
    hasDisplayMarket: !!displayMarket,
    displayMarketTitle: displayMarket?.title,
    allOutcomesCount: allOutcomes.length,
    hasMultiChoiceOutcomes,
    isYesNoMarket
  });

  if (!isMounted || !currentMarket) {
    console.log("MarketWindow - Not rendering: isMounted=", isMounted, "currentMarket=", !!currentMarket);
    return null;
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
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto market-window-scrollbar transition-opacity duration-[400ms] ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        } ${!isVisible ? 'pointer-events-none' : ''}`}
        onClick={onClose}
      >
        <div 
          className={`bg-[#0a0a0a] border border-gray-800 rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all duration-[400ms] ease-in-out ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex-shrink-0 pl-4 pr-6 pt-3 pb-2">
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
                  <h1 className="text-xl font-semibold text-white">{displayMarket?.title || currentMarket.title}</h1>
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
                  <span>{displayMarket?.category || currentMarket.category}</span>
                  <span>•</span>
                  <span>
                    {allTimeVolumeFormatted} All-Time Volume
                  </span>
                  <span>•</span>
                  <span>
                    {volume24hrFormatted} 24h Volume
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
                            {/* Invisible bridge to prevent gap */}
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
                              {(fullMarket?.resolverWallet || currentMarket?.resolverWallet) && (
                                <div className="pt-3 border-t border-gray-800">
                                  <div className="text-xs text-gray-400 mb-1">Resolver Wallet:</div>
                                  <a
                                    href={`https://polygonscan.com/address/${fullMarket?.resolverWallet || currentMarket?.resolverWallet}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-400 hover:text-blue-300 font-mono break-all underline"
                                  >
                                    {fullMarket?.resolverWallet || currentMarket?.resolverWallet}
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
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pl-4 pr-4 pt-1 pb-6 market-window-scrollbar">
          <div className="flex flex-col lg:flex-row gap-3 items-start">
            {/* Main Content - Left Side */}
            <div className="space-y-3 flex-1 flex flex-col w-full lg:w-auto" style={{ maxWidth: '100%' }}>
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
                  {/* Color Legend */}
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
              <Card className="bg-[#0a0a0a] border border-gray-800 rounded-md w-full lg:w-auto" style={{ width: '100%' }}>
                {isYesNoMarket ? (
                  // Yes/No Market Display
                  <div className="grid grid-cols-1 gap-4 min-h-[300px]">
                    <div 
                      className="p-4 bg-green-900/20 border border-green-800 rounded-lg cursor-pointer hover:bg-green-900/30 transition-colors"
                      onClick={() => {
                        setSelectedOutcome("yes");
                        setSelectedOutcomePrice(displayMarket?.yesPrice || currentMarket.yesPrice || 0);
                        setSelectedOutcomeName(null);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" style={{ color: '#14532d' }}>Yes</span>
                        <span className="text-white text-lg font-normal">
                          {formatYesPrice(displayMarket?.yesPrice || currentMarket.yesPrice || 0)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {((displayMarket?.yesPrice || currentMarket.yesPrice || 0) * 100).toFixed(1)}% chance
                      </div>
                      <div className="mt-2 bg-green-600 h-2 rounded-full" 
                           style={{ width: `${((displayMarket?.yesPrice || currentMarket.yesPrice || 0) * 100)}%` }} />
                    </div>

                    <div 
                      className="p-4 bg-red-900/20 border border-red-800 rounded-lg cursor-pointer hover:bg-red-900/30 transition-colors"
                      onClick={() => {
                        setSelectedOutcome("no");
                        setSelectedOutcomePrice(displayMarket?.noPrice || currentMarket.noPrice || 0);
                        setSelectedOutcomeName(null);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" style={{ color: '#7f1d1d' }}>No</span>
                        <span className="text-white text-lg font-normal">
                          {formatNoPrice(displayMarket?.noPrice || currentMarket.noPrice || 0)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {((displayMarket?.noPrice || currentMarket.noPrice || 0) * 100).toFixed(1)}% chance
                      </div>
                      <div className="mt-2 bg-red-600 h-2 rounded-full" 
                           style={{ width: `${((displayMarket?.noPrice || currentMarket.noPrice || 0) * 100)}%` }} />
                    </div>
                  </div>
                ) : hasMultiChoiceOutcomes && allOutcomes.length > 0 ? (
                  // Multi-Choice Market Display - Table layout
                  <div className="overflow-x-auto bg-gray-900 rounded-md min-h-[300px]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left py-2 px-4 text-xs font-medium text-gray-400">Outcome</th>
                          <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">Volume</th>
                          <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">24hr Volume</th>
                          <th className="text-right py-2 px-4 text-xs font-medium text-gray-400">7d Change</th>
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
                            {/* Outcome Column */}
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
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="text-sm font-medium text-white truncate">{outcome.name}</span>
                                <button
                                  onClick={(e) => handleOutcomeWatchlistToggle(outcome, e)}
                                  className="p-0.5 hover:bg-gray-800 rounded flex-shrink-0"
                                  title={watchedOutcomes.includes(`${String(fullMarket?.id || displayMarket?.id || currentMarket?.id || marketIdToFetch || "")}:${outcome.name}`) ? "Remove from watchlist" : "Add to watchlist"}
                                >
                                  <Star 
                                    className={`w-4 h-4 ${
                                      watchedOutcomes.includes(`${String(fullMarket?.id || displayMarket?.id || currentMarket?.id || marketIdToFetch || "")}:${outcome.name}`)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-400'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                            </td>
                            
                            {/* Volume Column */}
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
                            
                            {/* 24hr Volume Column */}
                            <td className="py-2 px-4 text-right">
                              <span className="text-sm text-gray-300">
                                {(() => {
                                  let volumeNum = 0;
                                  // Prefer 24h volume if available
                                  const vol24 = (outcome as any).volume24hr ?? (outcome as any).volume24hrNum;
                                  if (typeof vol24 === 'string') {
                                    volumeNum = parseFloat(vol24.replace(/[^0-9.]/g, '')) || 0;
                                  } else if (typeof vol24 === 'number') {
                                    volumeNum = vol24 || 0;
                                  } else {
                                    // Fallback to total volume if 24h not present
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
                            
                            {/* Weekly Change Column */}
                            <td className="py-2 px-4 text-right">
                              <span 
                                className="text-sm font-medium"
                                style={{
                                  color: (() => {
                                    const change = (outcome as any).oneWeekPriceChange;
                                    if (change == null) return '#9CA3AF'; // gray if no data
                                    return change >= 0 ? '#10b981' : '#ef4444'; // green if positive, red if negative
                                  })()
                                }}
                              >
                                {(() => {
                                  const change = (outcome as any).oneWeekPriceChange;
                                  if (change == null) return '—';
                                  // API returns decimal (e.g., -0.005 for -0.5%), multiply by 100 to get percentage
                                  const percentage = Number(change) * 100;
                                  const sign = percentage >= 0 ? '+' : '';
                                  return `${sign}${percentage.toFixed(2)}%`;
                                })()}
                              </span>
                            </td>
                            
                            {/* Liquidity Column */}
                            <td className="py-2 px-4 text-right">
                              <span className="text-sm text-gray-300">
                                {(() => {
                                  // Use liquidityClob from events API (gamma-api.polymarket.com/events/{id})
                                  const liquidityClob = (outcome as any).liquidityClob;
                                  if (liquidityClob != null) {
                                    if (typeof liquidityClob === 'string') {
                                      // If it's already formatted with $, use it; otherwise add $
                                      return liquidityClob.startsWith('$') ? liquidityClob : `$${liquidityClob}`;
                                    } else if (typeof liquidityClob === 'number') {
                                      return `$${Math.floor(liquidityClob).toLocaleString()}`;
                                    }
                                  }
                                  return '—';
                                })()}
                              </span>
                            </td>
                            
                            {/* Prices Column */}
                            <td className="py-2 px-4">
                          {!outcome.isResolved ? (
                            <div className="flex items-center gap-0 justify-end">
                                  <div 
                                    className="bg-green-900 hover:bg-green-800 transition-colors px-2 py-1 text-xs text-center w-16 cursor-pointer"
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
                                    className="bg-red-900 hover:bg-red-800 transition-colors px-2 py-1 text-xs text-center w-16 cursor-pointer"
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
                  // Fallback - Show Yes/No if we can't determine
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
                    <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" style={{ color: '#14532d' }}>Yes</span>
                        <span className="text-white text-lg font-normal">
                          {formatYesPrice(displayMarket?.yesPrice || currentMarket.yesPrice || 0)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {((displayMarket?.yesPrice || currentMarket.yesPrice || 0) * 100).toFixed(1)}% chance
                      </div>
                      <div className="mt-2 bg-green-600 h-2 rounded-full" 
                           style={{ width: `${((displayMarket?.yesPrice || currentMarket.yesPrice || 0) * 100)}%` }} />
                    </div>

                    <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium" style={{ color: '#7f1d1d' }}>No</span>
                        <span className="text-white text-lg font-normal">
                          {formatNoPrice(displayMarket?.noPrice || currentMarket.noPrice || 0)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {((displayMarket?.noPrice || currentMarket.noPrice || 0) * 100).toFixed(1)}% chance
                      </div>
                      <div className="mt-2 bg-red-600 h-2 rounded-full" 
                           style={{ width: `${((displayMarket?.noPrice || currentMarket.noPrice || 0) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </Card>

            </div>

            {/* Trading Sidebar - Right Side */}
            <div className="space-y-3 w-full lg:w-[320px] flex-shrink-0">
              <Card className="p-4 bg-gray-900 border-gray-800 rounded-md">
                {/* Outcome Name Display and Buy/Sell Selector */}
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
                
                {/* Outcome Selection */}
                <div className="flex mb-3">
                  <button
                    onClick={() => {
                      setSelectedOutcome("yes");
                      // If we have a selected outcome, update the price; otherwise reset
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
                      // If we have a selected outcome, update the price; otherwise reset
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

                {/* Available to Trade and Current Position */}
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

                {/* Amount Input */}
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
                          const availableBalance = 1000; // Get from available to trade
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

                {/* Percentage Slider */}
                <div className="mb-2 mt-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative py-2 ml-2">
                      {/* Slider Track */}
                      <div className="relative h-2 bg-gray-800 rounded-full">
                        {/* Marks as dots */}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full flex justify-between items-center pointer-events-none">
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                        </div>
                        {/* Active Track */}
                        <div 
                          className="absolute left-0 top-0 h-full bg-blue-800 rounded-full transition-all pointer-events-none"
                          style={{ width: `${percentage}%` }}
                        ></div>
                        {/* Slider Input - must be on top for interaction */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={percentage}
                          onChange={(e) => {
                            const newPercentage = parseInt(e.target.value);
                            setPercentage(newPercentage);
                            const availableBalance = 1000; // Get from available to trade
                            const newAmount = (availableBalance * newPercentage / 100).toFixed(2);
                            setTradeAmount(newAmount);
                          }}
                          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer z-20"
                          style={{ WebkitAppearance: 'none', appearance: 'none' }}
                        />
                        {/* Slider Thumb */}
                        <div 
                          className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all pointer-events-none z-10"
                          style={{ left: `calc(${percentage}% - 6px)` }}
                        ></div>
                      </div>
                    </div>
                    {/* Percentage Input */}
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => {
                          const newPercentage = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setPercentage(newPercentage);
                          const availableBalance = 1000; // Get from available to trade
                          const newAmount = (availableBalance * newPercentage / 100).toFixed(2);
                          setTradeAmount(newAmount);
                        }}
                        className="w-14 pl-2 pr-6 py-1 bg-gray-900 border border-gray-600 text-xs text-white font-light placeholder-gray-500 focus:border-blue-500 focus:outline-none rounded-md text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Trade Summary */}
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

                {/* Trade Button */}
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
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[101] transition-all duration-300 ${showNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
        <Copy className="w-4 h-4 text-green-400" />
        <span className="text-sm text-white">Event id copied to clipboard</span>
      </div>
    </div>
    </>
  );
}
