
import React, { useEffect, useRef, memo } from 'react';
import { useMarketData } from '../contexts/MarketDataContext';

const TradingChartComponent: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);
  const { currentPair } = useMarketData();

  useEffect(() => {
    if (!container.current) {
      return;
    }
    
    // Clear the container to remove the old widget before adding a new one
    container.current.innerHTML = '';

    const symbol = `BINANCE:${currentPair.replace('/', '')}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": symbol,
      "interval": "60",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "hide_side_toolbar": false, // This ensures the drawing toolbar with trendlines and annotations is visible.
      "allow_symbol_change": true,
      "details": true, // Show extra details like Open/High/Low/Close values.
      "withdateranges": true, // Show date range selector at the bottom of the chart.
      "studies": [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "Volume@tv-basicstudies",
        "BB@tv-basicstudies" // Added Volume and Bollinger Bands
      ],
      "backgroundColor": "#161B22",
      "gridColor": "#30363D"
    });

    container.current.appendChild(script);

  }, [currentPair]); // Re-run the effect when currentPair changes

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-0 overflow-hidden h-[500px]">
      <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }} />
    </div>
  );
};

export default memo(TradingChartComponent);