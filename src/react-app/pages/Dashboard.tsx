import MarketOverview from "@/react-app/components/trading/MarketOverview";

export default function Dashboard() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 p-2 pb-16 overflow-hidden flex justify-center">
        <div className="w-full max-w-[90rem]" style={{ height: 'calc(100% + 20px)' }}>
          <MarketOverview />
        </div>
      </div>
    </div>
  );
}
