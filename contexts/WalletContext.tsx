
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers } from 'ethers';
import { ARBITRUM_CHAIN_ID, ARBITRUM_RPC_URL, ETHEREUM_L1_RPC_URL, ARBITRUM_BLOCK_EXPLORER } from '../constants';

// Fix: Add type definition for window.ethereum to satisfy TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletContextValue {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  isConnected: boolean;
  l1Balance: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  wrongNetwork: boolean;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [wrongNetwork, setWrongNetwork] = useState<boolean>(false);
  const [l1Balance, setL1Balance] = useState<string | null>(null);

  const isConnected = !!address;

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAddress(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Reload the page to reset the state and avoid potential issues
    window.location.reload();
  };

  const setupProviderAndSigner = async () => {
    if (window.ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const network = await browserProvider.getNetwork();

        if (network.chainId !== BigInt(ARBITRUM_CHAIN_ID)) {
          setWrongNetwork(true);
          setProvider(null);
          setSigner(null);
          setAddress(null);
          return;
        }
        setWrongNetwork(false);

        const accounts = await browserProvider.listAccounts();
        if (accounts.length > 0) {
          const jsonRpcSigner = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(jsonRpcSigner);
          setAddress(accounts[0].address);
        }
      } catch (e) {
        console.error("Could not set up provider and signer", e);
      }
    }
  };

  const switchToArbitrumSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(ARBITRUM_CHAIN_ID, 10).toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${parseInt(ARBITRUM_CHAIN_ID, 10).toString(16)}`,
                chainName: 'Arbitrum Sepolia',
                rpcUrls: [ARBITRUM_RPC_URL],
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: [ARBITRUM_BLOCK_EXPLORER],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Arbitrum Sepolia network", addError);
        }
      } else {
        console.error("Failed to switch to Arbitrum Sepolia network", switchError);
      }
    }
  };

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await browserProvider.getNetwork();

      if (network.chainId !== BigInt(ARBITRUM_CHAIN_ID)) {
        await switchToArbitrumSepolia();
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      handleAccountsChanged(accounts);
      await setupProviderAndSigner();
      
    } catch (error) {
      console.error("Failed to connect wallet", error);
    }
  }, []);

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setWrongNetwork(false);
    setL1Balance(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      setupProviderAndSigner();

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Effect to fetch L1 balance whenever the address changes.
  useEffect(() => {
    const fetchL1Balance = async () => {
      if (address) {
        try {
          const l1Provider = new ethers.JsonRpcProvider(ETHEREUM_L1_RPC_URL);
          const balance = await l1Provider.getBalance(address);
          setL1Balance(ethers.formatEther(balance));
        } catch (error) {
          console.error("Failed to fetch L1 balance:", error);
          setL1Balance(null);
        }
      } else {
        setL1Balance(null);
      }
    };

    fetchL1Balance();
  }, [address]);

  return (
    <WalletContext.Provider value={{ provider, signer, address, isConnected, connectWallet, disconnectWallet, wrongNetwork, l1Balance }}>
      {children}
    </WalletContext.Provider>
  );
};
