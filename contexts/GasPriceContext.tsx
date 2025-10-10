import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { GasPrices, GasFeeSuggestion } from '../types';
import { ETHEREUM_L1_RPC_URL } from '../constants';

interface GasPriceContextValue {
  gasPrices: GasPrices | null;
  isLoading: boolean;
  error: string | null;
}

const GasPriceContext = createContext<GasPriceContextValue | undefined>(undefined);

export const useGasPrice = () => {
  const context = useContext(GasPriceContext);
  if (!context) {
    throw new Error('useGasPrice must be used within a GasPriceProvider');
  }
  return context;
};

export const GasPriceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gasPrices, setGasPrices] = useState<GasPrices | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndSetGasPrices = async () => {
      try {
        setError(null);
        const l1Provider = new ethers.JsonRpcProvider(ETHEREUM_L1_RPC_URL);
        const feeData = await l1Provider.getFeeData();
        
        if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
            throw new Error("EIP-1559 gas data not available.");
        }

        const formatGwei = (value: bigint) => ethers.formatUnits(value, 'gwei');

        const medium: GasFeeSuggestion = {
            suggestedMaxFeePerGas: formatGwei(feeData.maxFeePerGas),
            suggestedMaxPriorityFeePerGas: formatGwei(feeData.maxPriorityFeePerGas),
        };
        
        // Create synthetic low/high values
        const low: GasFeeSuggestion = {
            suggestedMaxFeePerGas: formatGwei(feeData.maxFeePerGas * 80n / 100n), // 80%
            suggestedMaxPriorityFeePerGas: formatGwei(feeData.maxPriorityFeePerGas * 80n / 100n),
        };

        const high: GasFeeSuggestion = {
            suggestedMaxFeePerGas: formatGwei(feeData.maxFeePerGas * 120n / 100n), // 120%
            suggestedMaxPriorityFeePerGas: formatGwei(feeData.maxPriorityFeePerGas * 120n / 100n),
        };

        setGasPrices({ low, medium, high });

      } catch (e) {
        setError('Failed to load L1 gas fees.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndSetGasPrices(); // Initial fetch
    const intervalId = setInterval(fetchAndSetGasPrices, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const value = { gasPrices, isLoading, error };

  return (
    <GasPriceContext.Provider value={value}>
      {children}
    </GasPriceContext.Provider>
  );
};