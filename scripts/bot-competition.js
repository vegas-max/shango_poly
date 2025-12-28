#!/usr/bin/env node
// Bot Competition Script - Runs 30 rounds comparing Shango Poly vs TITAN 2.0

require('dotenv').config();
const { ethers } = require('ethers');
const ArbitrageBot = require('../src/bot/ArbitrageBot');
const TitanBot = require('../src/bot/TitanBot');
const DexInterface = require('../src/dex/DexInterface');
const PriceOracle = require('../src/oracle/PriceOracle');
const QuickSwapDex = require('../src/dex/QuickSwapDex');
const SushiSwapDex = require('../src/dex/SushiSwapDex');
const config = require('../config');
const logger = require('../src/utils/logger');
const fs = require('fs');

// Competition configuration
const COMPETITION_ROUNDS = 30;
const ROUND_DURATION_MS = 10000; // 10 seconds per round
const RESULTS_FILE = './competition-results.json';

class BotCompetition {
  constructor() {
    this.shangoBot = null;
    this.titanBot = null;
    this.results = {
      metadata: {
        startTime: null,
        endTime: null,
        rounds: COMPETITION_ROUNDS,
        roundDuration: ROUND_DURATION_MS
      },
      rounds: [],
      overall: {
        shango: {},
        titan: {}
      }
    };
  }

  async initialize() {
    logger.info('='.repeat(80));
    logger.info('BOT COMPETITION: Shango Poly vs TITAN 2.0');
    logger.info('='.repeat(80));
    logger.info(`Rounds: ${COMPETITION_ROUNDS}`);
    logger.info(`Round Duration: ${ROUND_DURATION_MS / 1000} seconds`);
    logger.info('='.repeat(80));

    // Initialize provider
    logger.info('Connecting to Polygon network...');
    const provider = new ethers.providers.JsonRpcProvider(
      config.network.rpcUrl || 'https://polygon-rpc.com'
    );

    try {
      const network = await provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
      logger.warn('Could not verify network connection, continuing anyway...');
    }

    // Initialize shared components
    logger.info('Initializing shared DEX Interface...');
    const dexInterface = new DexInterface();
    
    const quickswap = new QuickSwapDex(provider, config.dexes.quickswap);
    const sushiswap = new SushiSwapDex(provider, config.dexes.sushiswap);
    
    dexInterface.registerDex('quickswap', quickswap);
    dexInterface.registerDex('sushiswap', sushiswap);

    logger.info('Initializing shared Price Oracle...');
    const priceOracle = new PriceOracle(provider);

    // Mock Aave provider
    const aaveProvider = {
      getReserveData: async (asset) => ({
        availableLiquidity: ethers.utils.parseUnits('1000000', 18)
      })
    };

    // Initialize Shango Poly Bot
    logger.info('Initializing Shango Poly Bot...');
    const shangoConfig = {
      ...config.trading,
      privateKey: config.security.privateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
      contractAddress: '0x0000000000000000000000000000000000000000',
      contractABI: []
    };
    this.shangoBot = new ArbitrageBot(shangoConfig);
    await this.shangoBot.initialize(provider, dexInterface, priceOracle, aaveProvider);

    // Initialize TITAN 2.0 Bot
    logger.info('Initializing TITAN 2.0 Bot...');
    const titanConfig = {
      ...config.trading,
      privateKey: config.security.privateKey || '0x0000000000000000000000000000000000000000000000000000000000000001'
    };
    this.titanBot = new TitanBot(titanConfig);
    await this.titanBot.initialize(provider, dexInterface, priceOracle);

    logger.info('Both bots initialized successfully!');
    logger.info('');
  }

  async runRound(roundNumber) {
    logger.info('='.repeat(80));
    logger.info(`ROUND ${roundNumber}/${COMPETITION_ROUNDS}`);
    logger.info('='.repeat(80));

    // Reset stats for this round
    this.shangoBot.resetStats();
    this.titanBot.resetStats();

    const roundStartTime = Date.now();

    // Start both bots
    logger.info('Starting Shango Poly...');
    const shangoPromise = this.runBotForDuration(this.shangoBot, ROUND_DURATION_MS);
    
    logger.info('Starting TITAN 2.0...');
    const titanPromise = this.runBotForDuration(this.titanBot, ROUND_DURATION_MS);

    // Wait for both to complete
    await Promise.all([shangoPromise, titanPromise]);

    const roundEndTime = Date.now();

    // Collect round results
    const shangoStats = this.shangoBot.getStats();
    const titanStats = this.titanBot.getStats();

    const roundResult = {
      round: roundNumber,
      duration: roundEndTime - roundStartTime,
      shango: shangoStats,
      titan: titanStats,
      winner: this.determineRoundWinner(shangoStats, titanStats)
    };

    this.results.rounds.push(roundResult);

    // Display round results
    this.displayRoundResults(roundNumber, roundResult);

    logger.info('');
    
    // Small delay between rounds
    await this.sleep(2000);
  }

  async runBotForDuration(bot, duration) {
    return new Promise(async (resolve) => {
      // Start the bot
      const startPromise = bot.start();
      
      // Stop after duration
      setTimeout(async () => {
        await bot.stop();
        resolve();
      }, duration);
    });
  }

  determineRoundWinner(shangoStats, titanStats) {
    // Scoring system:
    // - Detected opportunities: 1 point each
    // - Validated opportunities: 2 points each
    // - Executed trades: 5 points each
    
    const shangoScore = 
      shangoStats.detected * 1 + 
      shangoStats.validated * 2 + 
      shangoStats.executed * 5;
    
    const titanScore = 
      titanStats.detected * 1 + 
      titanStats.validated * 2 + 
      titanStats.executed * 5;

    if (shangoScore > titanScore) return 'Shango Poly';
    if (titanScore > shangoScore) return 'TITAN 2.0';
    return 'Tie';
  }

  displayRoundResults(roundNumber, result) {
    logger.info('');
    logger.info(`Round ${roundNumber} Results:`);
    logger.info('-'.repeat(80));
    
    logger.info('Shango Poly:');
    logger.info(`  Scans: ${result.shango.scanned}`);
    logger.info(`  Detected: ${result.shango.detected}`);
    logger.info(`  Validated: ${result.shango.validated}`);
    logger.info(`  Executed: ${result.shango.executed}`);
    logger.info(`  Success Rate: ${result.shango.successRate.toFixed(2)}%`);
    
    logger.info('');
    logger.info('TITAN 2.0:');
    logger.info(`  Scans: ${result.titan.scanned}`);
    logger.info(`  Detected: ${result.titan.detected}`);
    logger.info(`  Validated: ${result.titan.validated}`);
    logger.info(`  Executed: ${result.titan.executed}`);
    logger.info(`  Success Rate: ${result.titan.successRate.toFixed(2)}%`);
    
    logger.info('');
    logger.info(`Winner: ${result.winner}`);
    logger.info('-'.repeat(80));
  }

  calculateOverallResults() {
    let shangoWins = 0;
    let titanWins = 0;
    let ties = 0;

    const shangoTotals = {
      scanned: 0,
      detected: 0,
      validated: 0,
      executed: 0,
      failed: 0
    };

    const titanTotals = {
      scanned: 0,
      detected: 0,
      validated: 0,
      executed: 0
    };

    for (const round of this.results.rounds) {
      if (round.winner === 'Shango Poly') shangoWins++;
      else if (round.winner === 'TITAN 2.0') titanWins++;
      else ties++;

      // Accumulate totals
      shangoTotals.scanned += round.shango.scanned;
      shangoTotals.detected += round.shango.detected;
      shangoTotals.validated += round.shango.validated;
      shangoTotals.executed += round.shango.executed;
      shangoTotals.failed += round.shango.failed || 0;

      titanTotals.scanned += round.titan.scanned;
      titanTotals.detected += round.titan.detected;
      titanTotals.validated += round.titan.validated;
      titanTotals.executed += round.titan.executed;
    }

    this.results.overall = {
      shango: {
        wins: shangoWins,
        ...shangoTotals,
        avgSuccessRate: shangoTotals.validated > 0 
          ? (shangoTotals.executed / shangoTotals.validated) * 100 
          : 0
      },
      titan: {
        wins: titanWins,
        ...titanTotals,
        avgSuccessRate: titanTotals.validated > 0 
          ? (titanTotals.executed / titanTotals.validated) * 100 
          : 0
      },
      ties,
      overallWinner: shangoWins > titanWins ? 'Shango Poly' : 
                     titanWins > shangoWins ? 'TITAN 2.0' : 'Tie'
    };
  }

  displayFinalResults() {
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('FINAL COMPETITION RESULTS');
    logger.info('='.repeat(80));
    
    const overall = this.results.overall;
    
    logger.info('');
    logger.info('OVERALL WINNER: ' + overall.overallWinner);
    logger.info('');
    logger.info('-'.repeat(80));
    
    logger.info('Shango Poly (Backward Architecture):');
    logger.info(`  Round Wins: ${overall.shango.wins}/${COMPETITION_ROUNDS}`);
    logger.info(`  Total Scans: ${overall.shango.scanned}`);
    logger.info(`  Total Detected: ${overall.shango.detected}`);
    logger.info(`  Total Validated: ${overall.shango.validated}`);
    logger.info(`  Total Executed: ${overall.shango.executed}`);
    logger.info(`  Total Failed: ${overall.shango.failed}`);
    logger.info(`  Avg Success Rate: ${overall.shango.avgSuccessRate.toFixed(2)}%`);
    
    logger.info('');
    logger.info('TITAN 2.0 (Forward Architecture):');
    logger.info(`  Round Wins: ${overall.titan.wins}/${COMPETITION_ROUNDS}`);
    logger.info(`  Total Scans: ${overall.titan.scanned}`);
    logger.info(`  Total Detected: ${overall.titan.detected}`);
    logger.info(`  Total Validated: ${overall.titan.validated}`);
    logger.info(`  Total Executed: ${overall.titan.executed}`);
    logger.info(`  Avg Success Rate: ${overall.titan.avgSuccessRate.toFixed(2)}%`);
    
    logger.info('');
    logger.info(`Ties: ${overall.ties}`);
    logger.info('-'.repeat(80));
    
    // Provide recommendation
    logger.info('');
    logger.info('PRODUCTION RECOMMENDATION:');
    if (overall.overallWinner === 'Shango Poly') {
      logger.info('✓ Shango Poly is recommended for production deployment');
      logger.info('  Reasons:');
      logger.info(`  - Won ${overall.shango.wins} out of ${COMPETITION_ROUNDS} rounds`);
      logger.info(`  - Higher validation rate and execution success`);
      logger.info('  - More thorough opportunity analysis');
    } else if (overall.overallWinner === 'TITAN 2.0') {
      logger.info('✓ TITAN 2.0 is recommended for production deployment');
      logger.info('  Reasons:');
      logger.info(`  - Won ${overall.titan.wins} out of ${COMPETITION_ROUNDS} rounds`);
      logger.info('  - Faster execution with forward architecture');
      logger.info('  - Simpler codebase for maintenance');
    } else {
      logger.info('≈ Both systems performed equally - choose based on other factors:');
      logger.info('  - Shango Poly: More thorough, complex architecture');
      logger.info('  - TITAN 2.0: Faster, simpler architecture');
    }
    
    logger.info('');
    logger.info('='.repeat(80));
  }

  saveResults() {
    try {
      fs.writeFileSync(
        RESULTS_FILE, 
        JSON.stringify(this.results, null, 2)
      );
      logger.info(`Results saved to ${RESULTS_FILE}`);
    } catch (error) {
      logger.error('Failed to save results', { error: error.message });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.initialize();
      
      this.results.metadata.startTime = new Date().toISOString();

      // Run all rounds
      for (let i = 1; i <= COMPETITION_ROUNDS; i++) {
        await this.runRound(i);
      }

      this.results.metadata.endTime = new Date().toISOString();

      // Calculate and display final results
      this.calculateOverallResults();
      this.displayFinalResults();
      
      // Save results to file
      this.saveResults();

    } catch (error) {
      logger.error('Competition failed', { error: error.message, stack: error.stack });
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('');
  logger.info('Competition interrupted. Shutting down...');
  process.exit(0);
});

// Run the competition
const competition = new BotCompetition();
competition.run().then(() => {
  logger.info('Competition completed successfully!');
  process.exit(0);
}).catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
