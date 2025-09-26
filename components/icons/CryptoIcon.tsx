import React from 'react';

interface CryptoIconProps {
  asset: string;
}

// A simple component to return different SVG icons based on the asset string
export const CryptoIcon: React.FC<CryptoIconProps> = ({ asset }) => {
  const size = "24";
  const iconProps = { width: size, height: size, viewBox: '0 0 24 24' };

  switch (asset.toLowerCase()) {
    case 'btc':
      return (
        <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h5m-3 4V8m2 0h-2" />
          <path d="M14 12h-1" />
        </svg>
      );
    case 'eth':
      return (
        <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="M12 2l7 10-7 10-7-10z" />
          <path d="M12 22V12" />
          <path d="M5 12l7 10 7-10" />
          <path d="M19 12H5" />
        </svg>
      );
    case 'usdt':
      return (
        <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M8 10h8M8 14h8" />
        </svg>
      );
    case 'sol':
      return (
        <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
          <path d="M4 18h16M4 12h16M4 6h16" />
        </svg>
      );
    case 'bnb':
        return (
            <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                <path d="M12 2l-6 6 6 6 6-6-6-6z" />
                <path d="M6 12l6 6 6-6" />
            </svg>
        );
    case 'doge':
        return (
            <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                 <circle cx="12" cy="12" r="10" />
                 <path d="M10 12h4m-2 4v-8" />
            </svg>
        );
    case 'gdp':
    default:
      return (
        <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
  }
};