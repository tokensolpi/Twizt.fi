import React, { useState } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';

const Earn: React.FC = () => {
    const { availableBalances, stakedGdp, gdpRewards, stakingApy, stakeGdp, unstakeGdp, claimGdpRewards } = useTradeHistory();
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'stake' | 'unstake'>('stake');
    const [error, setError] = useState('');

    const handleAction = () => {
        setError('');
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError("Please enter a valid amount.");
            return;
        }

        if (action === 'stake') {
            if (amountNum > availableBalances.gdp) {
                setError("Insufficient GDP balance to stake.");
                return;
            }
            stakeGdp(amountNum);
        } else {
            if (amountNum > stakedGdp) {
                setError("Amount exceeds staked balance.");
                return;
            }
            unstakeGdp(amountNum);
        }
        setAmount('');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-brand-text-primary font-semibold text-base">Earn Yield by Staking</h3>
            <p className="text-sm text-brand-secondary">
                Stake your GDP (Gemini DEX LP tokens) to earn a share of protocol fees.
            </p>

            <div className="p-4 bg-brand-bg rounded-lg border border-brand-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-xs text-brand-secondary">Staking APY</p>
                        <p className="text-lg font-semibold text-brand-primary">{stakingApy.toFixed(2)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-brand-secondary">Your Staked GDP</p>
                        <p className="text-lg font-mono text-brand-text-primary">{stakedGdp.toFixed(4)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-brand-secondary">Claimable Rewards</p>
                        <p className="text-lg font-mono text-brand-text-primary">{gdpRewards.toFixed(4)}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-center">
                        <button 
                            onClick={claimGdpRewards} 
                            disabled={gdpRewards <= 0}
                            className="w-full py-2 bg-brand-primary/20 text-brand-primary rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                                Claim
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-brand-bg rounded-lg border border-brand-border space-y-4">
                <div className="flex justify-center border-b border-brand-border">
                    <button onClick={() => setAction('stake')} className={`w-1/2 py-2 text-sm font-semibold transition-colors ${action === 'stake' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-brand-text-primary'}`}>Stake</button>
                    <button onClick={() => setAction('unstake')} className={`w-1/2 py-2 text-sm font-semibold transition-colors ${action === 'unstake' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-secondary hover:text-brand-text-primary'}`}>Unstake</button>
                </div>
                 <div>
                    <div className="flex justify-between items-center">
                        <label className="text-xs text-brand-secondary mb-1 block">Amount</label>
                        <span className="text-xs text-brand-secondary">
                            Available: {action === 'stake' ? availableBalances.gdp.toFixed(4) : stakedGdp.toFixed(4)} GDP
                        </span>
                    </div>
                    <input type="number" value={amount} onChange={(e) => {setAmount(e.target.value); setError('');}} placeholder="0.0" className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-brand-text-primary font-mono" />
                </div>
                 {error && <p className="text-brand-red text-xs text-center">{error}</p>}
                <button 
                    onClick={handleAction}
                    disabled={parseFloat(amount) <= 0 || isNaN(parseFloat(amount))}
                    className="w-full py-2.5 bg-brand-primary text-white rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed capitalize">
                    {action} GDP
                </button>
            </div>
        </div>
    );
};

export default Earn;
