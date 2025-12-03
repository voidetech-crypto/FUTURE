import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export interface TradingViewChartProps {
  data: Array<{ time: number | string; value: number }>;
  height?: number;
  color?: string;
  lineColor?: string;
  areaColor?: string;
  showGrid?: boolean;
  showCrosshair?: boolean;
  showTimeScale?: boolean;
  showPriceScale?: boolean;
  transparent?: boolean;
  priceFormat?: {
    type: 'price' | 'volume' | 'percent';
    precision?: number;
    minMove?: number;
  };
  className?: string;
}

export default function TradingViewChart({
  data,
  height = 300,
  color = '#0a0a0a',
  lineColor = '#2962FF',
  areaColor = 'rgba(41, 98, 255, 0.1)',
  showGrid = true,
  showCrosshair = true,
  showTimeScale = true,
  showPriceScale = true,
  transparent = false,
  priceFormat = { type: 'price', precision: 2 },
  className = ''
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area' | 'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with TradingView style
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: transparent 
          ? { type: ColorType.Solid, color: 'transparent' }
          : { type: ColorType.Solid, color: color },
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
          color: '#6B7280',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: transparent ? 'transparent' : '#374151',
        visible: showPriceScale,
      },
      timeScale: {
        borderColor: transparent ? 'transparent' : '#374151',
        visible: showTimeScale,
        timeVisible: showTimeScale,
        secondsVisible: false,
      },
    });

    // Create series - use line when transparent, area otherwise
    let chartSeries: ISeriesApi<'Area' | 'Line'>;
    if (transparent) {
      chartSeries = chart.addLineSeries({
        color: lineColor,
        lineWidth: 2,
        priceFormat: priceFormat,
      });
    } else {
      chartSeries = chart.addAreaSeries({
        lineColor: lineColor,
        topColor: areaColor,
        bottomColor: color,
        lineWidth: 2,
        priceFormat: priceFormat,
      });
    }

    // Transform, sort, and deduplicate data
    // Sort by time ascending and remove duplicates
    const sortedData = [...data]
      .sort((a, b) => {
        const timeA = typeof a.time === 'string' ? parseInt(a.time) : a.time;
        const timeB = typeof b.time === 'string' ? parseInt(b.time) : b.time;
        return timeA - timeB;
      })
      .filter((point, index, array) => {
        // Remove duplicates - keep only the first occurrence of each timestamp
        const time = typeof point.time === 'string' ? parseInt(point.time) : point.time;
        if (index === 0) return true;
        const prevTime = typeof array[index - 1].time === 'string' 
          ? parseInt(array[index - 1].time) 
          : array[index - 1].time;
        return time !== prevTime;
      });

    const formattedData = sortedData.map(point => {
      let timeValue = typeof point.time === 'string' ? parseInt(point.time) : point.time;
      // Convert milliseconds to seconds if timestamp is in milliseconds (>= year 2000 in ms = 946684800000)
      // lightweight-charts expects Unix timestamp in seconds
      if (timeValue > 946684800000) { // Jan 1, 2000 in milliseconds
        timeValue = Math.floor(timeValue / 1000);
      }
      return {
        time: timeValue as Time,
        value: point.value || 0,
      };
    }).filter(point => point.value !== undefined && !isNaN(point.value)); // Remove invalid data points

    try {
      chartSeries.setData(formattedData);
    } catch (error) {
      console.error('Error setting chart data:', error);
    }

    // Fit content
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = chartSeries;

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
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [data, height, color, lineColor, areaColor, showGrid, showCrosshair, showTimeScale, showPriceScale, transparent, priceFormat]);

  // Update data when it changes
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      // Sort by time ascending and remove duplicates
      const sortedData = [...data]
        .sort((a, b) => {
          const timeA = typeof a.time === 'string' ? parseInt(a.time) : a.time;
          const timeB = typeof b.time === 'string' ? parseInt(b.time) : b.time;
          return timeA - timeB;
        })
        .filter((point, index, array) => {
          // Remove duplicates - keep only the first occurrence of each timestamp
          const time = typeof point.time === 'string' ? parseInt(point.time) : point.time;
          if (index === 0) return true;
          const prevTime = typeof array[index - 1].time === 'string' 
            ? parseInt(array[index - 1].time) 
            : array[index - 1].time;
          return time !== prevTime;
        });

      const formattedData = sortedData.map(point => {
        let timeValue = typeof point.time === 'string' ? parseInt(point.time) : point.time;
        // Convert milliseconds to seconds if timestamp is in milliseconds (>= year 2000 in ms = 946684800000)
        // lightweight-charts expects Unix timestamp in seconds
        if (timeValue > 946684800000) { // Jan 1, 2000 in milliseconds
          timeValue = Math.floor(timeValue / 1000);
        }
        return {
          time: timeValue as Time,
          value: point.value || 0,
        };
      }).filter(point => point.value !== undefined && !isNaN(point.value)); // Remove invalid data points

      try {
        seriesRef.current.setData(formattedData);
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Error updating chart data:', error);
      }
    }
  }, [data]);

  return (
    <div 
      ref={chartContainerRef} 
      className={`tradingview-chart ${className}`} 
      style={{ 
        width: '100%', 
        height: `${height}px`,
        backgroundColor: transparent ? 'transparent' : undefined
      }} 
    />
  );
}

