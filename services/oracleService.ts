import { ethers } from 'ethers';
import { CHAINLINK_CONTRACTS } from '../constants';

// A public, read-only RPC URL for Ethereum Mainnet.
// Switched to LlamaRPC public endpoint for better stability with contract calls.
const RPC_URL = 'https://eth.llamarpc.com';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// The standard ABI for Chainlink's AggregatorV3Interface
const aggregatorV3InterfaceABI = [
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "description",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint80", "name": "_roundId", "type": "uint80" }],
    "name": "getRoundData",
    "outputs": [
      { "internalType": "uint80", "name": "roundId", "type": "uint80" },
      { "internalType": "int256", "name": "answer", "type": "int256" },
      { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
      { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      { "internalType": "uint80", "name": "roundId", "type": "uint80" },
      { "internalType": "int256", "name": "answer", "type": "int256" },
      { "internalType": "uint256", "name": "startedAt", "type": "uint256" },
      { "internalType": "uint256", "name": "updatedAt", "type": "uint256" },
      { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "version",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Fetches the latest price for a given trading pair from its Chainlink oracle.
 * @param pair The trading pair (e.g., "BTC/USDT").
 * @returns The current price as a number.
 */
export const getOraclePrice = async (pair: string): Promise<number> => {
    const address = CHAINLINK_CONTRACTS[pair];
    if (!address) {
        throw new Error(`Oracle address not found for pair: ${pair}`);
    }

    try {
        const priceFeed = new ethers.Contract(address, aggregatorV3InterfaceABI, provider);
        const [roundData, decimals] = await Promise.all([
            priceFeed.latestRoundData(),
            priceFeed.decimals()
        ]);

        const price = Number(roundData.answer) / (10 ** Number(decimals));
        return price;

    } catch (error) {
        console.error(`Failed to fetch price for ${pair} from oracle at ${address}`, error);
        throw new Error(`Could not retrieve oracle price for ${pair}.`);
    }
};