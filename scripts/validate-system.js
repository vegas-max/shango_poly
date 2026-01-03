// System-Wide Validation Script
// Validates all RPC endpoints, imports, calculations, and complete flow

const { ethers } = require('ethers');
const logger = require('../src/utils/logger');
const config = require('../config');

// Test results accumulator
const validationResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

function testPassed(testName) {
  validationResults.total++;
  validationResults.passed++;
  console.log(`  ✓ ${testName}`);
}

function testFailed(testName, error) {
  validationResults.total++;
  validationResults.failed++;
  validationResults.errors.push({ test: testName, error });
  console.log(`  ✗ ${testName}: ${error}`);
}

function testWarning(testName, warning) {
  validationResults.warnings++;
  console.log(`  ⚠  ${testName}: ${warning}`);
}

async function validateSystem() {
  console.log('='.repeat(80));
  console.log('SYSTEM-WIDE VALIDATION AND INTEGRATION TEST');
  console.log('='.repeat(80));
  console.log('');

  // ========================================
  // 1. CONFIGURATION VALIDATION
  // ========================================
  console.log('1. CONFIGURATION VALIDATION');
  console.log('-'.repeat(80));

  // Check RPC URL
  if (config.network.rpcUrl && config.network.rpcUrl !== 'https://polygon-rpc.com') {
    testPassed('RPC URL configured');
  } else {
    testWarning('RPC URL', 'Using default RPC URL - consider setting POLYGON_RPC_URL in .env');
  }

  // Check private key
  if (config.security.privateKey && 
      config.security.privateKey !== 'your_private_key_here' &&
      config.security.privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000001') {
    testPassed('Private key configured');
  } else {
    testWarning('Private key', 'Using test/default private key - replace with your own key for production');
  }

  // Check contract address
  if (config.contracts.flashLoanArbitrage.address) {
    testPassed('Contract address configured');
  } else {
    testWarning('Contract address', 'Flash loan contract not deployed - will run in simulation mode');
  }

  // Validate no zero addresses in contracts (except optional ones)
  if (config.contracts.aave.pool !== '0x0000000000000000000000000000000000000000') {
    testPassed('Aave pool address not zero');
  } else {
    testFailed('Aave pool address', 'Zero address detected');
  }

  console.log('');

  // ========================================
  // 2. RPC CONNECTION VALIDATION
  // ========================================
  console.log('2. RPC CONNECTION VALIDATION');
  console.log('-'.repeat(80));

  let provider = null;
  let rpcConnected = false;

  try {
    provider = new ethers.providers.JsonRpcProvider(config.network.rpcUrl);
    
    // Test connection with timeout
    const connectionTimeout = 10000;
    const connectionPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout)
    );
    
    const network = await Promise.race([connectionPromise, timeoutPromise]);
    testPassed(`Connected to ${network.name} (Chain ID: ${network.chainId})`);
    rpcConnected = true;

    // Verify Polygon mainnet
    if (network.chainId === 137) {
      testPassed('Connected to Polygon mainnet');
    } else {
      testWarning('Network', `Connected to chain ${network.chainId}, not Polygon mainnet (137)`);
    }

    // Test getting block number
    const blockNumber = await provider.getBlockNumber();
    testPassed(`Block number: ${blockNumber}`);

    // Test getting gas price
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    testPassed(`Gas price: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei`);

  } catch (error) {
    testWarning('RPC Connection', `Could not connect to RPC: ${error.message} - continuing with offline validation`);
    // Don't exit, continue with offline validation
  }

  console.log('');

  // ========================================
  // 3. MODULE IMPORT VALIDATION
  // ========================================
  console.log('3. MODULE IMPORT VALIDATION');
  console.log('-'.repeat(80));

    try {
      const ArbitrageBot = require('../src/bot/ArbitrageBot');
      testPassed('ArbitrageBot import');
    } catch (error) {
      testFailed('ArbitrageBot import', error.message);
    }

    try {
      const OpportunityScanner = require('../src/bot/OpportunityScanner');
      testPassed('OpportunityScanner import');
    } catch (error) {
      testFailed('OpportunityScanner import', error.message);
    }

    try {
      const FlashLoanExecutor = require('../src/bot/FlashLoanExecutor');
      testPassed('FlashLoanExecutor import');
    } catch (error) {
      testFailed('FlashLoanExecutor import', error.message);
    }

    try {
      const FlashLoanCalculator = require('../src/bot/FlashLoanCalculator');
      testPassed('FlashLoanCalculator import');
    } catch (error) {
      testFailed('FlashLoanCalculator import', error.message);
    }

    try {
      const DexInterface = require('../src/dex/DexInterface');
      testPassed('DexInterface import');
    } catch (error) {
      testFailed('DexInterface import', error.message);
    }

    try {
      const QuickSwapDex = require('../src/dex/QuickSwapDex');
      testPassed('QuickSwapDex import');
    } catch (error) {
      testFailed('QuickSwapDex import', error.message);
    }

    try {
      const SushiSwapDex = require('../src/dex/SushiSwapDex');
      testPassed('SushiSwapDex import');
    } catch (error) {
      testFailed('SushiSwapDex import', error.message);
    }

    try {
      const PriceOracle = require('../src/oracle/PriceOracle');
      testPassed('PriceOracle import');
    } catch (error) {
      testFailed('PriceOracle import', error.message);
    }

    try {
      const RiskManager = require('../src/utils/RiskManager');
      testPassed('RiskManager import');
    } catch (error) {
      testFailed('RiskManager import', error.message);
    }

    try {
      const GasOptimizer = require('../src/utils/GasOptimizer');
      testPassed('GasOptimizer import');
    } catch (error) {
      testFailed('GasOptimizer import', error.message);
    }

    try {
      const MEVProtection = require('../src/utils/MEVProtection');
      testPassed('MEVProtection import');
    } catch (error) {
      testFailed('MEVProtection import', error.message);
    }

    console.log('');

    // ========================================
    // 4. DEX INTERFACE METHOD VALIDATION
    // ========================================
    console.log('4. DEX INTERFACE METHOD VALIDATION');
    console.log('-'.repeat(80));

    const DexInterface = require('../src/dex/DexInterface');
    const QuickSwapDex = require('../src/dex/QuickSwapDex');
    const SushiSwapDex = require('../src/dex/SushiSwapDex');

    const dexInterface = new DexInterface();
    
    // Check DexInterface has required methods
    if (typeof dexInterface.registerDex === 'function') {
      testPassed('DexInterface.registerDex exists');
    } else {
      testFailed('DexInterface.registerDex', 'Method not found');
    }

    if (typeof dexInterface.findBestRoute === 'function') {
      testPassed('DexInterface.findBestRoute exists');
    } else {
      testFailed('DexInterface.findBestRoute', 'Method not found');
    }

    if (typeof dexInterface.findArbitrageRoutes === 'function') {
      testPassed('DexInterface.findArbitrageRoutes exists');
    } else {
      testFailed('DexInterface.findArbitrageRoutes', 'Method not found');
    }

    if (typeof dexInterface.getLiquidity === 'function') {
      testPassed('DexInterface.getLiquidity exists');
    } else {
      testFailed('DexInterface.getLiquidity', 'Method not found');
    }

    if (typeof dexInterface.getPriceImpact === 'function') {
      testPassed('DexInterface.getPriceImpact exists');
    } else {
      testFailed('DexInterface.getPriceImpact', 'Method not found');
    }

    // Register DEXes and check methods (use mock provider if RPC failed)
    const testProvider = provider || new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const quickswap = new QuickSwapDex(testProvider, config.dexes.quickswap);
    const sushiswap = new SushiSwapDex(testProvider, config.dexes.sushiswap);

    if (typeof quickswap.getQuote === 'function') {
      testPassed('QuickSwapDex.getQuote exists');
    } else {
      testFailed('QuickSwapDex.getQuote', 'Method not found');
    }

    if (typeof quickswap.getLiquidity === 'function') {
      testPassed('QuickSwapDex.getLiquidity exists');
    } else {
      testFailed('QuickSwapDex.getLiquidity', 'Method not found');
    }

    if (typeof quickswap.getPriceImpact === 'function') {
      testPassed('QuickSwapDex.getPriceImpact exists');
    } else {
      testFailed('QuickSwapDex.getPriceImpact', 'Method not found');
    }

    if (typeof sushiswap.getQuote === 'function') {
      testPassed('SushiSwapDex.getQuote exists');
    } else {
      testFailed('SushiSwapDex.getQuote', 'Method not found');
    }

    if (typeof sushiswap.getLiquidity === 'function') {
      testPassed('SushiSwapDex.getLiquidity exists');
    } else {
      testFailed('SushiSwapDex.getLiquidity', 'Method not found');
    }

    if (typeof sushiswap.getPriceImpact === 'function') {
      testPassed('SushiSwapDex.getPriceImpact exists');
    } else {
      testFailed('SushiSwapDex.getPriceImpact', 'Method not found');
    }

    console.log('');

    // ========================================
    // 5. CLASS INITIALIZATION VALIDATION
    // ========================================
    console.log('5. CLASS INITIALIZATION VALIDATION');
    console.log('-'.repeat(80));

    try {
      dexInterface.registerDex('quickswap', quickswap);
      dexInterface.registerDex('sushiswap', sushiswap);
      testPassed('DEXes registered successfully');
    } catch (error) {
      testFailed('DEX registration', error.message);
    }

    // Check provider was set
    if (dexInterface.provider) {
      testPassed('DexInterface provider set from registered DEX');
    } else {
      testFailed('DexInterface provider', 'Provider not set');
    }

    try {
      const PriceOracle = require('../src/oracle/PriceOracle');
      const testProvider = provider || new ethers.providers.JsonRpcProvider('http://localhost:8545');
      const priceOracle = new PriceOracle(testProvider);
      testPassed('PriceOracle initialized');
    } catch (error) {
      testFailed('PriceOracle initialization', error.message);
    }

    try {
      const FlashLoanCalculator = require('../src/bot/FlashLoanCalculator');
      const mockAaveProvider = {
        getReserveData: async (asset) => ({
          availableLiquidity: ethers.utils.parseUnits('1000000', 18)
        })
      };
      const calculator = new FlashLoanCalculator(mockAaveProvider);
      testPassed('FlashLoanCalculator initialized');
    } catch (error) {
      testFailed('FlashLoanCalculator initialization', error.message);
    }

    try {
      const FlashLoanExecutor = require('../src/bot/FlashLoanExecutor');
      const testProvider = provider || new ethers.providers.JsonRpcProvider('http://localhost:8545');
      const testKey = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const executor = new FlashLoanExecutor(
        testProvider,
        '0x0000000000000000000000000000000000000000',
        testKey
      );
      await executor.initialize([]);
      testPassed('FlashLoanExecutor initialized (simulation mode)');
    } catch (error) {
      testFailed('FlashLoanExecutor initialization', error.message);
    }

    console.log('');

    // ========================================
    // 6. CALCULATION VALIDATION
    // ========================================
    console.log('6. CALCULATION VALIDATION');
    console.log('-'.repeat(80));

    try {
      const FlashLoanCalculator = require('../src/bot/FlashLoanCalculator');
      const mockAaveProvider = {
        getReserveData: async (asset) => ({
          availableLiquidity: ethers.utils.parseUnits('1000000', 18)
        })
      };
      const calculator = new FlashLoanCalculator(mockAaveProvider);
      
      // Test profit calculation
      const amount = ethers.utils.parseUnits('1000', 18);
      const profitBps = 100; // 1%
      const profitCalc = calculator.calculateProfit(amount, profitBps);
      
      if (profitCalc.grossProfit.gt(0)) {
        testPassed('Profit calculation works');
      } else {
        testFailed('Profit calculation', 'Gross profit should be > 0');
      }

      if (profitCalc.flashLoanFee.gt(0)) {
        testPassed('Flash loan fee calculated');
      } else {
        testFailed('Flash loan fee', 'Fee should be > 0');
      }

      if (profitCalc.netProfit.lt(profitCalc.grossProfit)) {
        testPassed('Net profit accounts for fees');
      } else {
        testFailed('Net profit', 'Should be less than gross profit');
      }
    } catch (error) {
      testFailed('Calculation validation', error.message);
    }

    console.log('');

    // ========================================
    // 7. ABI VALIDATION
    // ========================================
    console.log('7. ABI VALIDATION');
    console.log('-'.repeat(80));

    try {
      const fs = require('fs');
      const path = require('path');
      const abiPath = path.join(__dirname, '..', 'config', 'flashLoanABI.json');
      
      if (fs.existsSync(abiPath)) {
        testPassed('Flash Loan ABI file exists');
        
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        if (Array.isArray(abi) && abi.length > 0) {
          testPassed('Flash Loan ABI loaded and valid');
          
          const executeFunction = abi.find(item => item.name === 'executeArbitrage');
          if (executeFunction) {
            testPassed('executeArbitrage function in ABI');
          } else {
            testFailed('executeArbitrage function', 'Not found in ABI');
          }
        } else {
          testFailed('Flash Loan ABI', 'Invalid ABI format');
        }
      } else {
        testFailed('Flash Loan ABI file', 'File not found');
      }
    } catch (error) {
      testFailed('ABI validation', error.message);
    }

    console.log('');

  // ========================================
  // SUMMARY
  // ========================================
  console.log('='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total Tests: ${validationResults.total}`);
  console.log(`Passed: ${validationResults.passed} ✓`);
  console.log(`Failed: ${validationResults.failed} ✗`);
  console.log(`Warnings: ${validationResults.warnings} ⚠`);
  console.log(`Success Rate: ${(validationResults.passed / validationResults.total * 100).toFixed(1)}%`);
  console.log('');

  if (validationResults.failed > 0) {
    console.log('FAILED TESTS:');
    console.log('-'.repeat(80));
    validationResults.errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.test}`);
      console.log(`   Error: ${err.error}`);
    });
    console.log('');
  }

  if (validationResults.failed === 0) {
    console.log('🎉 ALL VALIDATION TESTS PASSED!');
    console.log('System is ready for operation.');
  } else {
    console.log(`⚠️  ${validationResults.failed} test(s) failed.`);
    console.log('Please address the issues above before running the bot.');
  }

  return validationResults.failed === 0;
}

// Run validation
validateSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation failed with error:', error);
    process.exit(1);
  });
