

export const TRADING_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LINK/USDT'];
export const TIME_FRAMES = ['1H', '4H', '1D', '1W'];

// Chainlink Data Feed Contract Addresses on Ethereum Sepolia Testnet
// Note: We use USD feeds and treat them as equivalent to USDT for this app's purpose.
// Storing addresses in lowercase and letting ethers.js handle checksumming avoids validation errors.
export const CHAINLINK_CONTRACTS: { [key: string]: string } = {
    'BTC/USDT': '0x1b44f3514812d835eb1bdb0acb33d3fa3355eeaa', // BTC/USD
    'ETH/USDT': '0x694aa1769357215de4fac081bf1f309aadc32530', // ETH/USD - Corrected Address
    'SOL/USDT': '0x4187005c34a85a2a479075254149861483863495', // SOL/USD
    'LINK/USDT': '0xca10dd58253542918fb3283151bb1e259b669145', // LINK/USD - Corrected Sepolia Address
};


// --- Arbitrum Sepolia Configuration ---
export const ARBITRUM_CHAIN_ID = '421614';
export const ARBITRUM_RPC_URL = 'https://arbitrum-sepolia.publicnode.com';
export const ARBITRUM_BLOCK_EXPLORER = 'https://sepolia.arbiscan.io';
export const DEX_CONTRACT_ADDRESS = '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';


// --- Ethereum Sepolia Configuration ---
export const ETHEREUM_L1_RPC_URL = 'https://rpc.sepolia.org';

// --- Infura Gas API for Ethereum Mainnet (conditionally displayed) ---
export const ETHEREUM_MAINNET_CHAIN_ID = '1';


export const TOKEN_CONTRACTS_ARBITRUM: { [key: string]: { address: string; decimals: number } } = {
    'btc': { address: '0x6DE2b75A413554033108E505739c049053C203d9', decimals: 8 }, // Testnet WBTC
    'usdt': { address: '0x75faf114e598C2A543F548F33f6e77295A737443', decimals: 6 }, // Testnet USDC (as USDT)
    'link': { address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', decimals: 18 }, // Testnet LINK
    // ETH is native, so it doesn't have a contract address for balance checks
};

export const MINIMAL_ERC20_ABI = [
  // A minimal ABI for ERC20 functions
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
        { "name": "_spender", "type": "address" },
        { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "success", "type": "bool" }],
    "type": "function"
  },
  {
      "constant": true,
      "inputs": [
          { "name": "_owner", "type": "address" },
          { "name": "_spender", "type": "address" }
      ],
      "name": "allowance",
      "outputs": [{ "name": "remaining", "type": "uint256" }],
      "type": "function"
  }
];