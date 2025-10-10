import React, { useState } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';
import { Order, OrderStatus, OrderType, FuturesPosition } from '../types';
import { CryptoIcon } from './icons/CryptoIcon';
import { ARBITRUM_BLOCK_EXPLORER } from '../constants';

const PositionsAndOrders: React.FC = () => {
  const { balances, openOrders, orderHistory, futuresPositions, cancelOrder, closeFuturesPosition } = useTradeHistory();
  const [activeTab, setActiveTab] = useState<'wallet' | 'positions' | 'open' | 'history'>('wallet');

  const TabButton: React.FC<{ tab: 'wallet' | 'positions' | 'open' | 'history'; label: string; count?: number }> = ({ tab, label, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
        activeTab === tab 
          ? 'bg-brand-primary text-white' 
          : 'bg-brand-bg hover:bg-brand-border text-brand-secondary'
      }`}
    >
      {label} {count !== undefined && <span className="text-xs opacity-70">({count})</span>}
    </button>
  );

  const OrderRow: React.FC<{ order: Order, isHistory?: boolean }> = ({ order, isHistory = false }) => (
    <tr className="border-b border-brand-border last:border-b-0 hover:bg-brand-border/20">
      <td className="p-2 text-brand-text-primary">{order.pair}</td>
      <td className={`p-2 ${order.type === OrderType.BUY ? 'text-green-400' : 'text-red-400'}`}>{order.type}</td>
      <td className="p-2 text-brand-text-primary">{order.price.toFixed(2)}</td>
      <td className="p-2 text-brand-text-primary">{order.amount.toFixed(4)}</td>
      <td className={`p-2`}>
         <span className={`${
           order.status === OrderStatus.LIQUIDATED ? 'text-red-500 font-semibold' : 
           order.status === OrderStatus.PENDING ? 'text-yellow-500 animate-pulse' : 'text-brand-secondary'
         }`}>
           {isHistory ? order.status : order.status === OrderStatus.OPEN ? order.createdAt : order.status}
         </span>
      </td>
      <td className="p-2 text-right text-xs">
        {order.txHash ? (
          <a href={`${ARBITRUM_BLOCK_EXPLORER}/tx/${order.txHash}`} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
            View Tx
          </a>
        ) : !isHistory && order.status === OrderStatus.OPEN ? (
          <button onClick={() => cancelOrder(order.id)} className="text-brand-red hover:underline">Cancel</button>
        ) : null}
      </td>
    </tr>
  );

  const PositionCard: React.FC<{ position: FuturesPosition }> = ({ position }) => {
    const isProfit = position.unrealizedPnl >= 0;
    const pnlPercentage = position.margin > 0 ? (position.unrealizedPnl / position.margin) * 100 : 0;

    return (
      <div className="bg-brand-bg p-3 border border-brand-border rounded-lg text-xs font-mono">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-brand-text-primary font-semibold text-sm">{position.pair}</span>
            <p className={`font-semibold text-base ${position.side === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
              {position.side} {position.leverage}x
            </p>
          </div>
          <div className="text-right">
             <span className="text-brand-secondary text-[10px]">Unrealized PNL / ROI %</span>
             <p className={`text-base font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                {isProfit ? '+' : ''}{position.unrealizedPnl.toFixed(2)} USDT
             </p>
             <p className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                ({isProfit ? '+' : ''}{pnlPercentage.toFixed(2)}%)
             </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
          <div>
            <span className="text-brand-secondary block">Size</span>
            <p className="text-brand-text-primary">{position.size.toFixed(4)} {position.pair.split('/')[0]}</p>
          </div>
          <div>
            <span className="text-brand-secondary block">Entry Price</span>
            <p className="text-brand-text-primary">{position.entryPrice.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-brand-secondary block">Margin</span>
            <p className="text-brand-text-primary">{position.margin.toFixed(2)} USDT</p>
          </div>
          <div>
            <span className="text-brand-secondary block">Liq. Price</span>
            <p className="text-yellow-500 font-semibold">{position.liquidationPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex justify-end mt-3 border-t border-brand-border pt-3">
            <button 
              onClick={() => closeFuturesPosition(position.id)}
              className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-md hover:bg-brand-primary/20 transition-colors text-xs font-semibold"
            >
              Close Position
            </button>
        </div>
      </div>
    );
  }
  
  const BalanceRow: React.FC<{ asset: string; name: string; balance: number; }> = ({ asset, name, balance }) => (
    <div className="flex justify-between items-center text-sm px-3 py-2.5 border-b border-brand-border last:border-b-0 hover:bg-brand-border/20">
      <div className="flex items-center gap-3">
        <CryptoIcon asset={asset.toLowerCase()} />
        <div>
          <p className="font-mono text-brand-text-primary font-medium">{asset}</p>
          <p className="text-xs text-brand-secondary">{name}</p>
        </div>
      </div>
      <p className="font-mono text-brand-text-primary">{balance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
    </div>
  );
  
  const ASSET_NAMES: Record<string, string> = {
    usdt: "Tether",
    btc: "Bitcoin",
    eth: "Ethereum",
    sol: "Solana",
    link: "Chainlink",
    gdp: "LP Token"
  };


  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <TabButton tab="wallet" label="Wallet" />
        <TabButton tab="positions" label="Positions" count={futuresPositions.length} />
        <TabButton tab="open" label="Open Orders" count={openOrders.length} />
        <TabButton tab="history" label="Order History" count={orderHistory.length} />
      </div>
      
      <div className="h-64 overflow-y-auto">
        {activeTab === 'wallet' && (
           <div className="space-y-px">
              {Object.entries(balances)
                .sort(([assetA], [assetB]) => assetA.localeCompare(assetB))
                .map(([asset, balance]) => {
                if (balance === 0 && asset !== 'usdt') return null; // Hide zero balances except USDT
                const name = asset === 'usdt_sol' ? 'Tether (Solana)' : ASSET_NAMES[asset as keyof typeof ASSET_NAMES];
                const symbol = asset === 'usdt_sol' ? 'USDT' : asset.toUpperCase();
                return <BalanceRow key={asset} asset={symbol} name={name} balance={balance} />;
              })}
          </div>
        )}

        {activeTab === 'positions' && (
            futuresPositions.length > 0 
                ? <div className="space-y-2">{futuresPositions.map(p => <PositionCard key={p.id} position={p} />)}</div>
                : <p className="text-center text-sm text-brand-secondary pt-10">No open positions.</p>
        )}

        {(activeTab === 'open' || activeTab === 'history') && (
            (activeTab === 'open' && openOrders.length === 0) || (activeTab === 'history' && orderHistory.length === 0)
            ? <p className="text-center text-sm text-brand-secondary pt-10">No {activeTab === 'open' ? 'open orders' : 'order history'}.</p>
            : (
              <table className="w-full text-xs font-mono text-left">
                  <thead className="sticky top-0 bg-brand-surface z-10">
                      <tr className="border-b border-brand-border">
                          <th className="p-2 font-semibold text-brand-secondary">Pair</th>
                          <th className="p-2 font-semibold text-brand-secondary">Side</th>
                          <th className="p-2 font-semibold text-brand-secondary">Price</th>
                          <th className="p-2 font-semibold text-brand-secondary">Amount</th>
                          <th className="p-2 font-semibold text-brand-secondary">{activeTab === 'open' ? 'Status' : 'Status'}</th>
                          <th className="p-2 font-semibold text-brand-secondary text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      {activeTab === 'open' && openOrders.map(o => <OrderRow key={o.id} order={o} />)}
                      {activeTab === 'history' && orderHistory.map(o => <OrderRow key={o.id} order={o} isHistory={true} />)}
                  </tbody>
              </table>
            )
        )}
      </div>
    </div>
  );
};

export default PositionsAndOrders;