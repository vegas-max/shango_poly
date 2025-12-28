// Simple test to verify backward architecture
const DexInterface = require('../src/dex/DexInterface');
const PriceOracle = require('../src/oracle/PriceOracle');
const FlashLoanCalculator = require('../src/bot/FlashLoanCalculator');
const OpportunityScanner = require('../src/bot/OpportunityScanner');
const { ethers } = require('ethers');

console.log('Testing Backward Architecture...\n');

// Mock provider
const mockProvider = {
  getGasPrice: async () => ethers.utils.parseUnits('30', 'gwei'),
  getNetwork: async () => ({ name: 'polygon', chainId: 137 })
};

// Mock DEX
class MockDex {
  async getQuote(tokenIn, tokenOut, amountIn) {
    // Simulate 1% profit
    const amountOut = amountIn.mul(101).div(100);
    return {
      amountOut,
      path: [tokenIn, tokenOut],
      priceImpact: 50,
      dex: 'mock'
    };
  }
}

async function test() {
  try {
    // Layer 3: ROUTING
    console.log('✓ Layer 3: ROUTING - DexInterface');
    const dexInterface = new DexInterface();
    dexInterface.registerDex('mock', new MockDex());
    
    // Layer 2: PRICE AGGREGATION
    console.log('✓ Layer 2: PRICE AGGREGATION - PriceOracle');
    const priceOracle = new PriceOracle(mockProvider);
    
    // Layer 4: CALCULATION
    console.log('✓ Layer 4: CALCULATION - FlashLoanCalculator');
    const mockAaveProvider = {
      getReserveData: async (asset) => ({
        availableLiquidity: ethers.utils.parseUnits('1000000', 18)
      })
    };
    const calculator = new FlashLoanCalculator(mockAaveProvider);
    
    // Layer 1: DATA FETCH
    console.log('✓ Layer 1: DATA FETCH - OpportunityScanner');
    const config = {
      minProfitBps: 50,
      scanIntervalMs: 5000,
      baseTokens: ['0x0000000000000000000000000000000000000001'],
      intermediateTokens: ['0x0000000000000000000000000000000000000002'],
      defaultAmount: 1000
    };
    const scanner = new OpportunityScanner(dexInterface, priceOracle, config);
    
    console.log('\n✅ All layers initialized successfully!');
    console.log('\nBackward Data Flow Architecture:');
    console.log('  Layer 7: EXECUTION         → FlashLoanExecutor');
    console.log('  Layer 6: TRANSACTION       → Transaction builder');
    console.log('  Layer 5: VALIDATION        → Opportunity validator');
    console.log('  Layer 4: CALCULATION       → FlashLoanCalculator ✓');
    console.log('  Layer 3: ROUTING           → DexInterface ✓');
    console.log('  Layer 2: PRICE AGGREGATION → PriceOracle ✓');
    console.log('  Layer 1: DATA FETCH        → OpportunityScanner ✓');
    
    console.log('\n✅ Architecture test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
