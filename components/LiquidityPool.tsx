import React, { useState, useMemo } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';

type PoolAction = 'deposit' | 'withdraw';
type Asset = 'usdt' | 'usdt_sol';

const LiquidityPool: React.FC = () => {
    const { balances, liquidityPool, addLiquidity, removeLiquidity } = useTradeHistory();
    const [action, setAction] = useState<PoolAction>('deposit');
    const [amount, setAmount] = useState('');
    const [asset, setAsset] = useState<Asset>('usdt');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const totalPoolValue = useMemo(() => liquidityPool.usdt + liquidityPool.usdt_sol, [liquidityPool]);
    const userPoolShare = useMemo(() => {
        if (liquidityPool.totalLpTokens === 0 || balances.gdp === 0) return 0;
        return (balances.gdp / liquidityPool.totalLpTokens) * 100;
    }, [balances.gdp, liquidityPool.totalLpTokens]);

    const handleAction = () => {
        setError(null);
        setSuccess(null);
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError("Please enter a valid amount.");
            return;
        }

        try {
            if (action === 'deposit') {
                const balance = asset === 'usdt' ? balances.usdt : balances.usdt_sol;
                if (amountNum > balance) {
                    setError(`Insufficient ${asset.toUpperCase()} balance.`);
                    return;
                }
                addLiquidity(amountNum, asset);
                setSuccess('Successfully deposited liquidity!');
            } else { // Withdraw
                if (amountNum > balances.gdp) {
                    setError('Insufficient GDP balance.');
                    return;
                }
                removeLiquidity(amountNum, asset);
                 setSuccess('Successfully withdrew liquidity!');
            }
            setAmount('');
        } catch(e: any) {
            setError(e.message || "An error occurred.");
        }
    };

    const lpTokenPrice = totalPoolValue > 0 ? totalPoolValue / liquidityPool.totalLpTokens : 1;
    const amountNum = parseFloat(amount) || 0;
    
    const estimatedResult = action === 'deposit' 
        ? (amountNum / lpTokenPrice).toFixed(4) + ' GDP'
        : (amountNum * lpTokenPrice).toFixed(2) + ' ' + asset.toUpperCase().replace('_SOL', ' (SOL)');

    return (
        <div className="space-y-4">
            <h3 className="text-white font-semibold text-base">Cross-Chain Liquidity Pool</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs p-2 bg-brand-bg rounded-md">
                <div>
                    <span className="text-brand-secondary block">Pool TVL</span>
                    <span className="text-white font-mono">${totalPoolValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                 <div>
                    <span className="text-brand-secondary block">USDT</span>
                    <span className="text-white font-mono">{liquidityPool.usdt.toLocaleString()}</span>
                </div>
                 <div>
                    <span className="text-brand-secondary block">USDT (SOL)</span>
                    <span className="text-white font-mono">{liquidityPool.usdt_sol.toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-brand-secondary block">Your Share</span>
                    <span className="text-white font-mono">{userPoolShare.toFixed(4)}%</span>
                </div>
            </div>

             <div className="flex justify-center border-b border-brand-border">
                <button onClick={() => setAction('deposit')} className={`w-1/2 py-2 text-sm font-semibold transition-colors ${action === 'deposit' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-white'}`}>Deposit</button>
                <button onClick={() => setAction('withdraw')} className={`w-1/2 py-2 text-sm font-semibold transition-colors ${action === 'withdraw' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-white'}`}>Withdraw</button>
            </div>

            <div className="space-y-3">
                 <div>
                    <label className="text-xs text-brand-secondary mb-1 block">
                        {action === 'deposit' ? 'Asset to Deposit' : 'Asset to Receive'}
                    </label>
                    <select value={asset} onChange={e => setAsset(e.target.value as Asset)} className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                        <option value="usdt">USDT (Ethereum)</option>
                        <option value="usdt_sol">USDT (Solana)</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-brand-secondary mb-1 block">Amount</label>
                    <input type="number" value={amount} onChange={e => {setAmount(e.target.value); setError(null); setSuccess(null);}} placeholder="0.0" className="w-full bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-white placeholder-brand-secondary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono" />
                </div>
            </div>

            <div className="border-t border-brand-border pt-3 space-y-2 text-xs">
                 <div className="flex justify-between text-brand-secondary">
                    <span>Available Balance</span>
                    <span className="font-mono text-white">
                        {action === 'deposit' 
                            ? `${(asset === 'usdt' ? balances.usdt : balances.usdt_sol).toFixed(2)} ${asset.toUpperCase().replace('_SOL', ' (SOL)')}`
                            : `${balances.gdp.toFixed(4)} GDP`
                        }
                    </span>
                </div>
                <div className="flex justify-between text-brand-secondary">
                    <span>You will {action === 'deposit' ? 'receive (est.)' : 'receive (est.)'}</span>
                    <span className="font-mono text-white">{amountNum > 0 ? estimatedResult : '0.00'}</span>
                </div>
            </div>

            <div className="mt-2">
                {error && <p className="text-brand-red text-xs text-center mb-2">{error}</p>}
                {success && <p className="text-brand-green text-xs text-center mb-2">{success}</p>}
                <button onClick={handleAction} disabled={!amountNum} className="w-full py-2.5 rounded-md font-semibold text-white bg-brand-primary hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                    {action === 'deposit' ? 'Provide Liquidity' : 'Withdraw Liquidity'}
                </button>
            </div>
        </div>
    );
};

export default LiquidityPool;
