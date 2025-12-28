// Main entry point - Initializes and starts the arbitrage bot
require('dotenv').config();
const { ethers } = require('ethers');
const ArbitrageBot = require('./src/bot/ArbitrageBot');
const DexInterface = require('./src/dex/DexInterface');
const PriceOracle = require('./src/oracle/PriceOracle');
const QuickSwapDex = require('./src/dex/QuickSwapDex');
const SushiSwapDex = require('./src/dex/SushiSwapDex');
const config = require('./config');
const logger = require('./src/utils/logger');
const fs = require('fs');

async function main() {
  logger.info('='.repeat(70));
  logger.info('SHANGO POLY - Polygon Arbitrage Bot');
  logger.info('Backward Data Flow Architecture: EXECUTION -> DATA FETCH');
  logger.info('='.repeat(70));

  // Create logs directory if it doesn't exist
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }

  // Validate configuration
  if (!config.security.privateKey || config.security.privateKey === 'your_private_key_here') {
    logger.error('Please set PRIVATE_KEY in .env file');
    process.exit(1);
  }

  try {
    // Initialize provider
    logger.info('Connecting to Polygon network...');
    const provider = new ethers.providers.JsonRpcProvider(config.network.rpcUrl);
    const network = await provider.getNetwork();
    logger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

    // Initialize Layer 3: ROUTING - DexInterface
    logger.info('Initializing DEX Interface (Layer 3: ROUTING)...');
    const dexInterface = new DexInterface();
    
    // Register DEXes
    const quickswap = new QuickSwapDex(provider, config.dexes.quickswap);
    const sushiswap = new SushiSwapDex(provider, config.dexes.sushiswap);
    
    dexInterface.registerDex('quickswap', quickswap);
    dexInterface.registerDex('sushiswap', sushiswap);

    // Initialize Layer 2: PRICE AGGREGATION - PriceOracle
    logger.info('Initializing Price Oracle (Layer 2: PRICE AGGREGATION)...');
    const priceOracle = new PriceOracle(provider);

    // Mock Aave provider for now (would be real in production)
    const aaveProvider = {
      getReserveData: async (asset) => ({
        availableLiquidity: ethers.utils.parseUnits('1000000', 18)
      })
    };

    // Initialize ArbitrageBot (orchestrates all layers)
    logger.info('Initializing Arbitrage Bot...');
    const botConfig = {
      ...config.trading,
      ...config.security,
      contractAddress: config.contracts.flashLoanArbitrage.address || '0x0000000000000000000000000000000000000000',
      contractABI: [] // Would load actual ABI in production
    };

    const bot = new ArbitrageBot(botConfig);
    await bot.initialize(provider, dexInterface, priceOracle, aaveProvider);

    logger.info('');
    logger.info('Architecture Layers:');
    logger.info('  Layer 7: EXECUTION         ✓ FlashLoanExecutor');
    logger.info('  Layer 6: TRANSACTION       ✓ Transaction Builder');
    logger.info('  Layer 5: VALIDATION        ✓ Opportunity Validator');
    logger.info('  Layer 4: CALCULATION       ✓ FlashLoanCalculator');
    logger.info('  Layer 3: ROUTING           ✓ DexInterface');
    logger.info('  Layer 2: PRICE AGGREGATION ✓ PriceOracle');
    logger.info('  Layer 1: DATA FETCH        ✓ OpportunityScanner');
    logger.info('');

    logger.info('Configuration:');
    logger.info(`  Min Profit: ${config.trading.minProfitBps / 100}%`);
    logger.info(`  Max Gas Price: ${config.trading.maxGasPriceGwei} Gwei`);
    logger.info(`  Scan Interval: ${config.trading.scanIntervalMs}ms`);
    logger.info(`  Base Tokens: ${config.trading.baseTokens.length}`);
    logger.info(`  Intermediate Tokens: ${config.trading.intermediateTokens.length}`);
    logger.info(`  Registered DEXes: ${dexInterface.getRegisteredDexes().join(', ')}`);
    logger.info('');

    // Note about contract deployment
    if (!config.contracts.flashLoanArbitrage.address) {
      logger.warn('⚠️  Flash loan contract not deployed yet');
      logger.warn('⚠️  Deploy contracts/FlashLoanArbitrage.sol before executing trades');
      logger.info('');
      logger.info('Running in SIMULATION MODE - will scan for opportunities but not execute');
    }

    logger.info('='.repeat(70));
    logger.info('Bot is ready! Starting opportunity scanner...');
    logger.info('='.repeat(70));
    logger.info('');

    // Start the bot
    await bot.start();

  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('');
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('');
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
