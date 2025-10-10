import React, { useEffect, useRef, memo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const TickerTapeWidget: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!container.current) {
      return;
    }
    // Clear previous widget before re-rendering on theme change
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "BINANCE:BTCUSDT", "title": "Bitcoin" },
        { "proName": "BINANCE:ETHUSDT", "title": "Ethereum" },
        { "proName": "BINANCE:SOLUSDT", "title": "Solana" },
        { "proName": "BINANCE:LINKUSDT", "title": "Chainlink" }
      ],
      "showSymbolLogo": true,
      "colorTheme": theme,
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "en"
    });

    container.current.appendChild(script);
  }, [theme]);

  // The outer div provides a background and border consistent with the app's theme.
  return (
    <div className="bg-brand-surface border-b border-brand-border">
      <div className="tradingview-widget-container" ref={container} />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders which could interfere with the third-party script.
export default memo(TickerTapeWidget);
