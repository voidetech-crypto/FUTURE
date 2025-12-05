import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useNavigate } from "react-router";
import { Search, TrendingUp, Star, Trash2, Copy } from "lucide-react";
import { usePolymarketMarkets } from "@/react-app/hooks/usePolymarketData";
import { usePolymarketSubgraphMarkets } from "@/react-app/hooks/usePolymarketSubgraph";
import { formatYesPrice, formatNoPrice } from "@/react-app/utils/priceFormat";
import { Card } from "@/react-app/components/ui/Card";
// Memoized market row to prevent unnecessary re-renders
const MarketRow = memo(({ market, index, navigate, onMarketClick, showWatchlist, isWatched, onWatchlistToggle, onCopy, isLast }: { market: any; index: number; navigate: (path: string) => void; onMarketClick?: (market: any) => void; showWatchlist?: boolean; isWatched?: boolean; onWatchlistToggle?: (marketId: string) => void; onCopy?: () => void; isLast?: boolean }) => {
  const [copied, setCopied] = useState(false);
  
  // Safety check
  if (!market) {
    return null;
  }

  const handleClick = () => {
    if (onMarketClick) {
      onMarketClick(market);
    } else {
      navigate(`/market/${market.id}`);
    }
  };

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(market.id);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy market ID:', err);
    }
  };

  return (
    <div className={`p-2 cursor-pointer transition-colors group hover:bg-gray-800/50 ${!isLast ? 'border-b border-gray-800' : ''} ${index % 2 === 0 ? 'min-[900px]:border-r border-gray-800' : ''}`} onClick={handleClick}>
      <div className="flex items-center gap-2 justify-between">
        {/* Image box */}
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-md">
          {market.image ? <img src={market.image} alt={market.title} className="w-full h-full object-cover" onError={e => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }} /> : null}
          <div className={`w-8 h-8 bg-gray-600 rounded ${market.image ? 'hidden' : ''}`}></div>
        </div>
        
        {/* Market Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">{market.title}</span>
            <div className="flex items-center gap-1">
              {showWatchlist && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatchlistToggle?.(market.id);
                  }}
                  className={`transition-opacity p-0.5 hover:bg-gray-800 rounded ${isWatched ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Star 
                    className={`w-4 h-4 ${isWatched ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                  />
                </button>
              )}
              <button
                onClick={handleCopy}
                className="transition-opacity p-0.5 hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100"
                title={copied ? "Copied!" : "Copy market ID"}
              >
                <Copy 
                  className={`w-4 h-4 transition-colors ${copied ? 'text-green-400' : 'text-gray-400'}`}
                />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <span>{typeof market.category === 'string' ? market.category : (market.category?.name || market.category?.label || 'Other')}</span>
            {market.endDate && (() => {
              try {
                const endDate = new Date(market.endDate);
                if (!isNaN(endDate.getTime())) {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const day = endDate.getDate();
                  const month = months[endDate.getMonth()];
                  const year = endDate.getFullYear();
                  const daySuffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                  return <span>• {month} {day}{daySuffix} {year}</span>;
                }
              } catch (e) {
                // Invalid date
              }
              return null;
            })()}
            <span>• {market.volume}</span>
            {market.volume24hr && market.volume24hr !== "$0" && (market.volume24hrNum || 0) > 0 && (
              <span>• {market.volume24hr}</span>
            )}
          </div>
        </div>
        
        {/* Prices - Show Yes/No for Yes-No markets (Y top, N bottom), or multi-choice (name + Y/N buttons on both rows) */}
        <div className="w-56 flex flex-col gap-1">
          {(() => {
            // Determine if this is a Yes/No market or multi-choice
            const isYesNoMarket = market.isYesNo === true || 
              (market.isYesNo !== false && market.outcomes && 
               market.outcomes.length === 2 && 
               market.outcomes.some((o: string) => o.toLowerCase().includes('yes')) &&
               market.outcomes.some((o: string) => o.toLowerCase().includes('no')));
            
            const hasMultiChoiceOutcomes = market.topOutcomes && market.topOutcomes.length >= 2 && 
              (market.isYesNo === false || 
               (market.outcomes && market.outcomes.length > 2) ||
               (market.topOutcomes.length > 2));
            
            // Reduced button widths - wider than content but narrower than before
            const buttonWidth = "w-[50px]";
            // For Yes/No markets, each button should match the combined width of two multi-choice buttons (2 * 50px + gap)
            const yesNoButtonWidth = "w-[106px]"; // 2 * 50px + 6px gap
            
            if (isYesNoMarket) {
              // Yes/No markets: YES on top row, NO on bottom row - each button matches multi-choice combined width, centered text
              return (
                <>
                  <div className="flex justify-end">
                    <div className={`bg-green-900 hover:bg-green-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${yesNoButtonWidth}`}>
                      <span className="text-white font-light">{formatYesPrice(market.yesPrice)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className={`bg-red-900 hover:bg-red-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${yesNoButtonWidth}`}>
                      <span className="text-white font-light">{formatNoPrice(market.noPrice)}</span>
                    </div>
                  </div>
                </>
              );
            } else if (hasMultiChoiceOutcomes) {
              // Multi-choice markets: White name on left, then green Y button and red N button on right
              // Use API's noPrice value directly from topOutcomes
              const outcome0Price = Number(market.topOutcomes[0].price) || 0;
              const outcome1Price = Number(market.topOutcomes[1].price) || 0;
              const outcome0NoPrice = Number(market.topOutcomes[0].noPrice) || 0;
              const outcome1NoPrice = Number(market.topOutcomes[1].noPrice) || 0;
              
              return (
                <>
                  <div className="flex items-center gap-1 justify-between w-full">
                    <span className="text-white text-xs flex-shrink-0 truncate max-w-[100px]">{market.topOutcomes[0].name}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <div className={`bg-green-900 hover:bg-green-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${buttonWidth}`}>
                        <span className="text-white font-light">{formatYesPrice(outcome0Price)}</span>
                      </div>
                      <div className={`bg-red-900 hover:bg-red-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${buttonWidth}`}>
                        <span className="text-white font-light">{formatNoPrice(outcome0NoPrice)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 justify-between w-full">
                    <span className="text-white text-xs flex-shrink-0 truncate max-w-[100px]">{market.topOutcomes[1].name}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <div className={`bg-green-900 hover:bg-green-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${buttonWidth}`}>
                        <span className="text-white font-light">{formatYesPrice(outcome1Price)}</span>
                      </div>
                      <div className={`bg-red-900 hover:bg-red-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${buttonWidth}`}>
                        <span className="text-white font-light">{formatNoPrice(outcome1NoPrice)}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            } else {
              // Fallback for markets without clear classification - treat as Yes/No - each button matches multi-choice width, centered text
              return (
                <>
                  <div className="flex justify-end">
                    <div className={`bg-green-900 hover:bg-green-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${yesNoButtonWidth}`}>
                      <span className="text-white font-light">{formatYesPrice(market.yesPrice)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className={`bg-red-900 hover:bg-red-800 transition-colors px-0 py-0.5 rounded text-xs text-center ${yesNoButtonWidth}`}>
                      <span className="text-white font-light">{formatNoPrice(market.noPrice)}</span>
                    </div>
                  </div>
                </>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
});

MarketRow.displayName = 'MarketRow';

interface MarketOverviewProps {
  showAllMarkets?: boolean;
  defaultLimit?: number;
  useSubgraph?: boolean;
  onMarketClick?: (market: any) => void;
}

export default function MarketOverview({ showAllMarkets = false, defaultLimit = 50, useSubgraph = false, onMarketClick }: MarketOverviewProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"volume" | "volume24hr" | "endDate" | "createdAt" | "title">("volume");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showNotification, setShowNotification] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingWatchlistRef = useRef(false);
  // Watchlist state - store in localStorage for persistence (use array to maintain insertion order)
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen for watchlist changes from other components (e.g., WatchlistRow)
  useEffect(() => {
    const handleWatchlistUpdate = () => {
      // Skip update if we're the source of the change
      if (isUpdatingWatchlistRef.current) {
        isUpdatingWatchlistRef.current = false;
        return;
      }
      try {
        const saved = localStorage.getItem('watchlist');
        setWatchlist(saved ? JSON.parse(saved) : []);
      } catch {
        setWatchlist([]);
      }
    };

    window.addEventListener('watchlistUpdated', handleWatchlistUpdate);
    return () => {
      window.removeEventListener('watchlistUpdated', handleWatchlistUpdate);
    };
  }, []);
  
  // Categories matching Polymarket's exact filter names
  const categories = ["All", "Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings", "Tech", "Culture", "World", "Economy", "Elections"];
  
  // Toggle watchlist
  const handleWatchlistToggle = (marketId: string) => {
    isUpdatingWatchlistRef.current = true;
    setWatchlist(prev => {
      let newWatchlist: string[];
      if (prev.includes(marketId)) {
        // Remove from watchlist
        newWatchlist = prev.filter(id => id !== marketId);
      } else {
        // Add to the end (right side) of the watchlist
        newWatchlist = [...prev, marketId];
      }
      // Save to localStorage immediately
      try {
        localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
        // Dispatch custom event to notify other components
        // Reset the ref after a short delay to allow event to be processed
        setTimeout(() => {
          isUpdatingWatchlistRef.current = false;
        }, 10);
        window.dispatchEvent(new CustomEvent('watchlistUpdated'));
      } catch (e) {
        console.error('Failed to save watchlist:', e);
        isUpdatingWatchlistRef.current = false;
      }
      return newWatchlist;
    });
  };

  // Handle copy notification
  const handleCopyNotification = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 1000);
  };
  
  // Map category name to API slug
  const getCategorySlug = (category: string): string | undefined => {
    if (category === "All") return undefined;
    if (category === "Culture") return "pop-culture";
    return category.toLowerCase();
  };

  // Use subgraph or regular API based on prop
  // When a category is selected (not "All"), use limit 100, otherwise use defaultLimit
  const categoryLimit = selectedCategory && selectedCategory !== "All" ? 100 : (defaultLimit || 10000);
  
  const gammaMarkets = usePolymarketMarkets({
    limit: defaultLimit || 10000,
  });
  
  const subgraphMarkets = usePolymarketSubgraphMarkets({
    limit: categoryLimit,
    tagSlug: getCategorySlug(selectedCategory),
  });
  
  const markets = useSubgraph ? (subgraphMarkets.data || []) : (gammaMarkets.data || []);
  const marketsLoading = useSubgraph ? subgraphMarkets.loading : gammaMarkets.loading;
  const marketsError = useSubgraph ? subgraphMarkets.error : gammaMarkets.error;
  
  console.log("MarketOverview - markets:", Array.isArray(markets) ? markets.length : 0, "loading:", marketsLoading, "error:", marketsError);
  
  // Filter and sort markets
  const filteredMarkets = useMemo(() => {
    if (!markets || !Array.isArray(markets)) return [];
    
    let filtered = markets;
    
    // Filter by category only (skip if selectedCategory is empty, which means Trending is active)
    if (selectedCategory && selectedCategory !== "All") {
      const categorySlug = getCategorySlug(selectedCategory);
      filtered = filtered.filter(market => {
        const marketCategory = market.category?.toLowerCase() || market.tags?.[0]?.toLowerCase() || '';
        return categorySlug ? marketCategory.includes(categorySlug) : true;
      });
    }
    
    // Sort markets
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case "volume":
          aValue = a.volumeNum || 0;
          bValue = b.volumeNum || 0;
          break;
        case "volume24hr":
          aValue = a.volume24hrNum || 0;
          bValue = b.volume24hrNum || 0;
          break;
        case "endDate":
          aValue = a.endDate ? new Date(a.endDate).getTime() : 0;
          bValue = b.endDate ? new Date(b.endDate).getTime() : 0;
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case "title":
          // Trim whitespace and handle empty titles
          const aTitle = (a.title || "").trim();
          const bTitle = (b.title || "").trim();
          // Handle empty titles - put them at the end
          if (aTitle === "" && bTitle === "") return 0;
          if (aTitle === "") return 1; // Empty titles go to end
          if (bTitle === "") return -1; // Empty titles go to end
          // Use localeCompare for proper string comparison (case-insensitive, numeric-aware)
          const comparison = aTitle.localeCompare(bTitle, 'en', { 
            sensitivity: 'base', 
            numeric: true,
            caseFirst: 'upper'
          });
          return sortDirection === "asc" ? comparison : -comparison;
        default:
          return 0;
      }
      
      // Compare values for non-title sorts
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [markets, selectedCategory, sortBy, sortDirection]);
  
  // Search results for dropdown (no limit)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || !markets || !Array.isArray(markets)) return [];
    
    const searchLower = searchTerm.toLowerCase();
    const results = markets.filter(market => {
      const title = (market.title || '').toLowerCase();
      const category = (market.category || '').toLowerCase();
      const marketId = (market.id || '').toLowerCase();
      return title.includes(searchLower) || category.includes(searchLower) || marketId.includes(searchLower);
    });
    
    return results;
  }, [markets, searchTerm]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    
    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSearchDropdown]);
  
  // Show dropdown when search term has value
  useEffect(() => {
    if (searchTerm.trim().length > 0 && searchResults.length > 0) {
      setShowSearchDropdown(true);
    } else {
      setShowSearchDropdown(false);
    }
  }, [searchTerm, searchResults]);
  
  // Handle "/" keypress to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSearchFocused(true);
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  return <div className="h-full flex flex-col relative">
      {/* Dark Overlay when search is focused */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[99] transition-opacity duration-300 ease-in-out ${
          isSearchFocused ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => {
          if (isSearchFocused) {
            searchInputRef.current?.blur();
          }
        }}
      />
      
      {/* Category Pills and Sort Controls */}
      <div className={`flex-shrink-0 mb-2 mt-0 relative ${isSearchFocused ? 'z-[98]' : 'z-50'}`}>
        <div className="flex items-start gap-2 justify-between">
          <div className="flex gap-2 flex-wrap items-center">
            {categories.map(category => <button key={category} onClick={() => {
            setSelectedCategory(category);
            // Reset sort if it was set by Trending button
            if (sortBy === "volume24hr" && sortDirection === "desc") {
              setSortBy("volume");
              setSortDirection("desc");
            }
          }} className={`px-3 py-1.5 rounded-full text-sm font-normal whitespace-nowrap transition-colors ${selectedCategory === category && !(sortBy === "volume24hr" && sortDirection === "desc") ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                {category}
              </button>)}
            {/* Top 24hr Volume Button */}
            <button
              onClick={() => {
                setSortBy("volume24hr");
                setSortDirection("desc");
                // Clear category selection when Trending is clicked
                setSelectedCategory("");
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-normal whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                sortBy === "volume24hr" && sortDirection === "desc" 
                  ? "bg-orange-600 text-white" 
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              title="Sort by 24hr volume (highest first)"
            >
             
              Trending
            </button>
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [newSortBy, newSortDirection] = e.target.value.split('-');
                setSortBy(newSortBy as any);
                setSortDirection(newSortDirection as "asc" | "desc");
              }}
              className="pl-3 pr-2 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-full hover:bg-gray-700 focus:outline-none cursor-pointer appearance-none"
              style={{
                backgroundImage: 'none'
              }}
            >
              <option value="volume-desc">Volume (Total) ↓</option>
              <option value="volume-asc">Volume (Total) ↑</option>
              <option value="volume24hr-desc">Volume (24hr) ↓</option>
              <option value="volume24hr-asc">Volume (24hr) ↑</option>
              <option value="endDate-desc">End Date ↓</option>
              <option value="endDate-asc">End Date ↑</option>
              <option value="title-asc">Title ↑</option>
              <option value="title-desc">Title ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search and Time Period Filter - Outside border */}
      <div className={`flex-shrink-0 mb-[10px] relative ${isSearchFocused ? 'z-[100]' : 'z-50'}`}>
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search by name or id" 
            value={searchTerm} 
            onChange={e => {
              setSearchTerm(e.target.value);
              setShowSearchDropdown(e.target.value.trim().length > 0);
            }}
            onMouseDown={() => {
              setIsSearchFocused(true);
            }}
            onFocus={() => {
              setIsSearchFocused(true);
              if (searchTerm.trim().length > 0 && searchResults.length > 0) {
                setShowSearchDropdown(true);
              }
            }}
            onBlur={(e) => {
              // Delay to allow dropdown click to register
              setTimeout(() => {
                if (!searchRef.current?.contains(document.activeElement)) {
                  setIsSearchFocused(false);
                }
              }, 200);
            }}
            className="w-full pl-7 pr-8 py-1 bg-[#0a0a0a] border border-gray-800 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-xs h-7 rounded-md" 
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-gray-500 text-xs">/</span>
          </div>
          
          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <>
              <style>{`
                .search-dropdown-scrollbar::-webkit-scrollbar {
                  width: 8px;
                  height: 8px;
                }
                .search-dropdown-scrollbar::-webkit-scrollbar-track {
                  background: #1a1a1a;
                }
                .search-dropdown-scrollbar::-webkit-scrollbar-thumb {
                  background: #374151;
                  border-radius: 4px;
                }
                .search-dropdown-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #4b5563;
                }
                .search-dropdown-scrollbar {
                  scrollbar-width: thin;
                  scrollbar-color: #374151 #1a1a1a;
                }
              `}</style>
              <div 
                className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded shadow-lg z-[100] overflow-y-auto search-dropdown-scrollbar"
                style={{ 
                  maxHeight: 'calc(100vh - 220px)',
                }}
              >
              {searchResults.map((market) => (
                <div
                  key={market.id}
                  onClick={() => {
                    if (onMarketClick) {
                      onMarketClick(market);
                    } else {
                      navigate(`/market/${market.id}`);
                    }
                    setSearchTerm('');
                    setShowSearchDropdown(false);
                  }}
                  className="p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {market.image && (
                      <img 
                        src={market.image} 
                        alt={market.title} 
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white break-words">{market.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {market.category && (
                          <div className="text-xs text-gray-400">{market.category}</div>
                        )}
                        {market.volume && (
                          <>
                            {market.category && <span className="text-xs text-gray-500">•</span>}
                            <div className="text-xs text-gray-400">{market.volume}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Markets List */}
      <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto scrollable-content">
            <Card className="bg-gray-900 border border-gray-800 rounded-md overflow-hidden">
              <div className="grid grid-cols-1 min-[900px]:grid-cols-2">
            {marketsLoading ? (
              <>
                {[...Array(80)].map((_, index) => (
                  <div key={index} className={`p-2 animate-pulse ${index < 79 ? 'border-b border-gray-800' : ''}`}>
                    <div className="flex items-center gap-2 justify-between">
                      {/* Image skeleton */}
                      <div className="w-12 h-12 bg-gray-700 rounded flex-shrink-0"></div>
                      
                      {/* Market Info skeleton */}
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-700 rounded mb-1 w-3/4"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                      </div>
                      
                      {/* Prices skeleton */}
                      <div className="w-56 flex flex-col gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 justify-between w-full">
                          <div className="w-20 h-3 bg-gray-700 rounded flex-shrink-0"></div>
                          <div className="flex gap-1 flex-shrink-0">
                            <div className="w-[50px] h-5 bg-gray-700 rounded"></div>
                            <div className="w-[50px] h-5 bg-gray-700 rounded"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 justify-between w-full">
                          <div className="w-20 h-3 bg-gray-700 rounded flex-shrink-0"></div>
                          <div className="flex gap-1 flex-shrink-0">
                            <div className="w-[50px] h-5 bg-gray-700 rounded"></div>
                            <div className="w-[50px] h-5 bg-gray-700 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : marketsError ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <div className="text-xs text-red-400">Error: {marketsError}</div>
              </div>
            ) : !markets || !Array.isArray(markets) ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <div className="text-xs text-red-400">Invalid markets data received</div>
              </div>
            ) : filteredMarkets.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <div className="text-xs text-gray-400">No markets found</div>
                <div className="text-xs text-gray-500 ml-2">(Total markets: {markets?.length || 0})</div>
              </div>
            ) : (
              filteredMarkets.map((market, index) => {
                if (!market || !market.id) {
                  console.warn(`Skipping invalid market at index ${index}:`, market);
                  return null;
                }
                // For 2-column grid: last row is last 2 items (or last 1 if odd count)
                const totalItems = filteredMarkets.length;
                // Calculate which row this item is in (0-indexed)
                const rowIndex = Math.floor(index / 2);
                const totalRows = Math.ceil(totalItems / 2);
                const isInLastRow = rowIndex === totalRows - 1;
                const isLast = isInLastRow;
                try {
                  return (
                    <MarketRow 
                      key={market.id || `market-${index}`} 
                      market={market} 
                      index={index} 
                      navigate={navigate}
                      onMarketClick={onMarketClick}
                      showWatchlist={useSubgraph}
                      isWatched={watchlist.includes(market.id)}
                      onWatchlistToggle={handleWatchlistToggle}
                      onCopy={handleCopyNotification}
                      isLast={isLast}
                    />
                  );
                } catch (error) {
                  console.error(`Error rendering market ${market.id || index}:`, error);
                  const totalItems = filteredMarkets.length;
                  const rowIndex = Math.floor(index / 2);
                  const totalRows = Math.ceil(totalItems / 2);
                  const isInLastRow = rowIndex === totalRows - 1;
                  return (
                    <div key={market.id || `market-${index}`} className={`p-2 bg-red-900/20 ${!isInLastRow ? 'border-b border-red-800' : ''}`}>
                      <div className="text-xs text-red-400">Error rendering market: {market.title || market.id}</div>
                    </div>
                  );
                }
              }).filter(Boolean) // Remove null entries
            )}
              </div>
            </Card>
          </div>
      </div>
      
      {/* Copy Notification Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${showNotification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
          <Copy className="w-4 h-4 text-green-400" />
          <span className="text-sm text-white">Market id copied to clipboard</span>
        </div>
      </div>
    </div>;
}
