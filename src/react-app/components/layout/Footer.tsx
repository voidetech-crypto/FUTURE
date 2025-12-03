import { useState, useEffect } from "react";
import { Wallet, MessageCircle, Bell } from "lucide-react";
import { usePolymarketStats } from "../../hooks/usePolymarketData";

interface CryptoPrices {
  BTC: number;
  ETH: number;
  SOL: number;
  HYPE: number;
}

interface FooterProps {
  onWalletClick?: () => void;
  isWalletPanelOpen?: boolean;
  onWatchlistToggle?: () => void;
  isWatchlistOpen?: boolean;
  onNotificationVolumeToggle?: () => void;
  isNotificationVolumeOn?: boolean;
}

export default function Footer({ 
  onWalletClick, 
  isWalletPanelOpen = false,
  onWatchlistToggle,
  isWatchlistOpen = true,
  onNotificationVolumeToggle,
  isNotificationVolumeOn = true
}: FooterProps) {
  const [prices, setPrices] = useState<CryptoPrices>({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    HYPE: 0
  });

  const [loading, setLoading] = useState(true);
  const { stats: polymarketStats, loading: statsLoading } = usePolymarketStats();
  const [showStatsTooltip, setShowStatsTooltip] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch real prices from CoinGecko API
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,hyperliquid&vs_currencies=usd'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }
        
        const data = await response.json();
        
        const fetchedPrices = {
          BTC: data.bitcoin?.usd || 0,
          ETH: data.ethereum?.usd || 0,
          SOL: data.solana?.usd || 0,
          HYPE: data.hyperliquid?.usd || 0
        };
        
        setPrices(fetchedPrices);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch prices:", error);
        // Keep prices at 0 if API fails - no mock data
        setPrices({
          BTC: 0,
          ETH: 0,
          SOL: 0,
          HYPE: 0
        });
        setLoading(false);
      }
    };

    fetchPrices();
    
    // Update prices every minute (60 seconds)
    const interval = setInterval(fetchPrices, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, decimals: number = 2) => {
    if (price === 0) return "-.--";
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <footer className="bg-[#0a0a0a] border-t border-gray-800 h-8 flex items-center px-4 text-xs">
      <div className="flex items-center justify-between w-full">
        {/* Left: Wallet, Chat, Divider, and Crypto Prices */}
        <div className="flex items-center gap-3">
          {/* Wallet Button */}
          <button 
            onClick={onWalletClick}
            className={`flex items-center justify-center gap-1 text-gray-300 hover:text-white transition-colors pl-3 pr-2 py-1 rounded ${
              isWalletPanelOpen ? 'bg-gray-600/50' : ''
            }`}
          >
            <Wallet className="w-4 h-4 self-center" strokeWidth={2.5} />
            <span className="font-medium">Wallet</span>
          </button>
          
          {/* Chat Button */}
          <button className="flex items-center justify-center gap-1 text-gray-300 hover:text-white transition-colors">
            <MessageCircle className="w-4 h-4 self-center" strokeWidth={2.5} />
            <span className="font-medium">Chat</span>
          </button>
          
          {/* Vertical Divider */}
          <div className="w-px h-4 bg-gray-700"></div>
          
          {/* Polymarket Stats - Pill Button */}
          <div className="relative">
            {statsLoading ? (
              <div className="px-1.5 py-0.5 rounded-full bg-gray-950 border border-gray-600 flex items-center gap-1">
                <span className="text-gray-400 text-[10px] font-medium whitespace-nowrap">
                  $0.00M | 0 | $0.00M
                </span>
              </div>
            ) : polymarketStats ? (
              <>
                <button
                  onMouseEnter={() => setShowStatsTooltip(true)}
                  onMouseLeave={() => setShowStatsTooltip(false)}
                  className="px-1.5 py-0.5 rounded-full bg-gray-950 border border-gray-600 hover:bg-gray-900/60 hover:border-gray-500 transition-colors flex items-center gap-1"
                >
                  <span className="text-gray-300 text-[12px] font-medium">
                    {polymarketStats.volume24hr} | {polymarketStats.activeMarkets.toLocaleString()} | {polymarketStats.totalLiquidity}
                  </span>
                </button>
                
                {/* Tooltip on hover */}
                {showStatsTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 whitespace-nowrap">
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>24h Volume: {polymarketStats.volume24hr}</div>
                      <div>Tracking Markets: {polymarketStats.activeMarkets.toLocaleString()}</div>
                      <div>Total Liquidity: {polymarketStats.totalLiquidity}</div>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="w-2 h-2 bg-gray-900 border-r border-b border-gray-700 rotate-45"></div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
          
          {/* Vertical Divider */}
          <div className="w-px h-4 bg-gray-700"></div>
          
          {/* Crypto Prices */}
          <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-gray-400">Loading prices...</span>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <img 
                  src="https://mocha-cdn.com/019a1dd5-727a-7d19-ab6f-5a25a193ca2f/btc-fill.svg" 
                  alt="BTC" 
                  className="w-4 h-4" 
                />
                <span className="font-medium" style={{ color: '#f7931a' }}>${formatPrice(prices.BTC, 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <img 
                  src="https://mocha-cdn.com/019a1dd5-727a-7d19-ab6f-5a25a193ca2f/eth-fill.svg" 
                  alt="ETH" 
                  className="w-4 h-4" 
                />
                <span className="text-blue-600 font-medium">${formatPrice(prices.ETH, 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <img 
                  src="https://mocha-cdn.com/019a1dd5-727a-7d19-ab6f-5a25a193ca2f/sol-fill.svg" 
                  alt="SOL" 
                  className="w-4 h-4" 
                />
                <span className="text-purple-500 font-medium">${formatPrice(prices.SOL)}</span>
              </div>
              <div className="flex items-center gap-1">
                <img 
                  src="https://mocha-cdn.com/019a1dd5-727a-7d19-ab6f-5a25a193ca2f/HL-symbol_mint-green.svg" 
                  alt="HYPE" 
                  className="w-4 h-4" 
                />
                <span className="text-green-600 font-medium">${formatPrice(prices.HYPE)}</span>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Right: Watchlist, Notification Volume, Divider, X and Docs */}
        <div className="flex items-center gap-3">
          {/* Watchlist Row Toggle */}
          <button
            onClick={onWatchlistToggle}
            className={`flex items-center justify-center transition-opacity ${
              isWatchlistOpen ? 'opacity-100' : 'opacity-100'
            } hover:opacity-70`}
            title={isWatchlistOpen ? "Hide watchlist" : "Show watchlist"}
          >
            <img 
              src="/watchlist-icon.png" 
              alt="Watchlist" 
              className="w-4 h-4 object-contain brightness-75" 
              onError={(e) => {
                // Fallback if image not found - you can replace this with the actual image path
                console.error('Watchlist icon not found at /watchlist-icon.png');
                e.currentTarget.style.display = 'none';
              }}
            />
          </button>
          
          {/* Notification Volume Toggle */}
          <button
            onClick={onNotificationVolumeToggle}
            className={`flex items-center justify-center transition-colors ${
              isNotificationVolumeOn ? 'text-gray-300' : 'text-gray-300'
            } hover:text-white`}
            title={isNotificationVolumeOn ? "Mute notifications" : "Unmute notifications"}
          >
            <Bell className="w-4 h-4" strokeWidth={3} />
          </button>
          
          {/* Vertical Divider */}
          <div className="w-px h-4 bg-gray-700"></div>
          
          <a 
            href="https://x.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
          >
            <img 
              src="https://mocha-cdn.com/019a1dd5-727a-7d19-ab6f-5a25a193ca2f/image.png_6790.png" 
              alt="X (formerly Twitter)" 
              className="w-3 h-3 opacity-100 transition-opacity" 
            />
          </a>
          <a 
            href="https://gitbook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors pr-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" className="w-4 h-4">
              <g clipPath="url(#a)">
                <path fill="currentColor" d="M16 7.881a.738.738 0 0 0-.256-.455h-.028c-.029-.028-.057-.028-.057-.028-.028 0-.057-.029-.057-.029-.085-.056-.199-.056-.313-.056h-.056a.527.527 0 0 0-.2.056c-.028 0-.056.029-.056.029l-6.025 3.439c-.114.056-.227.142-.341.199-.199.085-.313.085-.512 0-.113-.057-.227-.114-.369-.2l-4.064-2.33a.516.516 0 0 0-.568 0 .597.597 0 0 0-.284.512v.256c0 .028 0 .085.028.113a.676.676 0 0 0 .256.37c.057.028.113.085.255.17l4.377 2.53c.199.113.284.17.426.227a.576.576 0 0 0 .483-.029c.086-.028.171-.085.37-.198l5.4-3.127c.028 0 .056-.028.113-.056.057-.029.057 0 .085 0 .057 0 .029.17.029.198v1.195c0 .056-.028.084-.028.141a68.56 68.56 0 0 0-.086.085c-.057.029-.114.057-.085.057-.028 0-.057.029-.085.057l-4.718 2.728c-.284.17-.511.285-.71.398-.427.2-.654.2-1.052 0-.199-.085-.426-.227-.739-.398L2.7 11.15c-.228-.142-.398-.227-.54-.34a2.18 2.18 0 0 1-.796-1.365c-.028-.17-.028-.37-.028-.682v-.881c.085-.455.37-.881.795-1.137.398-.227.91-.227 1.308 0l3.637 2.103c.341.2.569.313.74.398.426.2.625.2 1.05 0 .171-.085.399-.199.74-.398l5.428-3.126a.579.579 0 0 0 .255-.455V5.04a.738.738 0 0 0-.255-.455l-.086-.056-5.342-3.07c-.341-.199-.569-.312-.74-.398-.425-.199-.653-.199-1.05 0-.171.086-.399.2-.74.398L2.444 4.13c-.568.34-.796.454-.966.596C1.42 4.755.028 5.664 0 7.568v.796c0 .654 0 .938.057 1.222.142.938.625 1.79 1.364 2.387.227.17.455.313 1.023.654l3.354 1.932c.653.398 1.08.626 1.477.796.427.2.74.256 1.052.256.34 0 .653-.085 1.051-.256.398-.17.881-.455 1.478-.796l3.865-2.216c.341-.2.569-.313.71-.427.2-.142.313-.255.37-.397.085-.142.114-.284.142-.512.029-.199.029-.455.029-.824v-2.16C16 7.966 16 7.91 16 7.881ZM3.012 5.124l4.633-2.671c.284-.17.483-.284.653-.37.029 0 .057.029.086.029.142.057.34.17.625.34l4.689 2.7-4.69 2.7a5.062 5.062 0 0 1-.624.342c-.029.028-.057.028-.114 0a5.143 5.143 0 0 1-.625-.341L4.007 5.75a2.334 2.334 0 0 0-1.222-.341c-.114 0-.227 0-.313.028.114-.057.285-.17.54-.313Z"/>
              </g>
              <defs>
                <clipPath id="a">
                  <path fill="#fff" d="M0 .918h16v14.693H0z"/>
                </clipPath>
              </defs>
            </svg>
            <span className="font-medium">Docs</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
