import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "@/react-app/components/ui/Button";
import { Bell, Menu, X } from "lucide-react";
export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);
  return <header className="bg-[#0a0a0a] border-b border-gray-800 h-14 relative z-[98]">
      <div className="h-full flex items-stretch">
        {/* Logo */}
        <div className="flex items-center px-6 border-r border-gray-800">
          {logoError ? (
            <span className="text-sm font-semibold text-white">FUTURE</span>
          ) : (
            <img 
              src="/logo.png" 
              alt="Future" 
              className="h-7 object-contain"
              onError={() => setLogoError(true)}
            />
          )}
        </div>

        {/* Desktop Navigation - Full Height Borders */}
        <nav className="hidden lg:flex items-stretch flex-1">
          <Link to="/" className="px-6 flex items-center text-sm font-medium text-gray-300 hover:text-white border-r border-gray-800 hover:bg-gray-800/50 transition-colors">HOME</Link>
          <Link to="/tracker" className="px-6 flex items-center text-sm font-medium text-gray-300 hover:text-white border-r border-gray-800 hover:bg-gray-800/50 transition-colors">TRACKER</Link>
          <Link to="/leaderboard" className="px-6 flex items-center text-sm font-medium text-gray-300 hover:text-white border-r border-gray-800 hover:bg-gray-800/50 transition-colors">
            LEADERBOARD
          </Link>
          <Link to="/alerts" className="px-6 flex items-center text-sm font-medium text-gray-300 hover:text-white border-r border-gray-800 hover:bg-gray-800/50 transition-colors">ALERTS</Link>
          <Link to="/portfolio" className="px-6 flex items-center text-sm font-medium text-gray-300 hover:text-white border-r border-gray-800 hover:bg-gray-800/50 transition-colors">PORTFOLIO</Link>
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-stretch ml-auto">
          {/* Notifications */}
          <div className="relative hidden md:flex" ref={notificationsRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="flex items-center px-4 border-l border-gray-800 hover:bg-gray-800/50 transition-colors h-full"
            >
              <Bell className="w-4 h-4 text-gray-300" />
            </button>
            
            {/* Notifications Popup */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-0 w-40 bg-[#0a0a0a] border border-gray-800 shadow-xl z-[9999]">
                <div className="p-6">
                  <div className="text-xs text-gray-400 text-center py-8">
                    You have no new notifications
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center gap-2 px-8 border-l border-gray-800 hover:bg-gray-800/50 transition-colors hidden sm:flex">
            <button className="text-sm font-medium text-white hover:text-white" style={{
            textShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.4)'
          }}>LOG IN</button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center px-4 border-l border-gray-800 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && <div className="lg:hidden border-t border-gray-800 py-3">
            <nav className="flex flex-col gap-0">
              <Link to="/" className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 border-b border-gray-800">
                TRADE
              </Link>
              <Link to="/portfolio" className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 border-b border-gray-800">
                PORTFOLIO
              </Link>
              <Link to="/tracker" className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 border-b border-gray-800">
                TRACKER
              </Link>
              <Link to="/leaderboard" className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 border-b border-gray-800">
                LEADERBOARD
              </Link>
              <Link to="/alerts" className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50">
                ALERTS
              </Link>
            </nav>
          </div>}
      </div>
    </header>;
}