import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, type MouseEventParams } from 'lightweight-charts';

export interface SeriesData {
  name: string;
  data: Array<{ time: number | string; value: number }>;
  color: string;
  lineColor?: string;
  type?: 'line' | 'area';
}

export interface TradingViewMultiSeriesChartProps {
  series: SeriesData[];
  height?: number;
  backgroundColor?: string;
  showGrid?: boolean;
  showCrosshair?: boolean;
  priceFormat?: {
    type: 'price' | 'volume' | 'percent';
    precision?: number;
    minMove?: number;
  };
  className?: string;
  fixedYAxisRange?: { min: number; max: number };
  expandRight?: number;
}

export default function TradingViewMultiSeriesChart({
  series,
  height = 300,
  backgroundColor = '#0a0a0a',
  showGrid = true,
  showCrosshair = true,
  priceFormat = { type: 'price', precision: 2 },
  className = '',
  fixedYAxisRange,
  expandRight = 0
}: TradingViewMultiSeriesChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<'Area' | 'Line'>>>(new Map());
  const seriesInfoRef = useRef<Map<ISeriesApi<'Area' | 'Line'>, { name: string; color: string }>>(new Map());
  const [hoverData, setHoverData] = useState<Array<{ name: string; price: number; color: string; y?: number | null }>>([]);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Don't create chart if no series data
    if (!series || series.length === 0) return;

    try {
      // Create chart with TradingView style
      const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: '#9CA3AF',
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: {
          color: showGrid ? '#1F2937' : 'transparent',
          style: 1,
        },
        horzLines: {
          color: showGrid ? '#1F2937' : 'transparent',
          style: 1,
        },
      },
      crosshair: {
        mode: showCrosshair ? 1 : 0,
        vertLine: {
          color: '#6B7280',
          width: 1,
          style: 3,
        },
        horzLine: {
          visible: false, // Hide horizontal crosshair line
          color: '#6B7280',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#374151',
        visible: true,
        ...(fixedYAxisRange && {
          autoScale: false,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        }),
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        barSpacing: 6,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    seriesInfoRef.current.clear();

    // Create series for each data set
    series.forEach((s) => {
      try {
        // Skip if no data
        if (!s.data || s.data.length === 0) return;
        
        let chartSeries: ISeriesApi<'Area' | 'Line'>;
        
        // Always use line series to show only lines without area fill
        chartSeries = chart.addLineSeries({
          color: s.lineColor || s.color,
          lineWidth: 2,
          priceFormat: priceFormat,
          lastValueVisible: false, // Hide the current price line
          priceLineVisible: false, // Hide price lines
        });

        // Transform and set data - validate each point
        let formattedData = s.data
          .filter(point => point != null && point.value != null && !isNaN(point.value))
          .map(point => {
            const time = typeof point.time === 'string' ? point.time : (typeof point.time === 'number' ? point.time : null);
            const value = typeof point.value === 'number' ? point.value : parseFloat(String(point.value || 0));
            
            if (time == null || isNaN(value) || !isFinite(value)) {
              return null;
            }
            
            return {
              time: time as Time,
              value: value,
            };
          })
          .filter((point): point is { time: Time; value: number } => point != null);

        if (formattedData.length > 0) {
          chartSeries.setData(formattedData);
          seriesRefs.current.set(s.name, chartSeries);
          seriesInfoRef.current.set(chartSeries, {
            name: s.name,
            color: s.lineColor || s.color,
          });
        }
      } catch (error) {
        console.error(`[TradingViewMultiSeriesChart] Error creating series for ${s.name}:`, error);
      }
    });

    // If fixed Y-axis range is provided, set the price scale to show the fixed range
    // We'll manually set the visible range without adding boundary data points
    // to avoid creating diagonal lines
    if (fixedYAxisRange && series.length > 0 && series[0].data && series[0].data.length > 0) {
      // Disable auto-scale and set the range directly
      chart.priceScale('right').applyOptions({
        autoScale: false,
        scaleMargins: {
          top: 0.05,
          bottom: 0.05,
        },
      });
      
      // After a brief delay, manually set the visible range
      // This ensures the scale shows 0-1 without adding visible data points
      setTimeout(() => {
        if (chartRef.current) {
          // Force the scale to show the full range by temporarily adding
          // invisible price lines, then removing them
          const firstSeries = Array.from(seriesRefs.current.values())[0];
          if (firstSeries) {
            const minLine = firstSeries.createPriceLine({
              price: fixedYAxisRange.min,
              color: backgroundColor,
              lineWidth: 1,
              lineStyle: 0,
              axisLabelVisible: false,
              title: '',
            });
            const maxLine = firstSeries.createPriceLine({
              price: fixedYAxisRange.max,
              color: backgroundColor,
              lineWidth: 1,
              lineStyle: 0,
              axisLabelVisible: false,
              title: '',
            });
            
            // Remove the price lines immediately after they establish the scale
            setTimeout(() => {
              firstSeries.removePriceLine(minLine);
              firstSeries.removePriceLine(maxLine);
            }, 100);
          }
        }
      }, 50);
    }

    // Fit content and prevent scrolling beyond data range
    try {
      // Get the actual data range first
      let minTime: number | null = null;
      let maxTime: number | null = null;
      
      if (series.length > 0 && series[0].data && series[0].data.length > 0) {
        const firstSeriesData = series[0].data;
        const times = firstSeriesData.map(d => typeof d.time === 'number' ? d.time : parseInt(String(d.time)));
        minTime = Math.min(...times);
        maxTime = Math.max(...times);
      }
      
      chart.timeScale().fitContent();
      
      // After fitting, apply options to prevent scrolling beyond data
      if (minTime != null && maxTime != null) {
        chart.timeScale().applyOptions({
          fixLeftEdge: true,
          fixRightEdge: true,
          rightBarStaysOnScroll: true,
        });
        
        // Set the visible range to match the data range
        chart.timeScale().setVisibleRange({
          from: minTime as Time,
          to: maxTime as Time,
        });
      }
      
      chartRef.current = chart;
    } catch (error) {
      console.error('[TradingViewMultiSeriesChart] Error fitting content:', error);
      chartRef.current = chart;
    }
      } catch (error) {
        console.error('[TradingViewMultiSeriesChart] Error creating chart:', error);
        return;
      }

    const handleCrosshairMove = (param: MouseEventParams) => {
      try {
        if (!param) {
          setHoverData([]);
          setHoverPoint(null);
          return;
        }

        const nextHoverData: Array<{ name: string; price: number; color: string; y?: number | null }> = [];

        // Handle seriesPrices - lightweight-charts returns it as a Map
        const seriesPrices = param.seriesPrices;
        if (seriesPrices && seriesPrices instanceof Map) {
          // Iterate over the seriesPrices Map directly
          seriesPrices.forEach((price, seriesApi) => {
            try {
              // Look up the series info by the seriesApi
              const info = seriesInfoRef.current.get(seriesApi);
              if (info && price != null && typeof price === 'number' && !Number.isNaN(price) && isFinite(price)) {
                // Get Y coordinate from the price scale
                let yCoord: number | null = null;
                try {
                  yCoord = seriesApi.priceToCoordinate(price) ?? null;
                } catch (err) {
                  console.warn(`[TradingViewMultiSeriesChart] Error getting Y coordinate for ${info.name}:`, err);
                }
                
                nextHoverData.push({
                  name: info.name,
                  price: price,
                  color: info.color,
                  y: yCoord,
                });
              }
            } catch (err) {
              // Skip this series if there's an error
              console.warn(`[TradingViewMultiSeriesChart] Error processing price:`, err);
            }
          });
        } else if (seriesPrices && typeof seriesPrices === 'object') {
          // Fallback: try to iterate over seriesInfoRef and match with seriesPrices
          seriesInfoRef.current.forEach((info, seriesApi) => {
            try {
              // Try different ways to access the price
              let price: number | undefined;
              
              // Try as Map first
              if (seriesPrices instanceof Map) {
                price = seriesPrices.get(seriesApi) as number | undefined;
              } else {
                // Try as object property
                price = (seriesPrices as any)[seriesApi] as number | undefined;
              }
              
              if (price != null && typeof price === 'number' && !Number.isNaN(price) && isFinite(price)) {
                // Get Y coordinate from the price scale
                let yCoord: number | null = null;
                try {
                  yCoord = seriesApi.priceToCoordinate(price) ?? null;
                } catch (err) {
                  console.warn(`[TradingViewMultiSeriesChart] Error getting Y coordinate for ${info.name}:`, err);
                }
                
                nextHoverData.push({
                  name: info.name,
                  price: price,
                  color: info.color,
                  y: yCoord,
                });
              }
            } catch (err) {
              // Skip this series if there's an error
            }
          });
        }

        setHoverData(nextHoverData);
        
        // Set hover point for positioning labels
        if (param.point && chartContainerRef.current) {
          setHoverPoint({
            x: param.point.x,
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        } else if (nextHoverData.length === 0) {
          setHoverPoint(null);
        }
      } catch (error) {
        console.error('[TradingViewMultiSeriesChart] Error handling crosshair move:', error);
        setHoverData([]);
        setHoverPoint(null);
      }
    };

    // Subscribe to crosshair move events
    try {
      chart.subscribeCrosshairMove(handleCrosshairMove);
    } catch (error) {
      console.error('[TradingViewMultiSeriesChart] Error subscribing to crosshair move:', error);
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      setHoverData([]);
      setHoverPoint(null);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          chartRef.current.unsubscribeCrosshairMove(handleCrosshairMove);
        } catch (e) {
          // Ignore errors during cleanup
        }
        // Clean up invisible boundary series if it exists
        const invisibleSeries = (seriesRefs.current as any).__invisibleBoundarySeries;
        if (invisibleSeries) {
          try {
            chartRef.current.removeSeries(invisibleSeries);
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
        try {
          chartRef.current.remove();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      seriesRefs.current.clear();
      seriesInfoRef.current.clear();
    };
  }, [series, height, backgroundColor, showGrid, showCrosshair, priceFormat, fixedYAxisRange]);

  // Update data when it changes
  useEffect(() => {
    if (!chartRef.current) return;
    if (seriesRefs.current.size === 0 || !series || series.length === 0) return;
    
    try {
      series.forEach((s) => {
        try {
          const chartSeries = seriesRefs.current.get(s.name);
          if (chartSeries && s.data && s.data.length > 0) {
            seriesInfoRef.current.set(chartSeries, {
              name: s.name,
              color: s.lineColor || s.color,
            });
            // Validate and format data
            let formattedData = s.data
              .filter(point => point != null && point.value != null && !isNaN(point.value))
              .map(point => {
                const time = typeof point.time === 'string' ? point.time : (typeof point.time === 'number' ? point.time : null);
                const value = typeof point.value === 'number' ? point.value : parseFloat(String(point.value || 0));
                
                if (time == null || isNaN(value) || !isFinite(value)) {
                  return null;
                }
                
                return {
                  time: time as Time,
                  value: value,
                };
              })
              .filter((point): point is { time: Time; value: number } => point != null);
            
            if (formattedData.length > 0) {
              chartSeries.setData(formattedData);
            }
          }
        } catch (error) {
          console.error(`[TradingViewMultiSeriesChart] Error updating series ${s.name}:`, error);
        }
      });
      if (chartRef.current) {
        try {
          // Get the actual data range first
          let minTime: number | null = null;
          let maxTime: number | null = null;
          
          if (series.length > 0 && series[0].data && series[0].data.length > 0) {
            const firstSeriesData = series[0].data;
            const times = firstSeriesData.map(d => typeof d.time === 'number' ? d.time : parseInt(String(d.time)));
            minTime = Math.min(...times);
            maxTime = Math.max(...times);
          }
          
          chartRef.current.timeScale().fitContent();
          
          // Apply options to prevent scrolling beyond data
          if (minTime != null && maxTime != null) {
            chartRef.current.timeScale().applyOptions({
              fixLeftEdge: true,
              fixRightEdge: true,
              rightBarStaysOnScroll: true,
            });
            
            // Set the visible range to match the data range
            chartRef.current.timeScale().setVisibleRange({
              from: minTime as Time,
              to: maxTime as Time,
            });
          }
        } catch (error) {
          console.error('[TradingViewMultiSeriesChart] Error updating time scale:', error);
        }
        
        // Ensure fixed range is maintained
        if (fixedYAxisRange && series.length > 0 && series[0].data && series[0].data.length > 0) {
          try {
            chartRef.current.priceScale('right').applyOptions({
              autoScale: false,
              scaleMargins: {
                top: 0.05,
                bottom: 0.05,
              },
            });
          } catch (error) {
            console.error('[TradingViewMultiSeriesChart] Error updating price scale:', error);
          }
        }
      }
    } catch (error) {
      console.error('[TradingViewMultiSeriesChart] Error in update effect:', error);
    }
  }, [series, fixedYAxisRange, priceFormat]);

  const extraWidth = Math.max(0, expandRight);
  const containerStyle: CSSProperties = {
    width: extraWidth > 0 ? `calc(100% + ${extraWidth}px)` : '100%',
    height: `${height}px`,
    marginRight: extraWidth > 0 ? `-${extraWidth}px` : undefined,
  };
  const innerContainerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
  };
  const pricePrecision = priceFormat?.precision ?? 2;
  const markerBoxWidth = 120;
  const markerBoxHeight = 28;

  useEffect(() => {
    if (chartContainerRef.current && chartRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    }
  }, [expandRight]);

  return (
    <div className={`relative tradingview-multi-chart ${className}`} style={containerStyle}>
      <div ref={chartContainerRef} style={innerContainerStyle} />
      {hoverData.length > 0 && (
        <div 
          className="pointer-events-none absolute top-2 left-3 z-50 flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-black/80 px-3 py-2 text-xs font-medium backdrop-blur-sm border border-gray-700"
          style={{ 
            minWidth: '120px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
          }}
        >
          {hoverData.map(({ name, price, color }) => (
            <div key={name} className="flex items-center gap-2 whitespace-nowrap">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span style={{ color }} className="font-semibold">{name}:</span>
              <span className="text-white">{price.toFixed(pricePrecision)}</span>
            </div>
          ))}
        </div>
      )}
      {hoverPoint && hoverData.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40" style={{ pointerEvents: 'none' }}>
          {hoverData.map(({ name, price, color, y }) => {
            if (y == null || y < 0) return null;
            
            const containerWidth = hoverPoint.width;
            const containerHeight = hoverPoint.height;
            const baseLeft = hoverPoint.x + 12;
            const maxLeft = Math.max(containerWidth - markerBoxWidth - 8, 0);
            const left = Math.min(Math.max(baseLeft, 8), maxLeft);
            const baseTop = y - markerBoxHeight / 2;
            const top = Math.min(Math.max(baseTop, 8), Math.max(containerHeight - markerBoxHeight - 8, 8));

            return (
              <div
                key={`${name}-marker-box`}
                className="absolute rounded-md px-2 py-1 text-xs font-medium flex items-center gap-2 whitespace-nowrap"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  minWidth: `${markerBoxWidth}px`,
                  height: `${markerBoxHeight}px`,
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: `1px solid ${color}`,
                  color: '#f9fafb',
                  boxShadow: '0 6px 12px -4px rgba(0,0,0,0.45)',
                  zIndex: 50,
                }}
              >
                <div
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate font-semibold" style={{ color }}>{name}</span>
                <span className="ml-auto text-white">{price.toFixed(pricePrecision)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

