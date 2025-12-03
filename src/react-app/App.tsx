import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import Header from "@/react-app/components/layout/Header";
import Footer from "@/react-app/components/layout/Footer";
import WatchlistRow from "@/react-app/components/layout/WatchlistRow";
import WalletPanel from "@/react-app/components/wallet/WalletPanel";
import Home from "@/react-app/pages/Home";
import Leaderboard from "@/react-app/pages/Leaderboard";
import Market from "@/react-app/pages/Market";
import Alerts from "@/react-app/pages/Alerts";
import Portfolio from "@/react-app/pages/Portfolio";
import Tracker from "@/react-app/pages/Tracker";

export default function App() {
  const [isWalletPanelOpen, setIsWalletPanelOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(true);
  const [isNotificationVolumeOn, setIsNotificationVolumeOn] = useState(true);

  return (
    <Router>
      <div className="h-screen bg-[#0a0a0a] flex flex-col">
        <Header />
        {isWatchlistOpen && <WatchlistRow />}
        <div className="flex-1 overflow-hidden flex">
          <main className="flex-1 overflow-hidden transition-all duration-300">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/market/:id" element={<Market />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/tracker" element={<Tracker />} />
            </Routes>
          </main>
          <WalletPanel 
            isOpen={isWalletPanelOpen} 
            onClose={() => setIsWalletPanelOpen(false)} 
          />
        </div>
        <Footer 
          onWalletClick={() => setIsWalletPanelOpen(!isWalletPanelOpen)}
          isWalletPanelOpen={isWalletPanelOpen}
          onWatchlistToggle={() => setIsWatchlistOpen(!isWatchlistOpen)}
          isWatchlistOpen={isWatchlistOpen}
          onNotificationVolumeToggle={() => setIsNotificationVolumeOn(!isNotificationVolumeOn)}
          isNotificationVolumeOn={isNotificationVolumeOn}
        />
      </div>
    </Router>
  );
}
