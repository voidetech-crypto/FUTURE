import { useState, useEffect, useRef } from "react";
import TradingViewChart from "@/react-app/components/ui/TradingViewChart";
import { Card } from "@/react-app/components/ui/Card";
import { X, Search, Filter, TrendingUp, TrendingDown, Calendar, Star, Copy, Download, Upload } from "lucide-react";
import { PnlCardGenerator } from "@/react-app/components/ui/PnlCardGenerator";
import MarketWindow from "@/react-app/components/trading/MarketWindow";
import { getLastLeaderboardTimeframeAsModal } from "@/react-app/store/lastLeaderboardTimeframe";

interface UserPosition {
  marketId: string;
  marketTitle: string;
  outcome: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  value: number;
  percentPnl?: number;
  image?: string;
}

interface UserActivity {
  id: string;
  type: "buy" | "sell";
  marketTitle: string;
  marketId?: string;
  outcome: string;
  shares: number;
  price: number;
  timestamp: number;
  pnl?: number;
  image?: string;
}

interface UserPnLHistory {
  timestamp: number;
  cumulativePnl: number;
  date: string;
}

interface UserProfileData {
  address: string;
  username: string;
  avatar?: string;
  totalPnl: number;
  totalVolume: number;
  accuracy: number;
  totalTrades: number;
  winRate: number;
  avgPositionSize: number;
  marketsTraded: number;
  positions: UserPosition[];
  closedPositions?: UserPosition[];
  recentActivity: UserActivity[];
  pnlHistory: UserPnLHistory[];
  totalValue?: number;
  dataLimitation?: string;
  joinDate?: string;
  profileViews?: number;
  largestWin?: number;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  username: string;
  initialTimeframe?: "1D" | "1W" | "1M" | "ALL";
}

export function UserProfileModal({ isOpen, onClose, userAddress, username, initialTimeframe }: UserProfileModalProps) {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "closed" | "activity">("active");
  // Initialize with initialTimeframe if provided, otherwise use last leaderboard timeframe, otherwise default to 1M
  // Use a function to ensure we get the latest values
  const [pnlTimeframe, setPnlTimeframe] = useState<"1D" | "1W" | "1M" | "ALL">(() => {
    // Priority: initialTimeframe prop > last leaderboard timeframe > default 1M
    if (initialTimeframe) {
      return initialTimeframe;
    }
    const lastLeaderboardTimeframe = getLastLeaderboardTimeframeAsModal();
    if (lastLeaderboardTimeframe) {
      console.log('[UserProfileModal] Using last leaderboard timeframe:', lastLeaderboardTimeframe);
      return lastLeaderboardTimeframe;
    }
    return "1M";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddressCopied, setShowAddressCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [previousPnLHistory, setPreviousPnLHistory] = useState<UserPnLHistory[]>([]);
  const [previousPnLTimeframe, setPreviousPnLTimeframe] = useState<"1D" | "1W" | "1M" | "ALL" | null>(null);
  const [allTimeframeData, setAllTimeframeData] = useState<Record<"1D" | "1W" | "1M" | "ALL", UserPnLHistory[]>>({
    "1D": [],
    "1W": [],
    "1M": [],
    "ALL": []
  });
  const [timeframesLoaded, setTimeframesLoaded] = useState(false);
  const [animatedPnl, setAnimatedPnl] = useState(0);
  const animatedPnlRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const [leaderboardPnl, setLeaderboardPnl] = useState<number | null>(null);
  const [isPnlCardGeneratorOpen, setIsPnlCardGeneratorOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);

  // Handle smooth open/close animation
  useEffect(() => {
    if (isOpen) {
      // Immediately mount when opening
      setIsMounted(true);
      // Set the timeframe when modal opens - ALWAYS use initialTimeframe if provided
      if (initialTimeframe) {
        console.log('[UserProfileModal] Opening modal - setting timeframe from prop:', {
          initialTimeframe,
          currentPnlTimeframe: pnlTimeframe,
          willUpdate: pnlTimeframe !== initialTimeframe
        });
        setPnlTimeframe(initialTimeframe);
      } else {
        console.log('[UserProfileModal] Opening modal - no initialTimeframe prop, using default 1M');
      }
      // Trigger animation after mount
      const timeoutId = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timeoutId);
    } else {
      setIsVisible(false);
      // Unmount after animation completes
      const timeoutId = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, initialTimeframe]);
  
  // Also update timeframe if initialTimeframe or last leaderboard timeframe changes while modal is open
  useEffect(() => {
    if (isOpen) {
      let timeframeToUse: "1D" | "1W" | "1M" | "ALL" | null = null;
      
      if (initialTimeframe) {
        timeframeToUse = initialTimeframe;
      } else {
        timeframeToUse = getLastLeaderboardTimeframeAsModal();
      }
      
      if (timeframeToUse && pnlTimeframe !== timeframeToUse) {
        console.log('[UserProfileModal] Timeframe source changed while modal is open, updating:', {
          from: pnlTimeframe,
          to: timeframeToUse,
          source: initialTimeframe ? 'prop' : 'lastLeaderboard'
        });
        setPnlTimeframe(timeframeToUse);
      }
    }
  }, [initialTimeframe, isOpen, pnlTimeframe]);

  // Track previous user address to detect changes
  const prevUserAddressRef = useRef<string>("");
  
  // Clear data when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear all state when modal closes
      setProfileData(null);
      setError(null);
      setLoading(false);
      setPreviousPnLHistory([]);
      setPreviousPnLTimeframe(null);
      setAllTimeframeData({
        "1D": [],
        "1W": [],
        "1M": [],
        "ALL": []
      });
      setTimeframesLoaded(false);
      setLeaderboardPnl(null);
      setAnimatedPnl(0);
      animatedPnlRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setActiveTab("active");
      setSearchTerm("");
      setIsVisible(false);
      // Reset the ref when modal closes
      prevUserAddressRef.current = "";
    }
  }, [isOpen, initialTimeframe]);

  // Clear data when userAddress changes (new user selected while modal is open)
  useEffect(() => {
    if (isOpen && userAddress) {
      if (prevUserAddressRef.current !== userAddress && prevUserAddressRef.current !== "") {
        // Clear previous user's data when a new user is selected
        setProfileData(null);
        setError(null);
        setPreviousPnLHistory([]);
        setPreviousPnLTimeframe(null);
        setAllTimeframeData({
          "1D": [],
          "1W": [],
          "1M": [],
          "ALL": []
        });
        setTimeframesLoaded(false);
        setLeaderboardPnl(null);
        setAnimatedPnl(0);
        animatedPnlRef.current = 0;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }
      // Always update the ref to current user address
      prevUserAddressRef.current = userAddress;
    }
  }, [isOpen, userAddress]);

  // Fetch all timeframe data on initial open
  useEffect(() => {
    if (isOpen && userAddress && isMounted && !timeframesLoaded) {
      fetchAllTimeframes();
    }
  }, [isOpen, userAddress, isMounted, timeframesLoaded]);

  // Fetch base profile data (positions, etc.) - only once
  // Include pnlTimeframe in dependencies so it refetches when timeframe changes
  useEffect(() => {
    if (isOpen && userAddress && isMounted) {
      fetchBaseProfile();
    }
  }, [isOpen, userAddress, isMounted, pnlTimeframe]);

  const fetchBaseProfile = async () => {
    try {
      console.log('[UserProfileModal] fetchBaseProfile called', {
        userAddress,
        isOpen,
        isMounted,
        currentPnlTimeframe: pnlTimeframe
      });
      
      setLoading(true);
      setError(null);
      
      // Fetch base profile with current timeframe for positions and other data
      // Use the current pnlTimeframe instead of hardcoded 1M
      const timeframeParam = pnlTimeframe === "ALL" ? "ALL" : pnlTimeframe;
      const response = await fetch(`/api/polymarket/user/${userAddress}/profile?timeframe=${timeframeParam}`);
      const result = await response.json();
      
      console.log('[UserProfileModal] Base profile fetch response', {
        success: result.success,
        hasProfile: !!result.profile
      });
      
      if (result.success) {
        // Set base profile data (without PNL history, that comes from allTimeframeData)
        const { pnlHistory, ...baseProfile } = result.profile;
        // Use the current timeframe's data instead of hardcoded "1M"
        const timeframeKey = pnlTimeframe === "ALL" ? "ALL" : pnlTimeframe;
        setProfileData({
          ...baseProfile,
          pnlHistory: allTimeframeData[timeframeKey] || []
        } as UserProfileData);
      } else {
        console.error('[UserProfileModal] Base profile fetch failed', result.error);
        setError(result.error || "Failed to fetch user profile");
      }
    } catch (err) {
      console.error('[UserProfileModal] Base profile fetch error', err);
      setError(err instanceof Error ? err.message : "Failed to fetch user profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTimeframes = async () => {
    try {
      console.log('[UserProfileModal] fetchAllTimeframes called', {
        userAddress,
        isOpen,
        isMounted
      });
      
      setLoading(true);
      setError(null);
      
      // Fetch leaderboard PNL for Max timeframe
      let leaderboardPnlValue: number | null = null;
      try {
        const leaderboardResponse = await fetch(`https://data-api.polymarket.com/v1/leaderboard?timePeriod=all&orderBy=VOL&limit=1&offset=0&category=overall&user=${userAddress}`);
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
            leaderboardPnlValue = parseFloat(leaderboardData[0].pnl) || 0;
            console.log('[UserProfileModal] Leaderboard PNL fetched', { leaderboardPnl: leaderboardPnlValue });
          }
        }
      } catch (err) {
        console.error('[UserProfileModal] Failed to fetch leaderboard PNL', err);
      }
      
      setLeaderboardPnl(leaderboardPnlValue);
      
      // Fetch all timeframes in parallel (excluding ALL since we use leaderboard data)
      const timeframes: ("1D" | "1W" | "1M")[] = ["1D", "1W", "1M"];
      const promises = timeframes.map(timeframe => 
        fetch(`/api/polymarket/user/${userAddress}/profile?timeframe=${timeframe}`)
          .then(res => res.json())
          .then(result => ({ timeframe, result }))
      );
      
      // Also fetch ALL timeframe for chart data
      const allTimeframePromise = fetch(`/api/polymarket/user/${userAddress}/profile?timeframe=ALL`)
        .then(res => res.json())
        .then(result => ({ timeframe: "ALL" as const, result }));
      
      const results = await Promise.all([...promises, allTimeframePromise]);
      
      const newTimeframeData: Record<"1D" | "1W" | "1M" | "ALL", UserPnLHistory[]> = {
        "1D": [],
        "1W": [],
        "1M": [],
        "ALL": []
      };
      
      let baseProfile: any = null;
      
      results.forEach(({ timeframe, result }) => {
        if (result.success && result.profile) {
          // Use the current pnlTimeframe as the base profile, or 1M as fallback
          if (timeframe === pnlTimeframe || (timeframe === "1M" && !baseProfile)) {
            // Use current timeframe or 1M as the base profile
            baseProfile = result.profile;
          }
          const pnlHistory = result.profile.pnlHistory || [];
          newTimeframeData[timeframe] = pnlHistory;
          console.log(`[UserProfileModal] Loaded ${timeframe} timeframe data`, {
            length: pnlHistory.length,
            firstTimestamp: pnlHistory[0]?.timestamp ? new Date(pnlHistory[0].timestamp).toISOString() : null,
            lastTimestamp: pnlHistory.length > 0 ? new Date(pnlHistory[pnlHistory.length - 1].timestamp).toISOString() : null
          });
        } else {
          console.warn(`[UserProfileModal] Failed to load ${timeframe} timeframe`, result);
        }
      });
      
      setAllTimeframeData(newTimeframeData);
      setTimeframesLoaded(true);
      
      // Set the base profile data with the current timeframe's PNL history
      if (baseProfile) {
        const { pnlHistory, ...baseProfileData } = baseProfile;
        const timeframeKey = pnlTimeframe === "ALL" ? "ALL" : pnlTimeframe;
        setProfileData({
          ...baseProfileData,
          pnlHistory: newTimeframeData[timeframeKey] || []
        } as UserProfileData);
      }
      
      console.log('[UserProfileModal] All timeframes loaded', {
        timeframesData: Object.keys(newTimeframeData).map(tf => ({
          timeframe: tf,
          length: newTimeframeData[tf as "1D" | "1W" | "1M" | "ALL"].length
        })),
        leaderboardPnl: leaderboardPnlValue,
        currentTimeframe: pnlTimeframe
      });
    } catch (err) {
      console.error('[UserProfileModal] Fetch all timeframes error', err);
      setError(err instanceof Error ? err.message : "Failed to fetch timeframe data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `${Math.round(price * 100)}`;
    }
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Update profileData when timeframe changes to use preloaded data
  useEffect(() => {
    if (timeframesLoaded && profileData) {
      const timeframeKey = pnlTimeframe === "ALL" ? "ALL" : pnlTimeframe;
      if (allTimeframeData[timeframeKey] && allTimeframeData[timeframeKey].length > 0) {
        setProfileData({
          ...profileData,
          pnlHistory: allTimeframeData[timeframeKey]
        });
      }
    }
  }, [pnlTimeframe, timeframesLoaded]);

  // Animate PNL number when it changes
  useEffect(() => {
    if (!timeframesLoaded) {
      return;
    }
    
    // For Max timeframe, use leaderboard PNL
    if (pnlTimeframe === "ALL") {
      if (leaderboardPnl !== null) {
        const targetPnl = leaderboardPnl;
        
        // Cancel any existing animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        const startValue = animatedPnlRef.current;
        const endValue = targetPnl;
        const duration = 600; // 600ms for smooth animation
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation (ease-out)
          const easeOut = 1 - Math.pow(1 - progress, 3);
          
          const currentValue = startValue + (endValue - startValue) * easeOut;
          animatedPnlRef.current = currentValue;
          setAnimatedPnl(currentValue);
          
          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            animatedPnlRef.current = endValue;
            setAnimatedPnl(endValue);
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        
        return () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        };
      }
      return;
    }
    
    // For other timeframes, calculate from history
    if (!allTimeframeData[pnlTimeframe] || allTimeframeData[pnlTimeframe].length === 0) {
      return;
    }
    
    // Calculate target PNL from the preloaded data
    const history = allTimeframeData[pnlTimeframe];
    let targetPnl = 0;
    
    if (history.length > 0) {
      const now = Date.now();
      let cutoff = now;
      
      switch (pnlTimeframe) {
        case "1D":
          cutoff = now - 24 * 60 * 60 * 1000;
          break;
        case "1W":
          cutoff = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case "1M":
          cutoff = now - 30 * 24 * 60 * 60 * 1000;
          break;
      }
      
      const filtered = history.filter(point => {
        const pointTimestamp = point.timestamp || 0;
        return pointTimestamp >= cutoff;
      });
      
      if (filtered.length > 0) {
        targetPnl = filtered[filtered.length - 1].cumulativePnl - filtered[0].cumulativePnl;
      }
    }
    
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const startValue = animatedPnlRef.current;
    const endValue = targetPnl;
    const duration = 600; // 600ms for smooth animation
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOut;
      animatedPnlRef.current = currentValue;
      setAnimatedPnl(currentValue);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animatedPnlRef.current = endValue;
        setAnimatedPnl(endValue);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pnlTimeframe, timeframesLoaded, allTimeframeData, leaderboardPnl]);

  // Filter P&L history based on timeframe
  const getFilteredPnLHistory = () => {
    // For Max timeframe, always use ALL timeframe data - never fall back to profileData
    const timeframeKey = pnlTimeframe === "ALL" ? "ALL" : pnlTimeframe;
    const historyToUse = allTimeframeData[timeframeKey] || [];
    
    console.log('[UserProfileModal] getFilteredPnLHistory', {
      pnlTimeframe,
      timeframeKey,
      dataLength: historyToUse.length,
      hasData: historyToUse.length > 0,
      allTimeframeDataKeys: Object.keys(allTimeframeData),
      allTimeframeDataLengths: Object.keys(allTimeframeData).map(k => ({
        key: k,
        length: allTimeframeData[k as "1D" | "1W" | "1M" | "ALL"].length,
        firstTimestamp: allTimeframeData[k as "1D" | "1W" | "1M" | "ALL"][0]?.timestamp ? new Date(allTimeframeData[k as "1D" | "1W" | "1M" | "ALL"][0].timestamp).toISOString() : null,
        lastTimestamp: allTimeframeData[k as "1D" | "1W" | "1M" | "ALL"].length > 0 ? new Date(allTimeframeData[k as "1D" | "1W" | "1M" | "ALL"][allTimeframeData[k as "1D" | "1W" | "1M" | "ALL"].length - 1].timestamp).toISOString() : null
      }))
    });
    
    if (!historyToUse || !Array.isArray(historyToUse) || historyToUse.length === 0) {
      console.log('[UserProfileModal] No history data available for timeframe', { 
        pnlTimeframe, 
        timeframeKey,
        allTimeframeDataHasALL: !!allTimeframeData["ALL"],
        allTimeframeDataALLLength: allTimeframeData["ALL"]?.length || 0
      });
      return [];
    }
    
    const now = Date.now();
    let cutoff = now;
    
    switch (pnlTimeframe) {
      case "1D":
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case "1W":
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "1M":
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "ALL":
        // Return all data without filtering for Max timeframe
        console.log('[UserProfileModal] Returning ALL timeframe data', {
          length: historyToUse.length,
          firstTimestamp: historyToUse[0] ? new Date(historyToUse[0].timestamp).toISOString() : null,
          lastTimestamp: historyToUse[historyToUse.length - 1] ? new Date(historyToUse[historyToUse.length - 1].timestamp).toISOString() : null
        });
        return historyToUse;
    }
    
    const filtered = historyToUse.filter(point => {
      const pointTimestamp = point.timestamp || 0;
      const isInRange = pointTimestamp >= cutoff;
      return isInRange;
    });
    
    console.log('[UserProfileModal] Filtered history', {
      originalLength: historyToUse.length,
      filteredLength: filtered.length,
      cutoff: new Date(cutoff).toISOString()
    });
    
    return filtered;
  };

  // Calculate P&L for selected timeframe
  const getTimeframePnl = () => {
    // For Max timeframe, use leaderboard PNL
    if (pnlTimeframe === "ALL" && leaderboardPnl !== null) {
      return leaderboardPnl;
    }
    
    const history = getFilteredPnLHistory();
    if (history.length === 0) return profileData?.totalPnl || 0;
    
    const first = history[0].cumulativePnl;
    const last = history[history.length - 1].cumulativePnl;
    return last - first;
  };

  // Filter positions
  const getFilteredPositions = () => {
    if (!profileData) return [];
    
    // Get active or closed positions based on activeTab
    const positionsToShow = activeTab === "active" 
      ? profileData.positions 
      : (profileData.closedPositions || []);
    
    let filtered = positionsToShow;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(pos => 
        pos.marketTitle.toLowerCase().includes(searchLower) ||
        pos.outcome.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  // Filter activity
  const getFilteredActivity = () => {
    if (!profileData) return [];
    
    let filtered = profileData.recentActivity;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(act => 
        act.marketTitle.toLowerCase().includes(searchLower) ||
        act.outcome.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  // Get biggest win
  const getBiggestWin = () => {
    if (!profileData?.positions.length) return 0;
    return Math.max(...profileData.positions.map(p => p.unrealizedPnl), 0);
  };

  if (!isMounted) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-300 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${!isVisible ? 'pointer-events-none' : ''}`}
      onClick={onClose}
    >
      <div 
        className={`bg-[#0a0a0a] border border-gray-800 rounded-lg w-full max-w-6xl h-[85vh] my-8 overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-red-400">{error}</div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* User Header */}
            <div className="px-3 pt-2 pb-2 border-b bg-gray-900 border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                    {profileData?.avatar ? (
                      <img 
                        src={profileData.avatar} 
                        alt={username}
                          className="w-full h-full object-cover"
                      />
                    ) : (
                        <div className="w-full h-full bg-gray-800" />
                    )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg text-white">{((profileData?.username || username) || '').length > 15 ? `${((profileData?.username || username) || '').slice(0, 15)}…` : (profileData?.username || username)}</h2>
                      <button className="p-0 hover:bg-gray-800 rounded" title="Favorite">
                        <Star className="w-4 h-4 text-gray-400" />
                      </button>
                      {profileData?.joinDate && (
                        <span className="text-xs text-gray-500 ml-1">Joined {profileData.joinDate}</span>
                      )}
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(userAddress);
                          setShowAddressCopied(true);
                          setTimeout(() => setShowAddressCopied(false), 1000);
                        } catch {}
                      }}
                      className="flex items-center gap-1 mt-0.5 hover:bg-gray-800 rounded px-1 py-0.5"
                      title="Copy address"
                    >
                      <span className="text-[14px] text-gray-500">{userAddress}</span>
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Three Panels Section - Like Portfolio */}
            <div className="pt-0 pb-0 border-b border-gray-800 min-h-[280px]">
              <div className="grid grid-cols-1 lg:grid-cols-3 mb-0 h-full">
                {/* Balance Panel */}
                <Card className="py-2 px-4 bg-gray-900 border-0 lg:border-r border-gray-800 flex flex-col min-h-[280px]">
                  <h3 className="text-sm font-medium text-white mb-2 -mt-[1px]">Balance</h3>
                  <div className="space-y-2 flex-1">
                    <div className="mt-[1px]">
                      <div className="text-xs text-gray-400 mb-0.5">Positions Value</div>
                      <div className="text-base text-white">
                        {formatCurrency(profileData?.totalValue || profileData?.positions?.reduce((sum, pos) => sum + pos.value, 0) || 0)}
                      </div>
                    </div>
                    <div className="mt-[1px]">
                      <div className="text-xs text-gray-400 mb-0.5">Biggest Win</div>
                      <div className="text-base text-white">
                        {formatCurrency(profileData?.largestWin || 0)}
                      </div>
                    </div>
                    <div className="mt-[1px]">
                      <div className="text-xs text-gray-400 mb-0.5">Predictions</div>
                      <div className="text-base text-white">
                        {(profileData?.positions?.length || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-[1px]">
                      <div className="text-xs text-gray-400 mb-0.5">Profile Views</div>
                      <div className="text-base text-white">
                        {(profileData?.profileViews || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Realized PNL Panel */}
                <Card className="py-2 px-4 bg-gray-900 border-0 lg:border-r border-gray-800 flex flex-col min-h-[280px]">
                  <div className="mb-2 -mt-[1px]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">PNL</h3>
                      <div className="flex items-center gap-1">
                        {(["1d", "7d", "30d", "Max"] as const).map((period) => {
                          const periodMap: Record<string, "1D" | "1W" | "1M" | "ALL"> = {
                            "1d": "1D",
                            "7d": "1W",
                            "30d": "1M",
                            "Max": "ALL"
                          };
                          return (
                            <button
                              key={period}
                              onClick={() => setPnlTimeframe(periodMap[period])}
                              className={`px-1 py-1 text-xs transition-colors ${
                                pnlTimeframe === periodMap[period]
                                  ? "text-white"
                                  : "text-gray-500 hover:text-gray-400"
                              }`}
                            >
                              {period}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[148px] -mx-2">
                    {(() => {
                      try {
                        const filteredHistory = getFilteredPnLHistory();
                        console.log('[UserProfileModal] Rendering chart', {
                          filteredHistoryLength: filteredHistory.length,
                          loading,
                          hasProfileData: !!profileData
                        });
                        
                        if (filteredHistory.length === 0) {
                          console.log('[UserProfileModal] No chart data - showing empty state', {
                            loading,
                            hasProfileData: !!profileData,
                            pnlHistoryLength: profileData?.pnlHistory?.length || 0
                          });
                          return (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                              {loading ? "Loading..." : "No chart data"}
                            </div>
                          );
                        }
                        
                        const chartData = filteredHistory.map(point => ({
                          time: point.timestamp,
                          value: point.cumulativePnl || 0
                        }));
                        
                        console.log('[UserProfileModal] Chart data prepared', {
                          dataPoints: chartData.length,
                          firstPoint: chartData[0],
                          lastPoint: chartData[chartData.length - 1]
                        });
                        
                        const chartColor = getTimeframePnl() >= 0 ? "#14B8A6" : "#EF4444";
                        return (
                          <TradingViewChart
                            height={213}
                            data={chartData}
                            lineColor={chartColor}
                            areaColor={getTimeframePnl() >= 0 ? "rgba(20, 184, 166, 0.3)" : "rgba(239, 68, 68, 0.3)"}
                            transparent={false}
                            showTimeScale={false}
                            showPriceScale={false}
                            showGrid={false}
                            showCrosshair={false}
                            priceFormat={{ type: 'price', precision: 0 }}
                            color="#111827"
                          />
                        );
                      } catch (err) {
                        console.error('[UserProfileModal] Error rendering chart:', err);
                        return (
                          <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                            Chart error
                          </div>
                        );
                      }
                    })()}
                  </div>
                </Card>

                {/* Performance Panel */}
                <Card className="py-2 px-4 bg-gray-900 border-0 flex flex-col min-h-[280px]">
                  <div className="flex items-center justify-between mb-2 -mt-[1px]">
                    <h3 className="text-sm font-medium text-white">Performance</h3>
                    <button 
                      onClick={() => setIsPnlCardGeneratorOpen(true)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                      <Upload className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">
                        {pnlTimeframe === "1D" ? "1d" : pnlTimeframe === "1W" ? "7d" : pnlTimeframe === "1M" ? "30d" : "Max"} Profit/Loss
                      </div>
                      <div className="text-xl text-white">
                        {animatedPnl >= 0 ? "+" : ""}${animatedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    </div>
                    <div className="pt-1.5 border-t border-gray-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">&gt;500%</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-white">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">200% ~ 500%</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                          <span className="text-xs text-white">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">0% ~ 200%</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-700 rounded-full"></div>
                          <span className="text-xs text-white">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">0% ~ -50%</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                          <span className="text-xs text-white">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">&lt;-50%</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-800 rounded-full"></div>
                          <span className="text-xs text-white">0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Tabs Section - Like Portfolio */}
            <Card className="bg-gray-900 border-0 mt-0 flex flex-col flex-1 min-h-0">
              <div className="border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center justify-between gap-6 px-4">
                  <div className="flex items-center gap-6">
                    {[
                      { key: "active" as const, label: "Active Positions", count: profileData?.positions?.length || 0 },
                      { key: "closed" as const, label: "Closed Positions", count: profileData?.closedPositions?.length || 0 },
                      { key: "activity" as const, label: "Activity", count: profileData?.recentActivity?.length || 0 }
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === key
                            ? "text-white border-blue-500"
                            : "text-gray-400 border-transparent hover:text-gray-300"
                        }`}
                      >
                        {label} {count > 0 && <span className="text-gray-500">({count})</span>}
                      </button>
                    ))}
                  </div>
                  <div className="relative max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={
                        activeTab === "active" 
                          ? "Search active positions..." 
                          : activeTab === "closed"
                          ? "Search closed positions..."
                          : "Search activity..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Content Area - Like Portfolio */}
              <div className="flex-1 overflow-y-auto min-h-[400px]">
                <div className="overflow-x-auto">
                {/* Active Positions Tab */}
                {(activeTab === "active" || activeTab === "closed") && (
                  <>
                    {!profileData ? (
                      <div className="h-full flex items-center justify-center min-h-[400px] text-gray-400">
                        <div className="text-sm">Loading positions...</div>
                      </div>
                    ) : profileData.dataLimitation ? (
                      <div className="h-full flex items-center justify-center min-h-[400px] text-center text-gray-400">
                        <div>
                        <div className="text-sm">{profileData.dataLimitation}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          Polymarket's API requires authentication to access individual user positions.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {getFilteredPositions().length > 0 ? (
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-800">
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Outcome</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Avg</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Current</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Value</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">PNL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredPositions().map((position, index) => {
                                // Use PNL directly from API
                                const pnl = position.unrealizedPnl || 0;
                                // Use percentPnl from API if available, otherwise calculate
                                const pnlPercent = position.percentPnl !== undefined 
                                  ? position.percentPnl 
                                  : (() => {
                                      const costBasis = position.shares * position.avgPrice;
                                      return costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                                    })();

                                return (
                                  <tr 
                                    key={position.marketId || index} 
                                    className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                      // Create market object from position data
                                      setSelectedMarket({
                                        id: position.marketId,
                                        title: position.marketTitle,
                                        image: position.image
                                      });
                                    }}
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        {/* Market Image */}
                                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-md bg-gray-800">
                                          {position.image ? (
                                            <img
                                              src={position.image}
                                              alt={position.marketTitle}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                              }}
                                            />
                                          ) : null}
                                          <div className={`w-8 h-8 bg-gray-700 rounded ${position.image ? 'hidden' : ''}`}></div>
                                        </div>
                                        {/* Market Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-semibold text-white mb-1.5 leading-tight">{position.marketTitle || "Untitled Market"}</div>
                                          <div className="text-xs text-gray-500">
                                          {position.shares.toLocaleString(undefined, { maximumFractionDigits: 1 })} shares
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="text-sm text-white">
                                        {(() => {
                                          const outcomeLower = position.outcome?.toLowerCase() || "";
                                          if (outcomeLower.includes("yes") || outcomeLower === "yes") {
                                            return `${position.outcome} (Yes)`;
                                          } else if (outcomeLower.includes("no") || outcomeLower === "no") {
                                            return `${position.outcome} (No)`;
                                          } else {
                                            return position.outcome;
                                          }
                                        })()}
                                      </div>
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-white">
                                      {formatPrice(position.avgPrice)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-white">
                                      {formatPrice(position.currentPrice)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-white">
                                      {formatCurrency(position.value)}
                                    </td>
                                    <td className="text-right py-3 px-4">
                                      <div className={`text-sm ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(pnl)}
                                      </div>
                                      <div className={`text-xs ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ({pnlPercent.toFixed(0)}%)
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="h-full flex items-center justify-center min-h-[400px]">
                            <div className="text-gray-400 text-sm">No {searchTerm ? "matching " : ""}{activeTab === "active" ? "active" : "closed"} positions found</div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {activeTab === "activity" && (
                  <>
                    {!profileData ? (
                      <div className="h-full flex items-center justify-center min-h-[400px] text-gray-400">
                        <div className="text-sm">Loading activity...</div>
                      </div>
                    ) : profileData.dataLimitation ? (
                      <div className="h-full flex items-center justify-center min-h-[400px] text-center text-gray-400">
                        <div>
                        <div className="text-sm">{profileData.dataLimitation}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          Individual trade history requires API authentication.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {getFilteredActivity().length > 0 ? (
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-800">
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Type</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Market</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400">Outcome</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-400">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getFilteredActivity().map((activity) => (
                            <tr 
                              key={activity.id} 
                              className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors cursor-pointer"
                              onClick={() => {
                                // Create market object from activity data
                                if (activity.marketId) {
                                  setSelectedMarket({
                                    id: activity.marketId,
                                    title: activity.marketTitle
                                  });
                                }
                              }}
                            >
                              <td className="py-3 px-4">
                                <div className="text-sm text-white capitalize">{activity.type}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {/* Market Image */}
                                  {activity.image && (
                                    <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-md bg-gray-800">
                                      <img
                                        src={activity.image}
                                        alt={activity.marketTitle}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="text-sm text-white">{activity.marketTitle}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-white">{activity.outcome}</div>
                              </td>
                              <td className="text-right py-3 px-4 text-sm text-white">
                                ${activity.shares.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="py-24 text-center">
                            <div className="text-gray-400 text-sm">No {searchTerm ? "matching " : ""}activity found</div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      {/* Address Copied Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[101] transition-all duration-300 ${showAddressCopied ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
          <Copy className="w-4 h-4 text-green-400" />
          <span className="text-sm text-white">User address copied</span>
        </div>
      </div>

      {/* PNL Card Generator */}
      <PnlCardGenerator
        isOpen={isPnlCardGeneratorOpen}
        onClose={() => setIsPnlCardGeneratorOpen(false)}
        pnlData={{
          pnl: animatedPnl,
          predictions: profileData?.positions?.length || 0,
          profileViews: profileData?.profileViews || 0
        }}
        currentTimeframe={pnlTimeframe}
        onTimeframeChange={setPnlTimeframe}
      />

      {/* Market Window */}
      <MarketWindow
        market={selectedMarket}
        isOpen={!!selectedMarket}
        onClose={() => setSelectedMarket(null)}
      />
    </div>
  );
}
