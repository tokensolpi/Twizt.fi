import React, { useState } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';
import { Order, OrderStatus, OrderType, FuturesPosition } from '../types';
import { WalletIcon } from './icons/WalletIcon';

const PositionsAndOrders: React.FC = () => {
  const { balances, openOrders, orderHistory, futuresPositions, cancelOrder, closeFuturesPosition } = useTradeHistory();
  const [activeTab, setActiveTab] = useState<'wallet' | 'positions' | 'open' | 'history'>('wallet');

  const TabButton: React.FC<{ tab: 'wallet' | 'positions' | 'open' | 'history'; label: string; count?: number }> = ({ tab, label, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
        activeTab === tab 
          ? 'bg-brand-primary text-white' 
          : 'bg-brand-bg hover:bg-brand-border text-brand-secondary'
      }`}
    >
      {label} {count !== undefined && <span className="text-xs opacity-70">({count})</span>}
    </button>
  );

  const OrderRow: React.FC<{ order: Order, isHistory?: boolean }> = ({ order, isHistory = false }) => (
    <div className="grid grid-cols-5 gap-2 text-xs font-mono p-2 border-b border-brand-border last:border-b-0">
      <span className={order.type === OrderType.BUY ? 'text-green-400' : 'text-red-400'}>{order.type}</span>
      <span className="text-white">{order.price.toFixed(2)}</span>
      <span className="text-white">{order.amount.toFixed(4)}</span>
      <span className={`text-brand-secondary ${order.status === OrderStatus.LIQUIDATED ? 'text-red-500 font-semibold' : ''}`}>
        {isHistory ? order.status : order.createdAt}
      </span>
      <div className="text-right">
        {!isHistory && order.status === OrderStatus.OPEN && (
          <button onClick={() => cancelOrder(order.id)} className="text-brand-red hover:underline text-xs">Cancel</button>
        )}
      </div>
    </div>
  );

  const PositionRow: React.FC<{ position: FuturesPosition }> = ({ position }) => {
    const isProfit = position.unrealizedPnl >= 0;
    return (
      <div className="p-3 border-b border-brand-border last:border-b-0 text-xs font-mono">
        {/* Top Section: Symbol, PnL */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-brand-secondary">BTC/USDT</span>
            <p className={`font-semibold text-base ${position.side === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
              {position.side} {position.leverage}x
            </p>
          </div>
          <div className="text-right">
             <span className="text-brand-secondary">Unrealized PNL</span>
             <p className={`text-base font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                {isProfit ? '+' : ''}{position.unrealizedPnl.toFixed(2)} USDT
             </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-2">
          <div>
            <span className="text-brand-secondary">Size</span>
            <p className="text-white">{position.size.toFixed(4)} BTC</p>
          </div>
          <div>
            <span className="text-brand-secondary">Margin</span>
            <p className="text-white">{position.margin.toFixed(2)} USDT</p>
          </div>
          <div>
            <span className="text-brand-secondary">Entry Price</span>
            <p className="text-white">{position.entryPrice.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-brand-secondary">Liq. Price</span>
            <p className="text-yellow-500 font-semibold">{position.liquidationPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mt-3">
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
  
  const BalanceRow: React.FC<{ asset: string; chain?: string; balance: number; }> = ({ asset, chain, balance }) => (
    <div className="flex justify-between items-center text-sm p-3 border-b border-brand-border last:border-b-0">
        <div>
            <p className="font-mono text-white">{asset}</p>
            {chain && <p className="text-xs text-brand-secondary">{chain}</p>}
        </div>
        <p className="font-mono text-white">{balance.toLocaleString('en-US', { minimumFractionDigits: 4 })}</p>
    </div>
    );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <TabButton tab="wallet" label="Wallet" />
        <TabButton tab="positions" label="Positions" count={futuresPositions.length} />
        <TabButton tab="open" label="Open Orders" count={openOrders.length} />
        <TabButton tab="history" label="Order History" count={orderHistory.length} />
      </div>
      
      {activeTab === 'wallet' && (
         <div className="h-48 overflow-y-auto">
            <BalanceRow asset="USDT" chain="Ethereum (Default)" balance={balances.usdt} />
            <BalanceRow asset="BTC" chain="Bitcoin" balance={balances.btc} />
            <BalanceRow asset="USDT" chain="Solana" balance={balances.usdt_sol} />
            <BalanceRow asset="GDP" chain="Gemini DEX LP" balance={balances.gdp} />
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="h-48 overflow-y-auto">
            {futuresPositions.length > 0 
                ? futuresPositions.map(p => <PositionRow key={p.id} position={p} />)
                : <p className="text-center text-sm text-brand-secondary p-4">No open positions.</p>
            }
        </div>
      )}

      {(activeTab === 'open' || activeTab === 'history') && (
        <div className="h-48 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2 text-xs text-brand-secondary p-2 bg-brand-bg rounded-t-md sticky top-0">
                <span>Side</span>
                <span>Price</span>
                <span>Amount</span>
                <span>{activeTab === 'open' ? 'Time' : 'Status'}</span>
                <span className="text-right">Action</span>
            </div>
            {activeTab === 'open' && (
                openOrders.length > 0 
                ? openOrders.map(o => <OrderRow key={o.id} order={o} />)
                : <p className="text-center text-sm text-brand-secondary p-4">No open orders.</p>
            )}
            {activeTab === 'history' && (
                orderHistory.length > 0
                ? orderHistory.map(o => <OrderRow key={o.id} order={o} isHistory={true} />)
                : <p className="text-center text-sm text-brand-secondary p-4">No order history.</p>
            )}
        </div>
      )}
    </div>
  );
};

export default PositionsAndOrders;