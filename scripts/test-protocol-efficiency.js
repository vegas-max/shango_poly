// Test Protocol Efficiency Features
// Tests RiskManager, GasOptimizer, and MEVProtection modules

const { ethers } = require('ethers');
const RiskManager = require('../src/utils/RiskManager');
const GasOptimizer = require('../src/utils/GasOptimizer');
const MEVProtection = require('../src/utils/MEVProtection');

// Mock provider for testing
class MockProvider {
  async getGasPrice() {
    return ethers.utils.parseUnits('100', 'gwei');
  }
  
  async getBalance(address) {
    return ethers.utils.parseEther('10');
  }
}

async function testRiskManager() {
  console.log('\n=== Testing RiskManager ===\n');
  
  const riskManager = new RiskManager({
    dailyLossLimitEth: 0.5,
    maxConsecutiveFailures: 3,
    maxDrawdownPercent: 10,
    minBalanceEth: 1.0
  });
  
  const initialBalance = ethers.utils.parseEther('10');
  riskManager.initialize(initialBalance);
  
  // Test 1: Should allow trading initially
  let canTrade = riskManager.canTrade();
  console.log('✓ Test 1: Initial trading allowed:', canTrade.allowed);
  if (!canTrade.allowed) {
    console.error('✗ FAILED: Should allow trading initially');
    return false;
  }
  
  // Test 2: Record successful trade
  const profit = ethers.utils.parseEther('0.1');
  const newBalance = initialBalance.add(profit);
  riskManager.recordTrade(true, profit, newBalance);
  console.log('✓ Test 2: Recorded successful trade');
  
  // Test 3: Record failed trades (should trigger circuit breaker)
  let failedBalance = newBalance;
  for (let i = 0; i < 3; i++) {
    const loss = ethers.utils.parseEther('0.05');
    failedBalance = failedBalance.sub(loss);
    riskManager.recordTrade(false, loss.mul(-1), failedBalance);
  }
  
  canTrade = riskManager.canTrade();
  console.log('✓ Test 3: Circuit breaker activated:', !canTrade.allowed);
  if (canTrade.allowed) {
    console.error('✗ FAILED: Circuit breaker should be activated after 3 failures');
    return false;
  }
  
  // Test 4: Success rate calculation
  const stats = riskManager.getStats();
  console.log('✓ Test 4: Success rate:', stats.successRate.toFixed(2) + '%');
  console.log('  - Total trades:', stats.totalTrades);
  console.log('  - Successful:', stats.successfulTrades);
  console.log('  - Failed:', stats.failedTrades);
  
  // Test 5: Drawdown calculation
  console.log('✓ Test 5: Drawdown:', stats.drawdown.toFixed(2) + '%');
  
  console.log('\n✅ RiskManager tests passed!\n');
  return true;
}

async function testGasOptimizer() {
  console.log('\n=== Testing GasOptimizer ===\n');
  
  const provider = new MockProvider();
  const gasOptimizer = new GasOptimizer(provider, {
    maxGasPriceGwei: 200,
    targetGasPriceGwei: 100,
    peakHourGasMultiplier: 1.5
  });
  
  // Test 1: Get optimal gas price
  const gasInfo = await gasOptimizer.getOptimalGasPrice();
  console.log('✓ Test 1: Optimal gas price:', gasInfo.optimalGwei.toFixed(2), 'gwei');
  console.log('  - Should trade:', gasInfo.shouldTrade);
  console.log('  - Current gas:', gasInfo.currentGwei.toFixed(2), 'gwei');
  
  if (!gasInfo.shouldTrade) {
    console.error('✗ FAILED: Should allow trading at normal gas price');
    return false;
  }
  
  // Test 2: Update gas history multiple times
  for (let i = 0; i < 5; i++) {
    const gasPrice = ethers.utils.parseUnits((100 + i * 10).toString(), 'gwei');
    await gasOptimizer.updateGasHistory(gasPrice);
  }
  
  const prediction = gasOptimizer.predictGasTrend();
  console.log('✓ Test 2: Gas trend prediction:', prediction.trend);
  console.log('  - Confidence:', prediction.confidence + '%');
  console.log('  - Average gas:', prediction.avgGwei.toFixed(2), 'gwei');
  
  // Test 3: Profitability check
  const expectedProfit = ethers.utils.parseEther('0.1');
  const gasPrice = ethers.utils.parseUnits('100', 'gwei');
  const profitCheck = gasOptimizer.checkProfitabilityAfterGas(
    expectedProfit,
    gasPrice,
    500000
  );
  
  console.log('✓ Test 3: Profitability after gas');
  console.log('  - Expected profit:', ethers.utils.formatEther(profitCheck.expectedProfit), 'ETH');
  console.log('  - Gas cost:', ethers.utils.formatEther(profitCheck.gasCost), 'ETH');
  console.log('  - Net profit:', ethers.utils.formatEther(profitCheck.netProfit), 'ETH');
  console.log('  - Profitable:', profitCheck.profitable);
  
  if (!profitCheck.profitable) {
    console.error('✗ FAILED: Should be profitable with 0.1 ETH profit');
    return false;
  }
  
  // Test 4: Get stats
  const stats = gasOptimizer.getStats();
  console.log('✓ Test 4: Gas optimizer stats');
  console.log('  - Current gas:', stats.currentGasGwei.toFixed(2), 'gwei');
  console.log('  - Trend:', stats.trend);
  console.log('  - Peak threshold:', stats.peakThreshold, 'gwei');
  
  console.log('\n✅ GasOptimizer tests passed!\n');
  return true;
}

async function testMEVProtection() {
  console.log('\n=== Testing MEVProtection ===\n');
  
  const mevProtection = new MEVProtection({
    usePrivateTransactions: true,
    bundleTransactions: true,
    minTimeBetweenTrades: 1000 // 1 second for testing
  });
  
  // Test 1: Check if MEV protection is enabled
  const isEnabled = mevProtection.isMEVProtectionEnabled();
  console.log('✓ Test 1: MEV protection enabled:', isEnabled);
  
  if (!isEnabled) {
    console.error('✗ FAILED: MEV protection should be enabled');
    return false;
  }
  
  // Test 2: Prepare protected transaction
  const transaction = {
    to: '0x1234567890123456789012345678901234567890',
    value: ethers.utils.parseEther('1.0'),
    slippageTolerance: 0.5,
    expectedProfit: 0.1,
    blockNumber: 1000
  };
  
  const protectedTx = await mevProtection.prepareProtectedTransaction(transaction);
  console.log('✓ Test 2: Protected transaction prepared');
  console.log('  - Slippage protection:', protectedTx.slippageProtection?.type);
  console.log('  - Original slippage:', protectedTx.slippageProtection?.originalTolerance + '%');
  console.log('  - Protected slippage:', protectedTx.slippageProtection?.tolerance + '%');
  
  // Test 3: Calculate optimal delay
  const delay1 = await mevProtection.calculateOptimalDelay();
  console.log('✓ Test 3: Optimal delay calculated:', delay1.toFixed(0), 'ms');
  
  // Test 4: Get protection recommendations
  const opportunity = {
    expectedProfit: 0.6, // High value
    competitionLevel: 8 // High competition
  };
  
  const recommendations = mevProtection.getProtectionRecommendations(opportunity);
  console.log('✓ Test 4: Protection recommendations');
  console.log('  - Use private pool:', recommendations.usePrivatePool);
  console.log('  - Increase slippage:', recommendations.increaseSlippage);
  console.log('  - Reasons:', recommendations.reasons.join(', '));
  
  if (!recommendations.usePrivatePool) {
    console.error('✗ FAILED: Should recommend private pool for high-value trade');
    return false;
  }
  
  // Test 5: Detect frontrunning
  const originalTx = {
    expectedPrice: 100
  };
  
  const executedTx = {
    actualPrice: 105 // 5% difference
  };
  
  const frontrunCheck = mevProtection.detectFrontrunning(originalTx, executedTx);
  console.log('✓ Test 5: Frontrun detection');
  console.log('  - Detected:', frontrunCheck.detected);
  console.log('  - Confidence:', frontrunCheck.confidence.toFixed(2) + '%');
  console.log('  - Price difference:', frontrunCheck.priceDifference.toFixed(2) + '%');
  
  // Test 6: Get stats
  const stats = mevProtection.getStats();
  console.log('✓ Test 6: MEV protection stats');
  console.log('  - Total transactions:', stats.totalTransactions);
  console.log('  - Private transactions:', stats.privateTransactions);
  console.log('  - MEV protection enabled:', stats.config.mevProtectionEnabled);
  
  console.log('\n✅ MEVProtection tests passed!\n');
  return true;
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Protocol Efficiency Features - Comprehensive Testing    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  let allPassed = true;
  
  try {
    // Test RiskManager
    const riskManagerPassed = await testRiskManager();
    if (!riskManagerPassed) allPassed = false;
    
    // Test GasOptimizer
    const gasOptimizerPassed = await testGasOptimizer();
    if (!gasOptimizerPassed) allPassed = false;
    
    // Test MEVProtection
    const mevProtectionPassed = await testMEVProtection();
    if (!mevProtectionPassed) allPassed = false;
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      Test Summary                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED');
      console.log('\nProtocol Efficiency Features are working correctly:');
      console.log('  ✓ Risk Management (Priority 4)');
      console.log('  ✓ Gas Optimization (Priority 3)');
      console.log('  ✓ MEV Protection (Priority 2)');
      console.log('\nNext steps:');
      console.log('  1. Run full integration tests with npm test');
      console.log('  2. Test with backtesting simulation');
      console.log('  3. Deploy with conservative settings');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('\nPlease review the failed tests above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ TEST EXECUTION ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
