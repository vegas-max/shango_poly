// Configuration index - centralizes all configuration
const tokens = require('./tokens');
const dexes = require('./dexes');
const contracts = require('./contracts');

// Determine if we're on testnet or mainnet
const isTestnet = process.env.NETWORK === 'testnet';

module.exports = {
  // Network configuration
  network: {
    name: isTestnet ? 'mumbai' : 'polygon',
    chainId: isTestnet ? 80001 : 137,
    rpcUrl: isTestnet 
      ? (process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com')
      : (process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'),
    backupRpcUrl: isTestnet
      ? (process.env.POLYGON_MUMBAI_RPC_URL_BACKUP || 'https://polygon-mumbai.g.alchemy.com/v2/demo')
      : (process.env.POLYGON_RPC_URL_BACKUP || 'https://rpc-mainnet.maticvigil.com'),
    wsUrl: isTestnet ? process.env.POLYGON_MUMBAI_WS_URL : process.env.POLYGON_WS_URL,
    isTestnet
  },

  // Trading parameters
  trading: {
    minProfitBps: parseInt(process.env.MIN_PROFIT_BPS || '50'), // 0.5%
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || '150'),
    scanIntervalMs: parseInt(process.env.SCAN_INTERVAL_MS || '5000'),
    defaultAmount: 10000, // Default test amount in base units
    baseTokens: tokens.baseTokens,
    intermediateTokens: tokens.intermediateTokens,
    useRealData: process.env.USE_REAL_DATA !== 'false', // Default to true
    useWebSocket: process.env.USE_WEBSOCKET === 'true',
    poolUpdateIntervalMs: parseInt(process.env.POOL_UPDATE_INTERVAL_MS || '10000')
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
  },

  // Production settings
  production: {
    enableEmergencyStop: process.env.ENABLE_EMERGENCY_STOP !== 'false',
    emergencyWebhookUrl: process.env.EMERGENCY_WEBHOOK_URL || null,
    conservativeMode: process.env.CONSERVATIVE_MODE === 'true',
    maxPositionSizeEth: parseFloat(process.env.MAX_POSITION_SIZE_ETH || '5')
  },

  // Rust engine settings
  rust: {
    enableHttpServer: process.env.RUST_HTTP_SERVER === 'true',
    httpPort: parseInt(process.env.RUST_HTTP_PORT || '8080')
  },

  // ML configuration
  ml: {
    enabled: process.env.ENABLE_ML_PREDICTIONS === 'true',
    modelPath: process.env.ML_MODEL_PATH || './models/arbitrage_predictor.json'
  }
};
