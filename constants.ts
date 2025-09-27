
export const TRADING_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
export const TIME_FRAMES = ['1H', '4H', '1D', '1W'];

// Chainlink Data Feed Contract Addresses on Ethereum Sepolia Testnet
// Note: We use USD feeds and treat them as equivalent to USDT for this app's purpose.
// Storing addresses in lowercase and letting ethers.js handle checksumming avoids validation errors.
export const CHAINLINK_CONTRACTS: { [key: string]: string } = {
    'BTC/USDT': '0x1b44f3514812d835eb1bdb0acb33d3fa3355eeaa', // BTC/USD
    'ETH/USDT': '0x694aa1769357215de4fac081bf1f309aadc325306', // ETH/USD
    'SOL/USDT': '0x4187005c34a85a2a479075254149861483863495', // SOL/USD
};


// --- Arbitrum Sepolia Configuration ---
export const ARBITRUM_CHAIN_ID = '421614';
export const ARBITRUM_RPC_URL = 'https://arbitrum-sepolia.infura.io/v3/8e8a5b2125df4d4f817059b4bca7f3c8';
export const ARBITRUM_BLOCK_EXPLORER = 'https://sepolia.arbiscan.io';

// --- Ethereum Sepolia Configuration ---
export const ETHEREUM_L1_RPC_URL = 'https://sepolia.infura.io/v3/8e8a5b2125df4d4f817059b4bca7f3c8';

// --- Infura Gas API for Ethereum Mainnet (conditionally displayed) ---
export const ETHEREUM_MAINNET_CHAIN_ID = '1';
export const INFURA_GAS_API_URL = 'https://gas.api.infura.io/v3/8e8a5b2125df4d4f817059b4bca7f3c8';


export const TOKEN_CONTRACTS_ARBITRUM: { [key: string]: { address: string; decimals: number } } = {
    'btc': { address: '0x6DE2b75A413554033108E505739c049053C203d9', decimals: 8 }, // Testnet WBTC
    'usdt': { address: '0x75faf114e598C2A543F548F33f6e77295A737443', decimals: 6 }, // Testnet USDC (as USDT)
    // ETH is native, so it doesn't have a contract address for balance checks
};

export const MINIMAL_ERC20_ABI = [
  // A minimal ABI for ERC20 balanceOf function
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  }
];
