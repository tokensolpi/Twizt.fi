import React, { useState } from 'react';
import { LogoIcon } from './icons/LogoIcon';

const Header: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const handleConnectWallet = () => {
    // Simulate a wallet connection with a placeholder message
    alert('Wallet connected successfully! (Simulation)');
    setIsWalletConnected(true);
  };

  return (
    <header className="bg-brand-surface border-b border-brand-border p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <LogoIcon />
          <h1 className="text-white text-xl font-bold">Gemini DEX</h1>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#" className="text-white hover:text-brand-primary transition-colors">Trade</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Futures</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Portfolio</a>
          <a href="https://solana.com/developers/cookbook" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">Docs</a>
        </nav>
        <button
          onClick={handleConnectWallet}
          disabled={isWalletConnected}
          className={`text-white text-sm font-semibold px-4 py-2 rounded-md transition-all ${
            isWalletConnected
              ? 'bg-brand-green cursor-default'
              : 'bg-brand-primary hover:bg-opacity-90'
          }`}
        >
          {isWalletConnected ? 'Wallet Connected' : 'Connect Wallet'}
        </button>
      </div>
    </header>
  );
};

export default Header;