import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { MarketDataProvider } from './contexts/MarketDataContext';
import { TradeHistoryProvider } from './contexts/TradeHistoryContext';
import { WalletProvider } from './contexts/WalletContext';
import { GasPriceProvider } from './contexts/GasPriceContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <WalletProvider>
      <GasPriceProvider>
        <MarketDataProvider>
          <TradeHistoryProvider>
            <App />
          </TradeHistoryProvider>
        </MarketDataProvider>
      </GasPriceProvider>
    </WalletProvider>
  </React.StrictMode>
);
