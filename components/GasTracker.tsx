import React from 'react';
import { useGasPrice } from '../contexts/GasPriceContext';
import { GasIcon } from './icons/GasIcon';

const GasTracker: React.FC = () => {
  const { gasPrices, isLoading, error } = useGasPrice();

  const renderFee = (fee: string | undefined, label: string) => {
    const value = fee ? parseFloat(fee).toFixed(1) : '-';
    return (
      <div className="text-center">
        <p className="text-xs text-brand-secondary">{label}</p>
        <p className="text-white font-mono text-sm">{value}</p>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 bg-brand-bg px-3 py-1.5 rounded-md border border-brand-border/50">
      <GasIcon className="h-5 w-5 text-brand-secondary" />
      <div className="flex items-center gap-3">
        {isLoading ? (
          <p className="text-xs text-brand-secondary animate-pulse">Loading L1 Gas...</p>
        ) : error || !gasPrices ? (
          <p className="text-xs text-brand-red">{error || 'Error'}</p>
        ) : (
          <>
            {renderFee(gasPrices.low.suggestedMaxFeePerGas, 'Low')}
            {renderFee(gasPrices.medium.suggestedMaxFeePerGas, 'Med')}
            {renderFee(gasPrices.high.suggestedMaxFeePerGas, 'High')}
             <div className="pl-2 border-l border-brand-border">
                <p className="text-xs text-brand-secondary">Gwei</p>
                <p className="text-white font-mono text-sm">ETH L1</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GasTracker;
