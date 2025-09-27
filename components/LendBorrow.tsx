
import React, { useState, useMemo } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';
import type { Balances, LendingMarketAsset } from '../types';

type Action = 'supply' | 'withdraw' | 'borrow' | 'repay';

const LendBorrow: React.FC = () => {
    const { 
        lendingMarket, 
        availableBalances,
        suppliedAssets,
        borrowedAssets,
        supplyAsset,
        withdrawAsset,
        borrowAsset,
        repayAsset
    } = useTradeHistory();
    
    const [activeTab, setActiveTab] = useState<'supply' | 'borrow'>('supply');
    const [selectedAsset, setSelectedAsset] = useState<LendingMarketAsset | null>(null);
    const [action, setAction] = useState<Action | null>(null);
    const [amount, setAmount] = useState('');

    const { totalSuppliedValue, totalBorrowedValue, healthFactor, weightedCollateralValue } = useMemo(() => {
        const suppliedValue = Object.entries(suppliedAssets).reduce((sum, [asset, amount]) => {
            const market = lendingMarket.find(m => m.asset === asset);
            // Fix: Explicitly cast `amount` to a number to resolve TS inference issue.
            const numericAmount = Number(amount) || 0;
            const price = market?.price || 0;
            return sum + (numericAmount * price);
        }, 0);

        const borrowedValue = Object.entries(borrowedAssets).reduce((sum, [asset, amount]) => {
            const market = lendingMarket.find(m => m.asset === asset);
            // Fix: Explicitly cast `amount` to a number to resolve TS inference issue.
            const numericAmount = Number(amount) || 0;
            const price = market?.price || 0;
            return sum + (numericAmount * price);
        }, 0);

        const weightedCollateral = Object.entries(suppliedAssets).reduce((sum, [asset, amount]) => {
            const market = lendingMarket.find(m => m.asset === asset);
            // Fix: Explicitly cast `amount` to a number to resolve TS inference issue.
            const numericAmount = Number(amount) || 0;
            const price = market?.price || 0;
            const collateralFactor = market?.collateralFactor || 0;
            return sum + (numericAmount * price * collateralFactor);
        }, 0);
        
        const hf = borrowedValue > 0 ? weightedCollateral / borrowedValue : Infinity;

        return { totalSuppliedValue: suppliedValue, totalBorrowedValue: borrowedValue, healthFactor: hf, weightedCollateralValue: weightedCollateral };
    }, [suppliedAssets, borrowedAssets, lendingMarket]);
    
    const getHealthInfo = (hf: number): { text: string; color: string; percentage: number } => {
        if (hf > 2) return { text: 'Safe', color: 'bg-brand-green', percentage: Math.min(100, (hf / 3) * 100) };
        if (hf > 1.25) return { text: 'Warning', color: 'bg-yellow-500', percentage: Math.min(100, (hf / 3) * 100) };
        if (hf > 0) return { text: 'Danger', color: 'bg-brand-red', percentage: Math.min(100, (hf / 3) * 100) };
        return { text: 'N/A', color: 'bg-brand-secondary', percentage: 100 };
    };

    const healthInfo = getHealthInfo(healthFactor);

    const handleAction = () => {
        const amountNum = parseFloat(amount);
        if (!selectedAsset || !action || isNaN(amountNum) || amountNum <= 0) return;

        switch (action) {
            case 'supply': supplyAsset(selectedAsset.asset, amountNum); break;
            case 'withdraw': withdrawAsset(selectedAsset.asset, amountNum); break;
            case 'borrow': borrowAsset(selectedAsset.asset, amountNum); break;
            case 'repay': repayAsset(selectedAsset.asset, amountNum); break;
        }
        setAmount('');
        setAction(null);
        setSelectedAsset(null);
    };

    const renderMarketTable = (isSupply: boolean) => (
        <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs text-brand-secondary p-2">
                <span>Asset</span>
                <span className="text-center">APY</span>
                <span className="text-right">Your {isSupply ? 'Supply' : 'Borrow'}</span>
                <span></span>
            </div>
            {lendingMarket.map(asset => {
                const userAmount = isSupply ? (suppliedAssets[asset.asset] || 0) : (borrowedAssets[asset.asset] || 0);
                return (
                    <div key={asset.asset} className="grid grid-cols-4 gap-2 items-center text-sm p-2 bg-brand-bg rounded-md">
                        <span className="font-semibold text-white">{asset.name}</span>
                        <span className={`text-center font-mono ${isSupply ? 'text-green-400' : 'text-red-400'}`}>
                            {(isSupply ? asset.supplyApy : asset.borrowApy).toFixed(2)}%
                        </span>
                        <span className="text-right font-mono text-white">{userAmount.toFixed(4)}</span>
                        <div className="flex justify-end gap-1">
                            <button onClick={() => { setSelectedAsset(asset); setAction(isSupply ? 'supply' : 'borrow')}} className="px-2 py-0.5 text-xs bg-brand-primary/20 text-brand-primary rounded-md">+</button>
                            {userAmount > 0 && <button onClick={() => { setSelectedAsset(asset); setAction(isSupply ? 'withdraw' : 'repay')}} className="px-2 py-0.5 text-xs bg-brand-secondary/20 text-brand-secondary rounded-md">-</button>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
    
    if (selectedAsset && action) {
        const borrowLimitUsd = weightedCollateralValue - totalBorrowedValue;
        const maxAmount = action === 'supply' ? (availableBalances[selectedAsset.asset] || 0)
                        : action === 'withdraw' ? (suppliedAssets[selectedAsset.asset] || 0)
                        : action === 'repay' ? Math.min((availableBalances[selectedAsset.asset] || 0), (borrowedAssets[selectedAsset.asset] || 0))
                        : (selectedAsset.price > 0 ? Math.max(0, borrowLimitUsd / selectedAsset.price) : 0);
        
        return (
            <div className="space-y-4 animate-fade-in">
                <h3 className="text-white font-semibold text-base capitalize">{action} {selectedAsset.name}</h3>
                <div>
                    <label className="text-xs text-brand-secondary mb-1 block">Amount</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white font-mono" />
                    <button onClick={() => setAmount(maxAmount > 0 ? String(maxAmount) : '0')} className="text-xs text-brand-primary mt-1">Max: {maxAmount > 0 ? maxAmount.toFixed(4) : 0}</button>
                </div>
                 <div className="flex gap-2">
                    <button onClick={handleAction} className="w-full py-2 bg-brand-primary text-white rounded text-sm font-semibold">Confirm</button>
                    <button onClick={() => { setSelectedAsset(null); setAction(null); }} className="w-full py-2 bg-brand-border text-brand-secondary rounded text-sm">Cancel</button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="p-3 bg-brand-bg rounded-lg border border-brand-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-brand-secondary">Total Supply</span>
                    <span className="text-white font-mono">${totalSuppliedValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-brand-secondary">Total Borrow</span>
                    <span className="text-white font-mono">${totalBorrowedValue.toFixed(2)}</span>
                </div>
                <div className="mt-2">
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-brand-secondary">Health Factor</span>
                        <span className={`font-mono font-semibold ${healthInfo.color.replace('bg-','text-')}`}>
                            {isFinite(healthFactor) ? healthFactor.toFixed(2) : '∞'} ({healthInfo.text})
                        </span>
                    </div>
                    <div className="w-full bg-brand-border rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-300 ${healthInfo.color}`} style={{ width: `${healthInfo.percentage}%` }}></div>
                    </div>
                    <p className="text-[10px] text-brand-secondary mt-1">A Health Factor below 1.0 puts your collateral at risk of liquidation.</p>
                </div>
            </div>

            <div className="flex justify-center border-b border-brand-border">
                <button onClick={() => setActiveTab('supply')} className={`w-1/2 py-2 text-sm font-semibold transition-colors ${activeTab === 'supply' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-white'}`}>Supply Markets</button>
                <button onClick={() => setActiveTab('borrow')} className={`w-1/2 py-2 text-sm font-semibold transition-colors ${activeTab === 'borrow' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-white'}`}>Borrow Markets</button>
            </div>
            {activeTab === 'supply' ? renderMarketTable(true) : renderMarketTable(false)}
        </div>
    );
};

export default LendBorrow;