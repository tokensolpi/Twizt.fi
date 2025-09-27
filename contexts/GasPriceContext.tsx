import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getGasFees } from '../services/gasService';
import { GasPrices } from '../types';

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
        const fees = await getGasFees();
        setGasPrices(fees);
      } catch (e) {
        setError('Failed to load gas fees.');
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
