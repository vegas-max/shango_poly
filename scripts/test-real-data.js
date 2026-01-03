// Test real data pipeline and WebSocket connections
require('dotenv').config();
const { ethers } = require('ethers');
const PoolDataProvider = require('../src/utils/PoolDataProvider');
const EmergencyStop = require('../src/utils/EmergencyStop');
const config = require('../config');
const logger = require('../src/utils/logger');

async function testRealDataPipeline() {
  logger.info('='.repeat(70));
  logger.info('Testing Real Data Pipeline');
  logger.info('='.repeat(70));
  logger.info('');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function recordTest(name, passed, message = '') {
    results.tests.push({ name, passed, message });
    if (passed) {
      results.passed++;
      logger.info(`✅ ${name}`);
    } else {
      results.failed++;
      logger.error(`❌ ${name}: ${message}`);
    }
  }

  try {
    // Test 1: Network Configuration
    logger.info('Test 1: Network Configuration');
    try {
      const isCorrectNetwork = config.network.isTestnet !== undefined;
      const hasRpcUrl = !!config.network.rpcUrl;
      recordTest(
        'Network configuration loaded',
        isCorrectNetwork && hasRpcUrl,
        isCorrectNetwork && hasRpcUrl ? '' : 'Invalid network config'
      );
      logger.info(`  Network: ${config.network.isTestnet ? 'Testnet' : 'Mainnet'}`);
      logger.info(`  Chain ID: ${config.network.chainId}`);
    } catch (error) {
      recordTest('Network configuration loaded', false, error.message);
    }

    // Test 2: Provider Connection
    logger.info('');
    logger.info('Test 2: Provider Connection');
    let provider;
    try {
      provider = new ethers.providers.JsonRpcProvider(config.network.rpcUrl);
      const network = await provider.getNetwork();
      const isCorrectChain = network.chainId === config.network.chainId;
      recordTest(
        'Provider connects to correct network',
        isCorrectChain,
        isCorrectChain ? '' : `Expected ${config.network.chainId}, got ${network.chainId}`
      );
      logger.info(`  Connected to: ${network.name} (${network.chainId})`);
    } catch (error) {
      recordTest('Provider connects to correct network', false, error.message);
      throw error; // Can't continue without provider
    }

    // Test 3: Pool Data Provider Initialization
    logger.info('');
    logger.info('Test 3: Pool Data Provider Initialization');
    let poolDataProvider;
    try {
      poolDataProvider = new PoolDataProvider(provider, {
        useWebSocket: false, // Test without WebSocket first
        poolUpdateIntervalMs: 10000
      });
      recordTest('Pool data provider initializes', true);
    } catch (error) {
      recordTest('Pool data provider initializes', false, error.message);
      throw error;
    }

    // Test 4: Get Pair Address (QuickSwap)
    logger.info('');
    logger.info('Test 4: Get Pair Address from QuickSwap Factory');
    try {
      // Use common tokens from config (work on both mainnet and testnet if pools exist)
      const tokens = require('../config/tokens');
      const WMATIC = tokens.baseTokens[3]; // WMATIC
      const USDC = tokens.baseTokens[0];   // USDC
      const quickswapFactory = config.dexes.quickswap.factory;

      logger.info(`  Testing with WMATIC/USDC pair`);
      const pairAddress = await poolDataProvider.getPairAddress(quickswapFactory, WMATIC, USDC);
      const hasPair = pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000';
      recordTest(
        'Get pair address from factory',
        hasPair,
        hasPair ? '' : 'No pair found (may not exist on testnet)'
      );
      if (hasPair) {
        logger.info(`  Pair address: ${pairAddress}`);
      }
    } catch (error) {
      recordTest('Get pair address from factory', false, error.message);
    }

    // Test 5: Get Pool Reserves (QuickSwap)
    logger.info('');
    logger.info('Test 5: Get Real Pool Reserves from QuickSwap');
    try {
      const tokens = require('../config/tokens');
      const WMATIC = tokens.baseTokens[3]; // WMATIC
      const USDC = tokens.baseTokens[0];   // USDC
      const quickswapFactory = config.dexes.quickswap.factory;

      const reserves = await poolDataProvider.getPoolReserves('quickswap', WMATIC, USDC, quickswapFactory);
      const hasReserves = reserves && reserves.reserveA && reserves.reserveB;
      recordTest(
        'Fetch real pool reserves',
        hasReserves,
        hasReserves ? '' : 'Failed to fetch reserves'
      );
      if (hasReserves) {
        logger.info(`  Reserve A: ${ethers.utils.formatUnits(reserves.reserveA, 18)} WMATIC`);
        logger.info(`  Reserve B: ${ethers.utils.formatUnits(reserves.reserveB, 6)} USDC`);
      }
    } catch (error) {
      recordTest('Fetch real pool reserves', false, error.message);
    }

    // Test 6: Emergency Stop
    logger.info('');
    logger.info('Test 6: Emergency Stop Functionality');
    try {
      const emergencyStop = new EmergencyStop(config.production);
      
      // Test registration
      let callbackTriggered = false;
      emergencyStop.onStop(() => {
        callbackTriggered = true;
      });
      
      // Test trigger
      await emergencyStop.trigger('Test emergency', { testMode: true });
      
      const triggered = emergencyStop.isStopped && callbackTriggered;
      recordTest(
        'Emergency stop triggers and calls callbacks',
        triggered,
        triggered ? '' : 'Emergency stop not working'
      );
      
      // Test reset
      const resetSuccess = emergencyStop.reset('AUTHORIZED_RESET');
      recordTest(
        'Emergency stop can be reset',
        resetSuccess && !emergencyStop.isStopped,
        resetSuccess ? '' : 'Reset failed'
      );
    } catch (error) {
      recordTest('Emergency stop triggers and calls callbacks', false, error.message);
      recordTest('Emergency stop can be reset', false, error.message);
    }

    // Test 7: Cache Statistics
    logger.info('');
    logger.info('Test 7: Pool Data Provider Cache');
    try {
      const stats = poolDataProvider.getCacheStats();
      recordTest(
        'Cache statistics available',
        stats !== null && stats.cacheSize !== undefined,
        stats ? '' : 'Cache stats not available'
      );
      logger.info(`  Cache size: ${stats.cacheSize}`);
      logger.info(`  WebSocket enabled: ${stats.webSocketEnabled}`);
      logger.info(`  WebSocket connected: ${stats.webSocketConnected}`);
    } catch (error) {
      recordTest('Cache statistics available', false, error.message);
    }

    // Test 8: Configuration Values
    logger.info('');
    logger.info('Test 8: Production Configuration');
    try {
      const hasEmergencyStop = config.production.enableEmergencyStop !== undefined;
      const hasConservativeMode = config.production.conservativeMode !== undefined;
      const hasMaxPosition = config.production.maxPositionSizeEth !== undefined;
      
      const allConfigured = hasEmergencyStop && hasConservativeMode && hasMaxPosition;
      recordTest(
        'Production settings configured',
        allConfigured,
        allConfigured ? '' : 'Some production settings missing'
      );
      logger.info(`  Emergency Stop: ${config.production.enableEmergencyStop}`);
      logger.info(`  Conservative Mode: ${config.production.conservativeMode}`);
      logger.info(`  Max Position Size: ${config.production.maxPositionSizeEth} ETH`);
    } catch (error) {
      recordTest('Production settings configured', false, error.message);
    }

    // Test 9: Real Data Configuration
    logger.info('');
    logger.info('Test 9: Real Data Configuration');
    try {
      const useRealData = config.trading.useRealData;
      const useWebSocket = config.trading.useWebSocket;
      const poolUpdateInterval = config.trading.poolUpdateIntervalMs;
      
      recordTest(
        'Real data settings configured',
        useRealData !== undefined && poolUpdateInterval > 0,
        'Real data settings valid'
      );
      logger.info(`  Use Real Data: ${useRealData}`);
      logger.info(`  Use WebSocket: ${useWebSocket}`);
      logger.info(`  Pool Update Interval: ${poolUpdateInterval}ms`);
    } catch (error) {
      recordTest('Real data settings configured', false, error.message);
    }

    // Cleanup
    if (poolDataProvider) {
      await poolDataProvider.cleanup();
    }

  } catch (error) {
    logger.error('Fatal error during testing', { error: error.message });
  }

  // Print Summary
  logger.info('');
  logger.info('='.repeat(70));
  logger.info('Test Summary');
  logger.info('='.repeat(70));
  logger.info(`Total Tests: ${results.passed + results.failed}`);
  logger.info(`Passed: ${results.passed} ✅`);
  logger.info(`Failed: ${results.failed} ❌`);
  logger.info('');

  if (results.failed > 0) {
    logger.info('Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => logger.info(`  - ${t.name}: ${t.message}`));
  }

  const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  logger.info(`Success Rate: ${successRate}%`);
  logger.info('='.repeat(70));

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
testRealDataPipeline().catch(error => {
  logger.error('Test failed', { error: error.message });
  process.exit(1);
});
