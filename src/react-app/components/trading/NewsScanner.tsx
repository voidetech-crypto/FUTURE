import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/Card";
import { Button } from "@/react-app/components/ui/Button";
import { Newspaper, ExternalLink } from "lucide-react";

export default function NewsScanner() {
  const newsItems = [
    {
      id: 1,
      title: "MOCKDATA",
      source: "MOCKDATA",
      time: "MOCKDATA",
      impact: "MOCKDATA",
      relevantMarkets: ["MOCKDATA"]
    },
    {
      id: 2,
      title: "MOCKDATA",
      source: "MOCKDATA",
      time: "MOCKDATA", 
      impact: "MOCKDATA",
      relevantMarkets: ["MOCKDATA"]
    },
    {
      id: 3,
      title: "MOCKDATA",
      source: "MOCKDATA",
      time: "MOCKDATA",
      impact: "MOCKDATA",
      relevantMarkets: ["MOCKDATA"]
    },
    {
      id: 4,
      title: "MOCKDATA",
      source: "MOCKDATA",
      time: "MOCKDATA",
      impact: "MOCKDATA",
      relevantMarkets: ["MOCKDATA"]
    }
  ];

  const getImpactColor = () => {
    return 'text-gray-400';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="w-4 h-4" />
          News Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Filter Controls */}
        <div className="flex gap-1">
          <Button variant="default" size="sm" className="text-xs h-6 px-2">
            All
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
            High Impact
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
            Markets
          </Button>
        </div>

        {/* News Feed */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {newsItems.map((item) => (
            <div key={item.id} className="p-2 bg-gray-800 border border-gray-700">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-xs text-white flex-1 truncate">{item.title}</h4>
                <ExternalLink className="w-3 h-3 text-gray-400 ml-2 flex-shrink-0" />
              </div>
              
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{item.source}</span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
                <span className={`text-xs ${getImpactColor()} capitalize`}>
                  {item.impact}
                </span>
              </div>

              {item.relevantMarkets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.relevantMarkets.map((market, index) => (
                    <span
                      key={index}
                      className="text-xs bg-blue-900 text-blue-300 px-1 py-0.5"
                    >
                      {market}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
