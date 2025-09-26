import React, { useState } from 'react';
import AIAnalysis from './AIAnalysis';
import PositionsAndOrders from './PositionsAndOrders';
import WormholeBridge from './WormholeBridge';
import Pools from './LiquidityPool';
import MarketMakerBots from './MarketMakerBots';
import LendBorrow from './LendBorrow';
import Earn from './Earn';
import { BrainIcon } from './icons/BrainIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { BridgeIcon } from './icons/BridgeIcon';
import { LiquidityIcon } from './icons/LiquidityIcon';
import { BotIcon } from './icons/BotIcon';
import { LendIcon } from './icons/LendIcon';
import { EarnIcon } from './icons/EarnIcon';


type Tab = 'ai' | 'positions' | 'bridge' | 'pools' | 'bots' | 'lend' | 'earn';

const InfoPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('positions');

  const renderContent = () => {
    switch (activeTab) {
      case 'positions':
        return <PositionsAndOrders />;
      case 'lend':
        return <LendBorrow />;
      case 'earn':
        return <Earn />;
      case 'pools':
        return <Pools />;
      case 'bots':
        return <MarketMakerBots />;
      case 'bridge':
        return <WormholeBridge />;
      case 'ai':
        return <AIAnalysis />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tab: Tab; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
        activeTab === tab
          ? 'text-brand-primary border-brand-primary bg-brand-bg'
          : 'text-brand-secondary border-transparent hover:text-white hover:bg-brand-border/20'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg">
      <div className="flex border-b border-brand-border flex-wrap">
        <TabButton tab="positions" label="Positions" icon={<HistoryIcon />} />
        <TabButton tab="lend" label="Lend & Borrow" icon={<LendIcon />} />
        <TabButton tab="earn" label="Earn" icon={<EarnIcon />} />
        <TabButton tab="pools" label="Pools" icon={<LiquidityIcon />} />
        <TabButton tab="bots" label="MM Bots" icon={<BotIcon />} />
        <TabButton tab="bridge" label="Bridge" icon={<BridgeIcon />} />
        <TabButton tab="ai" label="AI Analysis" icon={<BrainIcon />} />
      </div>
      <div className="p-4 min-h-[300px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default InfoPanel;