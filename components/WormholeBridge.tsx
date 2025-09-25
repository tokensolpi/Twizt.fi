import React, { useState, useMemo } from 'react';
import { useTradeHistory } from '../contexts/TradeHistoryContext';

const WormholeBridge: React.FC = () => {
    const { availableBalances, bridgeAssets } = useTradeHistory();
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const bridgeFee = 5; // Simulated fee in USDT

    const { amountNum, receiveAmount } = useMemo(() => {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0) {
            return { amountNum: 0, receiveAmount: 0 };
        }
        return { amountNum: num, receiveAmount: Math.max(0, num - bridgeFee) };
    }, [amount]);

    const handleBridge = async () => {
        setError(null);
        setSuccessMessage(null);

        if (amountNum <= 0) {
            setError("Please enter a valid amount.");
            return;
        }
        if (amountNum > availableBalances.usdt) {
            setError("Insufficient USDT balance.");
            return;
        }

        setIsLoading(true);
        try {
            await bridgeAssets(amountNum);
            setSuccessMessage(`Bridge successful! ${receiveAmount.toFixed(2)} USDT received on Solana.`);
            setAmount('');
        } catch (e) {
            setError("Something went wrong during the bridge. Please try again.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-white font-semibold text-base">Wormhole Bridge</h3>
            <p className="text-sm text-brand-secondary">
                Transfer assets across different blockchains.
            </p>

            {/* From Network */}
            <div className="p-3 bg-brand-bg border border-brand-border rounded-lg">
                <label className="text-xs text-brand-secondary mb-1 block">From</label>
                <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">Ethereum</span>
                    <div className="text-right">
                         <input
                            type="number"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                            placeholder="0.0"
                            className="bg-transparent text-white text-lg font-mono text-right w-full outline-none"
                            disabled={isLoading}
                        />
                        <span className="text-xs text-brand-secondary">Asset: USDT</span>
                    </div>
                </div>
            </div>

            {/* To Network */}
             <div className="p-3 bg-brand-bg border border-brand-border rounded-lg">
                <label className="text-xs text-brand-secondary mb-1 block">To</label>
                <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">Solana</span>
                     <div className="text-right">
                        <p className="text-white text-lg font-mono">{receiveAmount.toFixed(2)}</p>
                        <span className="text-xs text-brand-secondary">Asset: USDT</span>
                    </div>
                </div>
            </div>
            
            {/* Info and Action */}
             <div className="border-t border-brand-border pt-4 space-y-3 text-xs">
                <div className="flex justify-between text-brand-secondary">
                    <span>Available Balance</span>
                    <span className="font-mono text-white">{availableBalances.usdt.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-brand-secondary">
                    <span>Bridge Fee (est.)</span>
                    <span className="font-mono text-white">{bridgeFee.toFixed(2)} USDT</span>
                </div>
            </div>

            <div className="mt-4">
                {error && <p className="text-brand-red text-xs text-center mb-2">{error}</p>}
                {successMessage && <p className="text-brand-green text-xs text-center mb-2">{successMessage}</p>}
                <button
                    onClick={handleBridge}
                    disabled={isLoading || amountNum <= 0}
                    className="w-full py-2.5 rounded-md font-semibold text-white bg-brand-primary hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Bridging...' : 'Bridge Assets'}
                </button>
            </div>
        </div>
    );
};

export default WormholeBridge;
