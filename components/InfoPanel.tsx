import React, { useState } from 'react';
import AIAnalysis from './AIAnalysis';
import PositionsAndOrders from './PositionsAndOrders';
import WormholeBridge from './WormholeBridge';
import LiquidityPool from './LiquidityPool';
import { BrainIcon } from './icons/BrainIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { BridgeIcon } from './icons/BridgeIcon';
import { LiquidityIcon } from './icons/LiquidityIcon';


type Tab = 'ai' | 'positions' | 'bridge' | 'liquidity';

const InfoPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const renderContent = () => {
    switch (activeTab) {
      case 'liquidity':
        return <LiquidityPool />;
      case 'positions':
        return <PositionsAndOrders />;
      case 'ai':
        return <AIAnalysis />;
      case 'bridge':
        return <WormholeBridge />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tab: Tab; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
        activeTab === tab
          ? 'text-brand-primary border-brand-primary'
          : 'text-brand-secondary border-transparent hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg">
      <div className="flex border-b border-brand-border">
        <TabButton tab="positions" label="Positions & Orders" icon={<HistoryIcon />} />
        <TabButton tab="liquidity" label="Liquidity" icon={<LiquidityIcon />} />
        <TabButton tab="bridge" label="Bridge" icon={<BridgeIcon />} />
        <TabButton tab="ai" label="AI Analysis" icon={<BrainIcon />} />
      </div>
      <div className="p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default InfoPanel;