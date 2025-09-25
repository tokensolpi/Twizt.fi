import React, { useEffect, useRef, memo } from 'react';

const TradingChartComponent: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the effect runs only once by checking if the script has already been added.
    if (!container.current || container.current.hasChildNodes()) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": "BINANCE:BTCUSDT",
      "interval": "60",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "hide_side_toolbar": false, // Show drawing tools for analysis
      "allow_symbol_change": true,
      "studies": [
        "MASimple@tv-basicstudies", // Moving Average
        "RSI@tv-basicstudies"      // Relative Strength Index
      ],
      "backgroundColor": "#161B22", // Matches brand-surface
      "gridColor": "#30363D"      // Matches brand-border
    });

    container.current.appendChild(script);
  }, []);

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-0 overflow-hidden h-[500px]">
      <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }} />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders which could interfere with the third-party script.
export default memo(TradingChartComponent);
