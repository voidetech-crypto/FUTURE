import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export interface TradingViewSparklineProps {
  data: number[] | Array<{ time: number | string; value: number }>;
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}

export default function TradingViewSparkline({
  data,
  color = '#2962FF',
  height = 32,
  width,
  className = ''
}: TradingViewSparklineProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Transform data format if needed
    const formattedData = Array.isArray(data) && data.length > 0 && typeof data[0] === 'number'
      ? data.map((value, index) => ({ time: index, value }))
      : data as Array<{ time: number | string; value: number }>;

    // Create minimal chart for sparkline
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent', // Hide all text
      },
      width: width || chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: 0, // Disable crosshair
      },
      rightPriceScale: {
        visible: false, // Hide price scale
        borderVisible: false,
      },
      leftPriceScale: {
        visible: false, // Hide price scale
        borderVisible: false,
      },
      timeScale: {
        visible: false, // Hide time scale
        borderVisible: false,
      },
    });

    // Create line series
    const lineSeries = chart.addLineSeries({
      color: color,
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Format and set data
    const chartData = formattedData.map(point => ({
      time: (typeof point.time === 'string' ? point.time : point.time) as Time,
      value: point.value,
    }));

    lineSeries.setData(chartData);

    // Fit content
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = width || chartContainerRef.current.clientWidth;
        chartRef.current.applyOptions({
          width: newWidth,
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
  }, [data, height, width, color]);

  // Update data when it changes
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const formattedData = Array.isArray(data) && data.length > 0 && typeof data[0] === 'number'
        ? data.map((value, index) => ({ time: index, value }))
        : data as Array<{ time: number | string; value: number }>;

      const chartData = formattedData.map(point => ({
        time: (typeof point.time === 'string' ? point.time : point.time) as Time,
        value: point.value,
      }));
      
      seriesRef.current.setData(chartData);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  return (
    <div 
      ref={chartContainerRef} 
      className={`tradingview-sparkline ${className}`} 
      style={{ 
        width: width ? `${width}px` : '100%', 
        height: `${height}px`,
        backgroundColor: 'transparent'
      }} 
    />
  );
}

