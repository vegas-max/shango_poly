// Main entry point - Initializes and starts the arbitrage bot
require('dotenv').config();
const { ethers } = require('ethers');
const ArbitrageBot = require('./src/bot/ArbitrageBot');
const DexInterface = require('./src/dex/DexInterface');
const PriceOracle = require('./src/oracle/PriceOracle');
const QuickSwapDex = require('./src/dex/QuickSwapDex');
const SushiSwapDex = require('./src/dex/SushiSwapDex');
const UniswapV3Dex = require('./src/dex/UniswapV3Dex');
const PoolDataProvider = require('./src/utils/PoolDataProvider');
const EmergencyStop = require('./src/utils/EmergencyStop');
const config = require('./config');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

async function main() {
  logger.info('='.repeat(70));
  logger.info('SHANGO POLY - Polygon Arbitrage Bot');
  logger.info('Backward Data Flow Architecture: EXECUTION -> DATA FETCH');
  logger.info(`Network: ${config.network.isTestnet ? 'TESTNET (Mumbai)' : 'MAINNET'}`);
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

  // Initialize emergency stop
  const emergencyStop = new EmergencyStop(config.production);
  
  // Declare these in outer scope for cleanup
  let bot = null;
  let poolDataProvider = null;
  
  try {
    // Initialize provider
    logger.info('Connecting to Polygon network...');
    const provider = new ethers.providers.JsonRpcProvider(config.network.rpcUrl);
    
    // Test connection with timeout
    const connectionTimeout = 10000; // 10 seconds
    const connectionPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout)
    );
    
    const network = await Promise.race([connectionPromise, timeoutPromise]);
    logger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

    // Verify we're on the correct network
    const expectedChainId = config.network.isTestnet ? 80001 : 137;
    if (network.chainId !== expectedChainId) {
      logger.warn(`⚠️  Connected to unexpected network (chainId: ${network.chainId}, expected: ${expectedChainId})`);
    }

    // Initialize Pool Data Provider for real-time data
    if (config.trading.useRealData) {
      logger.info('Initializing real-time pool data provider...');
      poolDataProvider = new PoolDataProvider(provider, {
        useWebSocket: config.trading.useWebSocket,
        poolUpdateIntervalMs: config.trading.poolUpdateIntervalMs
      });
      
      // Initialize WebSocket if configured
      if (config.network.wsUrl && config.trading.useWebSocket) {
        await poolDataProvider.initializeWebSocket(config.network.wsUrl);
      }
      
      logger.info('✅ Pool data provider initialized');
    }

    // Initialize Layer 3: ROUTING - DexInterface
    logger.info('Initializing DEX Interface (Layer 3: ROUTING)...');
    const dexInterface = new DexInterface();
    
    // Register DEXes with pool data provider
    const quickswap = new QuickSwapDex(provider, config.dexes.quickswap, poolDataProvider);
    const sushiswap = new SushiSwapDex(provider, config.dexes.sushiswap, poolDataProvider);
    const uniswapv3 = new UniswapV3Dex(provider, config.dexes.uniswapv3, poolDataProvider);
    
    dexInterface.registerDex('quickswap', quickswap);
    dexInterface.registerDex('sushiswap', sushiswap);
    dexInterface.registerDex('uniswapv3', uniswapv3);

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
    
    // Load Flash Loan ABI
    let contractABI = [];
    try {
      const abiPath = path.join(__dirname, 'config', 'flashLoanABI.json');
      contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      logger.info('✅ Flash Loan ABI loaded successfully');
    } catch (error) {
      logger.warn('⚠️  Could not load Flash Loan ABI, using empty ABI');
    }
    
    const botConfig = {
      ...config.trading,
      ...config.security,
      contractAddress: config.contracts.flashLoanArbitrage.address || '0x0000000000000000000000000000000000000000',
      contractABI
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

    // Show Rust engine status
    const botStats = bot.getStats();
    if (botStats.rustEngines && botStats.rustEngines.available) {
      logger.info('🦀 Twin Turbo Rust Engines:');
      logger.info('  Engine #1: TurboScanner (ARM-optimized)');
      logger.info('  Engine #2: TurboAggregator (ARM-optimized)');
      if (botStats.rustEngines.lightweightMode) {
        logger.info('  Mode: ⚡ LIGHTWEIGHT (75% memory reduction, 3x faster)');
      } else {
        logger.info('  Mode: 🔧 NORMAL (Full features)');
      }
      logger.info('');
    }

    logger.info('Configuration:');
    logger.info(`  Network: ${config.network.isTestnet ? 'Testnet (Mumbai)' : 'Mainnet'}`);
    logger.info(`  Min Profit: ${config.trading.minProfitBps / 100}%`);
    logger.info(`  Max Gas Price: ${config.trading.maxGasPriceGwei} Gwei`);
    logger.info(`  Scan Interval: ${config.trading.scanIntervalMs}ms`);
    logger.info(`  Real Data: ${config.trading.useRealData ? 'ENABLED' : 'DISABLED'}`);
    logger.info(`  WebSocket: ${config.trading.useWebSocket ? 'ENABLED' : 'DISABLED'}`);
    logger.info(`  Base Tokens: ${config.trading.baseTokens.length}`);
    logger.info(`  Intermediate Tokens: ${config.trading.intermediateTokens.length}`);
    logger.info(`  Registered DEXes: ${dexInterface.getRegisteredDexes().join(', ')}`);
    logger.info(`  Emergency Stop: ${config.production.enableEmergencyStop ? 'ENABLED' : 'DISABLED'}`);
    logger.info(`  Conservative Mode: ${config.production.conservativeMode ? 'ENABLED' : 'DISABLED'}`);
    logger.info('');

    // Note about contract deployment
    if (!config.contracts.flashLoanArbitrage.address) {
      logger.warn('⚠️  Flash loan contract not deployed yet');
      logger.warn('⚠️  Deploy contracts/FlashLoanArbitrage.sol before executing trades');
      logger.info('');
      logger.info('Running in SIMULATION MODE - will scan for opportunities but not execute');
    }

    // Show testnet warning
    if (config.network.isTestnet) {
      logger.warn('');
      logger.warn('⚠️  RUNNING ON TESTNET (Mumbai) ⚠️');
      logger.warn('⚠️  For production, set NETWORK=mainnet in .env');
      logger.warn('');
    }

    // Register emergency stop handler
    emergencyStop.onStop(async (reason, metadata) => {
      logger.error('Emergency stop triggered, halting bot', { reason, metadata });
      await bot.stop();
      
      // Cleanup resources
      if (poolDataProvider) {
        await poolDataProvider.cleanup();
      }
    });

    logger.info('='.repeat(70));
    logger.info('Bot is ready! Starting opportunity scanner...');
    logger.info('='.repeat(70));
    logger.info('');

    // Start the bot
    await bot.start();

  } catch (error) {
    logger.error('Fatal error:', error);
    
    // Provide helpful error messages for common issues
    if (error.message.includes('Connection timeout') || error.code === 'NETWORK_ERROR') {
      logger.error('');
      logger.error('RPC Connection Error - Please check:');
      logger.error('  1. Your POLYGON_RPC_URL in .env is correct');
      logger.error('  2. You have internet connectivity');
      logger.error('  3. The RPC endpoint is operational');
      logger.error('  4. Consider using a backup RPC: ' + config.network.backupRpcUrl);
    } else if (error.message.includes('PRIVATE_KEY')) {
      logger.error('');
      logger.error('Configuration Error:');
      logger.error('  Please set a valid PRIVATE_KEY in your .env file');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info('');
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  // Stop the bot if running
  if (bot && bot.isRunning) {
    await bot.stop();
  }
  
  // Cleanup pool data provider
  if (poolDataProvider) {
    await poolDataProvider.cleanup();
  }
  
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the bot
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
