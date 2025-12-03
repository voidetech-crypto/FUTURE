import { useState, useRef, useEffect } from "react";
import { Download, Copy, Check } from "lucide-react";

interface PnlCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  pnlData: {
    pnl: number;
    predictions: number;
    profileViews: number;
  };
  currentTimeframe: "1D" | "1W" | "1M" | "ALL";
  onTimeframeChange: (timeframe: "1D" | "1W" | "1M" | "ALL") => void;
}

export function PnlCardGenerator({
  isOpen,
  onClose,
  pnlData,
  currentTimeframe,
  onTimeframeChange
}: PnlCardGeneratorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle smooth open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timeoutId = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timeoutId);
    } else {
      setIsVisible(false);
      const timeoutId = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const getTimeframeLabel = () => {
    switch (currentTimeframe) {
      case "1D":
        return "1D";
      case "1W":
        return "7D";
      case "1M":
        return "30D";
      case "ALL":
        return "MAX";
      default:
        return "30D";
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `pnl-card-${getTimeframeLabel().toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set copied state immediately for better UX
    setCopied(true);
    
    try {
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setTimeout(() => setCopied(false), 2000);
          return;
        }
        
        try {
          // Copy to clipboard using Clipboard API
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          // Reset button text after 2 seconds
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
          setTimeout(() => setCopied(false), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to copy image:', err);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Load image and draw when ready
  useEffect(() => {
    if (!isOpen || !isMounted) return;

    const drawCard = () => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) {
        // Retry if refs aren't ready yet
        setTimeout(drawCard, 50);
        return;
      }

      // Ensure image has dimensions
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        // Wait a bit and try again if image isn't ready
        setTimeout(drawCard, 50);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setCanvasWidth(img.naturalWidth);

      // Draw the background image
      ctx.drawImage(img, 0, 0);

      // Set text styles
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      // Top row: [Xtimeframe] Profit/Loss
      ctx.font = "36px 'Geist', sans-serif";
      const timeframeLabel = getTimeframeLabel();
      const topText = `${timeframeLabel} Profit/Loss`;
      ctx.fillText(topText, 40, 110);

      // Second row: Xpnl in dollar amount (larger, prominent)
      ctx.font = "48px 'Geist', sans-serif";
      // Format PNL as whole dollars without cents
      const pnlWhole = Math.round(pnlData.pnl);
      const pnlFormatted = pnlWhole >= 0 
        ? `+$${pnlWhole.toLocaleString()}` 
        : `-$${Math.abs(pnlWhole).toLocaleString()}`;
      ctx.fillText(pnlFormatted, 40, 160);

      // Third row (smaller font): Predictions: number (right-aligned)
      ctx.font = "16px 'Geist', sans-serif";
      const predictionsLabel = "Predictions: ";
      const predictionsNumber = pnlData.predictions.toLocaleString();
      const predictionsLabelWidth = ctx.measureText(predictionsLabel).width;
      const predictionsNumberWidth = ctx.measureText(predictionsNumber).width;
      // Right-align numbers - find the rightmost position for alignment
      const rightAlignX = 40 + Math.max(predictionsLabelWidth + predictionsNumberWidth, ctx.measureText("Profile views: ").width + ctx.measureText(pnlData.profileViews.toLocaleString()).width);
      ctx.fillText(predictionsLabel, 40, 230);
      ctx.fillText(predictionsNumber, rightAlignX - predictionsNumberWidth, 230);

      // Fourth row: Profile views: number (right-aligned)
      ctx.font = "16px 'Geist', sans-serif";
      const viewsLabel = "Profile views: ";
      const viewsNumber = pnlData.profileViews.toLocaleString();
      const viewsLabelWidth = ctx.measureText(viewsLabel).width;
      const viewsNumberWidth = ctx.measureText(viewsNumber).width;
      ctx.fillText(viewsLabel, 40, 260);
      ctx.fillText(viewsNumber, rightAlignX - viewsNumberWidth, 260);
    };

    // Wait a bit for DOM to be ready, then check image
    const checkAndDraw = () => {
      const img = imageRef.current;
      if (!img) {
        // Image ref not ready yet, retry
        setTimeout(checkAndDraw, 50);
        return;
      }

      if (img.complete && img.naturalWidth > 0) {
        // Image is already loaded
        drawCard();
      } else {
        // Wait for image to load
        const handleLoad = () => {
          drawCard();
          img.removeEventListener('load', handleLoad);
        };
        img.addEventListener('load', handleLoad);
        
        // Also try drawing after a short delay in case onload doesn't fire
        const timeoutId = setTimeout(() => {
          if (img.complete && img.naturalWidth > 0) {
            drawCard();
          }
        }, 200);
        
        return () => {
          clearTimeout(timeoutId);
          img.removeEventListener('load', handleLoad);
        };
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(checkAndDraw, 10);
    return () => clearTimeout(timeoutId);
  }, [isOpen, isMounted, currentTimeframe, pnlData]);

  if (!isMounted) return null;

  return (
    <>
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4 overflow-y-auto transition-opacity duration-300 ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${!isVisible ? "pointer-events-none" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      {/* Canvas - No borders or containers */}
      <div
        className="flex items-center justify-center mb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imageRef}
          src="/PNL-card.png"
          alt="PNL Card"
          className="max-w-full h-auto"
          style={{ display: "none" }}
        />
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded-md"
          style={{ maxWidth: "100%" }}
        />
      </div>

      {/* Buttons - Separate from canvas, aligned to card edges */}
      <div
        className="flex items-center justify-between"
        style={{ width: canvasWidth ? `${canvasWidth}px` : 'auto', maxWidth: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Timeframe Selection */}
        <div className="flex items-center gap-2">
          {(["1D", "1W", "1M", "ALL"] as const).map((timeframe) => {
            const labels: Record<"1D" | "1W" | "1M" | "ALL", string> = {
              "1D": "1D",
              "1W": "7D",
              "1M": "30D",
              "ALL": "MAX"
            };
            return (
              <button
                key={timeframe}
                onClick={() => onTimeframeChange(timeframe)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentTimeframe === timeframe
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {labels[timeframe]}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md font-medium transition-colors flex items-center gap-2"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

