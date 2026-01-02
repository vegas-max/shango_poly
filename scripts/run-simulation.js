#!/usr/bin/env node
// Backtesting Simulation Runner - Runs comprehensive 90-180 day simulation

require('dotenv').config();
const { ethers } = require('ethers');
const BacktestingEngine = require('../src/simulation/BacktestingEngine');
const MarketDataProvider = require('../src/simulation/MarketDataProvider');
const ReportGenerator = require('../src/simulation/ReportGenerator');
const ArbitrageBot = require('../src/bot/ArbitrageBot');
const DexInterface = require('../src/dex/DexInterface');
const PriceOracle = require('../src/oracle/PriceOracle');
const QuickSwapDex = require('../src/dex/QuickSwapDex');
const SushiSwapDex = require('../src/dex/SushiSwapDex');
const config = require('../config');
const logger = require('../src/utils/logger');
const fs = require('fs');

// Simulation configuration
const SIMULATION_DAYS = parseInt(process.env.SIMULATION_DAYS || '90'); // Default 90 days
const STARTING_BALANCE_ETH = process.env.STARTING_BALANCE_ETH || '10';
const REPORT_FILE = 'simulation-results.json';
const CSV_FILE = 'simulation-daily-results.csv';

class SimulationRunner {
  constructor() {
    this.bot = null;
    this.engine = null;
    this.marketDataProvider = null;
    this.provider = null;
  }

  /**
   * Initialize all components
   */
  async initialize() {
    logger.info('='.repeat(100));
    logger.info('SHANGO POLY - COMPREHENSIVE BACKTESTING SIMULATION'.padStart(70));
    logger.info('='.repeat(100));
    logger.info('');
    logger.info('This simulation will run a comprehensive backtest of the arbitrage system');
    logger.info('over a specified period to provide an HONEST assessment of profitability.');
    logger.info('');
    logger.info('The simulation includes:');
    logger.info('  • Realistic market conditions (bull/bear/consolidation/crisis cycles)');
    logger.info('  • Gas costs, slippage, and MEV competition');
    logger.info('  • Daily, weekly, and monthly profitability tracking');
    logger.info('  • Comprehensive risk analysis');
    logger.info('  • Honest conclusions about system viability');
    logger.info('');
    logger.info('='.repeat(100));
    logger.info('');

    // Initialize provider
    logger.info('Initializing blockchain provider...');
    this.provider = new ethers.providers.JsonRpcProvider(
      config.network.rpcUrl || 'https://polygon-rpc.com'
    );

    try {
      const network = await this.provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
      logger.warn('Could not verify network connection, continuing with simulation...');
    }

    // Initialize DEX Interface
    logger.info('Initializing DEX Interface...');
    const dexInterface = new DexInterface();
    
    const quickswap = new QuickSwapDex(this.provider, config.dexes.quickswap);
    const sushiswap = new SushiSwapDex(this.provider, config.dexes.sushiswap);
    
    dexInterface.registerDex('quickswap', quickswap);
    dexInterface.registerDex('sushiswap', sushiswap);

    // Initialize Price Oracle
    logger.info('Initializing Price Oracle...');
    const priceOracle = new PriceOracle(this.provider);

    // Mock Aave provider
    const aaveProvider = {
      getReserveData: async (asset) => ({
        availableLiquidity: ethers.utils.parseUnits('1000000', 18)
      })
    };

    // Initialize bot
    logger.info('Initializing Arbitrage Bot...');
    const botConfig = {
      ...config.trading,
      privateKey: config.security.privateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
      contractAddress: '0x0000000000000000000000000000000000000000',
      contractABI: []
    };

    this.bot = new ArbitrageBot(botConfig);
    await this.bot.initialize(this.provider, dexInterface, priceOracle, aaveProvider);

    // Initialize backtesting engine
    const engineConfig = {
      startingBalanceEth: STARTING_BALANCE_ETH,
      minProfitBps: config.trading.minProfitBps,
      maxGasPriceGwei: config.trading.maxGasPriceGwei,
      baseTokens: config.trading.baseTokens.map(t => t.symbol || t),
      intermediateTokens: config.trading.intermediateTokens.map(t => t.symbol || t),
      simulationDays: SIMULATION_DAYS
    };

    this.engine = new BacktestingEngine(engineConfig);

    // Calculate simulation period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - SIMULATION_DAYS);

    // Initialize market data provider
    this.marketDataProvider = new MarketDataProvider(this.provider, {
      startDate: startDate,
      endDate: endDate
    });

    await this.engine.initialize(startDate, endDate);

    logger.info('');
    logger.info('Market Simulation Phases:');
    const phases = this.marketDataProvider.getMarketPhasesSummary();
    phases.forEach(phase => {
      logger.info(`  • ${phase.name} (${phase.duration} days): ${phase.description}`);
    });
    logger.info('');
    logger.info('All components initialized successfully!');
    logger.info('');

    return engineConfig;
  }

  /**
   * Run the simulation
   */
  async run() {
    try {
      const engineConfig = await this.initialize();

      logger.info('='.repeat(100));
      logger.info('STARTING SIMULATION...');
      logger.info('='.repeat(100));
      logger.info('');
      logger.info('⏳ This may take a few minutes depending on the simulation period...');
      logger.info('');

      // Run the simulation
      const results = await this.engine.runSimulation(this.bot, this.marketDataProvider);

      logger.info('');
      logger.info('='.repeat(100));
      logger.info('SIMULATION COMPLETE - GENERATING REPORT');
      logger.info('='.repeat(100));
      logger.info('');

      // Generate and display report
      const reporter = new ReportGenerator(results, engineConfig);
      reporter.displayReport();

      // Save results
      logger.info('💾 Saving Results...');
      logger.info('');
      await reporter.saveReport(REPORT_FILE);
      await reporter.saveDailyCSV(CSV_FILE);

      logger.info('');
      logger.info('='.repeat(100));
      logger.info('SIMULATION COMPLETED SUCCESSFULLY');
      logger.info('='.repeat(100));
      logger.info('');
      logger.info('Files generated:');
      logger.info(`  • ${REPORT_FILE} - Full JSON report with all data`);
      logger.info(`  • ${CSV_FILE} - Daily results in CSV format for analysis`);
      logger.info('');
      logger.info('Next Steps:');
      logger.info('  1. Review the honest assessment and conclusions above');
      logger.info('  2. Implement the recommended improvements');
      logger.info('  3. Re-run simulation to verify improvements');
      logger.info('  4. If viable, test with minimal capital in production');
      logger.info('  5. Monitor real results closely and adjust strategy');
      logger.info('');
      logger.info('='.repeat(100));

      return results;

    } catch (error) {
      logger.error('Simulation failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('');
  logger.info('Simulation interrupted. Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('');
  logger.info('Simulation terminated. Shutting down...');
  process.exit(0);
});

// Display usage if needed
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('');
  console.log('Shango Poly - Backtesting Simulation');
  console.log('=====================================');
  console.log('');
  console.log('Usage: node scripts/run-simulation.js [options]');
  console.log('');
  console.log('Environment Variables:');
  console.log('  SIMULATION_DAYS         Number of days to simulate (default: 90)');
  console.log('  STARTING_BALANCE_ETH    Starting balance in ETH (default: 10)');
  console.log('  MIN_PROFIT_BPS          Minimum profit in basis points (default: 50)');
  console.log('  MAX_GAS_PRICE_GWEI      Maximum gas price in Gwei (default: 150)');
  console.log('');
  console.log('Examples:');
  console.log('  # Run 90-day simulation (default)');
  console.log('  node scripts/run-simulation.js');
  console.log('');
  console.log('  # Run 180-day simulation with 20 ETH starting balance');
  console.log('  SIMULATION_DAYS=180 STARTING_BALANCE_ETH=20 node scripts/run-simulation.js');
  console.log('');
  console.log('  # Run 30-day simulation with custom parameters');
  console.log('  SIMULATION_DAYS=30 MIN_PROFIT_BPS=100 node scripts/run-simulation.js');
  console.log('');
  process.exit(0);
}

// Run the simulation
logger.info('');
const runner = new SimulationRunner();
runner.run().then(() => {
  logger.info('Simulation runner exiting...');
  process.exit(0);
}).catch(error => {
  logger.error('Unhandled error in simulation:', error);
  process.exit(1);
});
