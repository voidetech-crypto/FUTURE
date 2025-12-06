import { useState } from "react";
import MarketOverview from "@/react-app/components/trading/MarketOverview";
import MarketWindow from "@/react-app/components/trading/MarketWindow";

interface HomeProps {
  isWalletPanelOpen?: boolean;
}

export default function Home({ isWalletPanelOpen = false }: HomeProps) {
  const [selectedMarket, setSelectedMarket] = useState<any>(null);

  const handleMarketClick = (market: any) => {
    setSelectedMarket(market);
  };

  const handleCloseMarketWindow = () => {
    setSelectedMarket(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 p-2 pb-16 overflow-hidden flex justify-center">
        <div className="w-full max-w-[90rem]" style={{ height: 'calc(100% + 20px)' }}>
          <MarketOverview 
            showAllMarkets={true} 
            defaultLimit={100} 
            useSubgraph={true} 
            onMarketClick={handleMarketClick}
            isWalletPanelOpen={isWalletPanelOpen}
          />
        </div>
      </div>

      {/* Market Window Overlay */}
      <MarketWindow 
        market={selectedMarket} 
        isOpen={!!selectedMarket}
        onClose={handleCloseMarketWindow}
      />
    </div>
  );
}

