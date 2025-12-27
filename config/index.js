// Configuration index - centralizes all configuration
const tokens = require('./tokens');
const dexes = require('./dexes');
const contracts = require('./contracts');

module.exports = {
  // Network configuration
  network: {
    name: 'polygon',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    backupRpcUrl: process.env.POLYGON_RPC_URL_BACKUP || 'https://rpc-mainnet.maticvigil.com'
  },

  // Trading parameters
  trading: {
    minProfitBps: parseInt(process.env.MIN_PROFIT_BPS || '50'), // 0.5%
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || '150'),
    scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '5000'),
    defaultAmount: 10000, // Default test amount in base units
    baseTokens: tokens.baseTokens,
    intermediateTokens: tokens.intermediateTokens
  },

  // DEX configuration
  dexes: dexes,

  // Contract addresses
  contracts: contracts,

  // Security
  security: {
    privateKey: process.env.PRIVATE_KEY,
    maxSlippageBps: 300, // 3%
    maxPriceImpactBps: 500 // 5%
  }
};
