import { INFURA_GAS_API_URL, ETHEREUM_MAINNET_CHAIN_ID } from '../constants';
import { GasPrices } from '../types';

export const getGasFees = async (): Promise<GasPrices> => {
    try {
        const response = await fetch(`${INFURA_GAS_API_URL}/networks/${ETHEREUM_MAINNET_CHAIN_ID}/suggestedGasFees`);
        if (!response.ok) {
            throw new Error(`Failed to fetch gas fees: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.low || !data.medium || !data.high) {
            throw new Error("Invalid gas fee data structure received");
        }
        return data as GasPrices;
    } catch (error) {
        console.error("Error fetching gas fees:", error);
        throw error;
    }
};
