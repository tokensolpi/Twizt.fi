

export const TRADING_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'DOGE/USDT'];
export const TIME_FRAMES = ['1H', '4H', '1D', '1W'];

// Chainlink Data Feed Contract Addresses on Ethereum Mainnet
// Note: We use USD feeds and treat them as equivalent to USDT for this app's purpose.
export const CHAINLINK_CONTRACTS: { [key: string]: string } = {
    'BTC/USDT': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // BTC/USD
    'ETH/USDT': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH/USD
    'SOL/USDT': '0x4ffC43a60e009B551862A914b37809d2692E20A7', // SOL/USD
    'BNB/USDT': '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A', // BNB/USD
    'DOGE/USDT': '0x246517826B321e257914333C33221AC146522B34', // DOGE/USD
};
