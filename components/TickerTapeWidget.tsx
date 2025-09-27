
import React, { useEffect, useRef, memo } from 'react';

const TickerTapeWidget: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the effect runs only once by checking if the script has already been added.
    if (!container.current || container.current.hasChildNodes()) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "BINANCE:BTCUSDT", "title": "Bitcoin" },
        { "proName": "BINANCE:ETHUSDT", "title": "Ethereum" },
        { "proName": "BINANCE:SOLUSDT", "title": "Solana" }
      ],
      "showSymbolLogo": true,
      "colorTheme": "dark",
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "en"
    });

    container.current.appendChild(script);
  }, []);

  // The outer div provides a background and border consistent with the app's theme.
  return (
    <div className="bg-brand-surface border-b border-brand-border">
      <div className="tradingview-widget-container" ref={container} />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders which could interfere with the third-party script.
export default memo(TickerTapeWidget);
