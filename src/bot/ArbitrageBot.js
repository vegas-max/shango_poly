// Main ArbitrageBot - Orchestrates all layers from EXECUTION to DATA FETCH
const { ethers } = require('ethers');
const FlashLoanExecutor = require('./FlashLoanExecutor');
const FlashLoanCalculator = require('./FlashLoanCalculator');
const OpportunityScanner = require('./OpportunityScanner');
const logger = require('../utils/logger');
const { getInstance: getRustEngineManager } = require('../utils/RustEngineManager');
const RiskManager = require('../utils/RiskManager');
const GasOptimizer = require('../utils/GasOptimizer');
const MEVProtection = require('../utils/MEVProtection');

class ArbitrageBot {
  constructor(config) {
    this.config = config;
    this.executor = null;
    this.calculator = null;
    this.scanner = null;
    this.dexInterface = null;
    this.priceOracle = null;
    this.rustEngines = null;
    
    // High-Priority Protocol Efficiency Modules
    this.riskManager = null;
    this.gasOptimizer = null;
    this.mevProtection = null;
    
    this.isRunning = false;
    this.opportunities = [];
    this.executionStats = {
      scanned: 0,
      detected: 0,
      validated: 0,
      simulated: 0,
      simulationFailed: 0,
      executed: 0,
      failed: 0,
      blockedByRisk: 0,
      blockedByGas: 0,
      mevProtected: 0
    };
  }

  /**
   * Initialize all bot components (backwards: Execution -> Data Fetch)
   */
  async initialize(provider, dexInterface, priceOracle, aaveProvider) {
    logger.info('Initializing ArbitrageBot with backward architecture');

    // Initialize Rust Twin Turbo Engines
    this.rustEngines = getRustEngineManager();
    const rustEnabled = await this.rustEngines.initialize({
      minProfitBps: this.config.minProfitBps,
      lightweight: process.env.LIGHTWEIGHT_MODE === 'true'
    });

    if (rustEnabled) {
      logger.info('🦀 Twin Turbo Rust Engines active!');
    }

    // Initialize High-Priority Protocol Efficiency Modules
    logger.info('🚀 Initializing Protocol Efficiency Features...');
    
    // Priority 4: Risk Management
    this.riskManager = new RiskManager({
      dailyLossLimitEth: parseFloat(process.env.DAILY_LOSS_LIMIT_ETH || '0.5'),
      maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES || '5'),
      maxDrawdownPercent: parseFloat(process.env.MAX_DRAWDOWN_PERCENT || '10'),
      minBalanceEth: parseFloat(process.env.MIN_BALANCE_ETH || '1.0')
    });
    
    // Get initial balance and initialize risk manager
    try {
      const balance = await provider.getBalance(this.config.walletAddress || this.config.privateKey);
      this.riskManager.initialize(balance);
      logger.info('✅ Risk Manager initialized');
    } catch (error) {
      logger.warn('Could not get balance for risk manager, using default');
    }

    // Priority 3: Gas Optimization
    this.gasOptimizer = new GasOptimizer(provider, {
      maxGasPriceGwei: this.config.maxGasPriceGwei,
      targetGasPriceGwei: parseFloat(process.env.TARGET_GAS_PRICE_GWEI || '100'),
      peakHourGasMultiplier: parseFloat(process.env.PEAK_HOUR_GAS_MULTIPLIER || '1.5')
    });
    logger.info('✅ Gas Optimizer initialized');

    // Priority 2: MEV Protection
    this.mevProtection = new MEVProtection({
      usePrivateTransactions: process.env.USE_PRIVATE_TRANSACTIONS === 'true',
      flashbotsRpcUrl: process.env.FLASHBOTS_RPC_URL || null,
      bundleTransactions: process.env.BUNDLE_TRANSACTIONS === 'true',
      minTimeBetweenTrades: parseInt(process.env.MIN_TIME_BETWEEN_TRADES || '30000')
    });
    logger.info('✅ MEV Protection initialized');

    // Layer 7: EXECUTION
    this.executor = new FlashLoanExecutor(
      provider,
      this.config.contractAddress,
      this.config.privateKey
    );
    await this.executor.initialize(this.config.contractABI);

    // Layer 4: CALCULATION
    this.calculator = new FlashLoanCalculator(aaveProvider);

    // Layer 3: ROUTING (passed in)
    this.dexInterface = dexInterface;

    // Layer 2: PRICE AGGREGATION (passed in)
    this.priceOracle = priceOracle;

    // Layer 1: DATA FETCH
    this.scanner = new OpportunityScanner(
      this.dexInterface,
      this.priceOracle,
      this.config
    );

    logger.info('ArbitrageBot initialized successfully with protocol efficiency features');
  }

  /**
   * Start the arbitrage bot
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting ArbitrageBot');

    // Start scanning with opportunity handler
    await this.scanner.startScanning(async (opportunity) => {
      await this.handleOpportunity(opportunity);
    });
  }

  /**
   * Stop the arbitrage bot
   */
  async stop() {
    this.isRunning = false;
    this.scanner.stopScanning();
    logger.info('ArbitrageBot stopped');
  }

  /**
   * Handle discovered opportunity - flows BACKWARD through layers
   * ENHANCED: With Protocol Efficiency Features (Risk Management, Gas Optimization, MEV Protection)
   * @param {Object} opportunity - Discovered opportunity from scanner
   */
  async handleOpportunity(opportunity) {
    logger.info('Processing opportunity', { opportunity });
    this.executionStats.detected++;

    try {
      // PROTOCOL EFFICIENCY: Reset daily stats if new day
      if (this.riskManager) {
        this.riskManager.resetDailyStats();
      }

      // PROTOCOL EFFICIENCY: Priority 4 - Check risk management limits
      if (this.riskManager) {
        const riskCheck = this.riskManager.canTrade();
        if (!riskCheck.allowed) {
          logger.warn('Trade blocked by risk manager', { reason: riskCheck.reason });
          this.executionStats.blockedByRisk++;
          return;
        }
      }

      // Use Rust engine for duplicate detection if available
      if (this.rustEngines && this.rustEngines.isAvailable()) {
        const oppKey = `${opportunity.path.join('-')}|${opportunity.dexes.join('-')}`;
        if (this.rustEngines.checkDuplicate(oppKey)) {
          logger.debug('Duplicate opportunity filtered by Rust engine');
          return;
        }
      }

      // LAYER 1: Validate opportunity (DATA FETCH layer confirms)
      const validation = await this.scanner.validateOpportunity(opportunity);
      if (!validation.valid) {
        logger.info('Opportunity invalid', { reason: validation.reason });
        return;
      }
      this.executionStats.validated++;

      // LAYER 4: Calculate optimal flash loan (CALCULATION)
      const loanDetails = await this.calculator.calculateOptimalLoan(
        opportunity.path[0],
        opportunity
      );

      // LAYER 4: Calculate expected profit
      const profitCalc = this.calculator.calculateProfit(
        loanDetails.amount,
        opportunity.profitBps
      );

      if (!profitCalc.profitable) {
        logger.info('Not profitable after fees', { profitCalc });
        return;
      }

      // PROTOCOL EFFICIENCY: Priority 3 - Get optimal gas price and check if we should trade
      const gasInfo = this.gasOptimizer 
        ? await this.gasOptimizer.getOptimalGasPrice()
        : { gasPrice: await this.executor.provider.getGasPrice(), shouldTrade: true };

      if (!gasInfo.shouldTrade) {
        logger.info('Trade blocked by gas optimizer', { reason: gasInfo.reason });
        this.executionStats.blockedByGas++;
        return;
      }

      const gasPrice = gasInfo.gasPrice;

      // LAYER 6: Build transaction parameters
      const gasLimit = await this.executor.estimateGas({
        asset: loanDetails.asset,
        amount: loanDetails.amount,
        path: opportunity.path,
        dexes: opportunity.dexes
      });

      // PROTOCOL EFFICIENCY: Priority 3 - Check profitability after gas costs
      if (this.gasOptimizer) {
        const profitCheck = this.gasOptimizer.checkProfitabilityAfterGas(
          profitCalc.netProfit,
          gasPrice,
          gasLimit.toNumber()
        );
        
        if (!profitCheck.profitable) {
          logger.info('Not profitable after gas costs', {
            expectedProfit: profitCheck.expectedProfit.toString(),
            gasCost: profitCheck.gasCost.toString(),
            netProfit: profitCheck.netProfit.toString()
          });
          return;
        }
      }

      // LAYER 7: EXECUTE the flash loan arbitrage
      let executionParams = {
        asset: loanDetails.asset,
        amount: loanDetails.amount,
        path: opportunity.path,
        dexes: opportunity.dexes,
        gasPrice,
        gasLimit,
        expectedProfit: profitCalc.netProfit,
        slippageTolerance: validation.opportunity.slippageTolerance
      };

      // PROTOCOL EFFICIENCY: Priority 2 - Apply MEV protection
      if (this.mevProtection) {
        executionParams = await this.mevProtection.prepareProtectedTransaction(executionParams);
        if (executionParams.flashbots) {
          this.executionStats.mevProtected++;
          logger.info('MEV protection applied to transaction');
        }
      }

      // SIMULATE transaction before broadcasting
      logger.info('Step 1: Simulating transaction...');
      const simulation = await this.executor.simulateTransaction(executionParams);
      this.executionStats.simulated++;
      
      if (!simulation.success) {
        logger.warn('Transaction simulation failed - skipping execution', {
          reason: simulation.reason,
          error: simulation.error
        });
        this.executionStats.simulationFailed++;
        
        // Record failed simulation as failed trade for risk management
        if (this.riskManager) {
          const currentBalance = await this.executor.provider.getBalance(
            this.executor.wallet.address
          );
          this.riskManager.recordTrade(false, profitCalc.netProfit.mul(-1), currentBalance);
        }
        
        return;
      }

      logger.info('Step 2: Simulation passed - proceeding with broadcast');
      const result = await this.executor.execute(executionParams);

      // Get updated balance for risk management
      const currentBalance = await this.executor.provider.getBalance(
        this.executor.wallet.address
      );

      if (result.success) {
        logger.info('Arbitrage executed successfully', {
          hash: result.hash,
          gasUsed: result.gasUsed.toString()
        });
        this.executionStats.executed++;
        
        // Record successful trade
        if (this.riskManager) {
          this.riskManager.recordTrade(true, profitCalc.netProfit, currentBalance);
        }
        
        this.opportunities.push({
          ...opportunity,
          timestamp: Date.now(),
          bot: 'Shango Poly',
          result
        });
      } else {
        logger.error('Arbitrage execution failed', { error: result.error });
        this.executionStats.failed++;
        
        // Record failed trade
        if (this.riskManager) {
          // Estimate loss as gas cost
          const gasCost = gasPrice.mul(gasLimit);
          this.riskManager.recordTrade(false, gasCost.mul(-1), currentBalance);
        }
      }
    } catch (error) {
      logger.error('Error handling opportunity', { error: error.message });
      this.executionStats.failed++;
      
      // Record error as failed trade
      if (this.riskManager) {
        try {
          const currentBalance = await this.executor.provider.getBalance(
            this.executor.wallet.address
          );
          this.riskManager.recordTrade(false, ethers.BigNumber.from(0), currentBalance);
        } catch (balanceError) {
          logger.error('Could not update risk manager after error', { 
            error: balanceError.message 
          });
        }
      }
    }
  }
  }

  /**
   * Get optimal gas price based on network conditions
   * @returns {BigNumber} Gas price in wei
   */
  async getOptimalGasPrice() {
    const { ethers } = require('ethers');
    const gasPrice = await this.executor.provider.getGasPrice();
    
    // Add 10% to be competitive
    const adjustedPrice = gasPrice.mul(110).div(100);
    
    // Cap at max gas price from config
    const maxGasPrice = ethers.utils.parseUnits(
      this.config.maxGasPriceGwei.toString(),
      'gwei'
    );

    return adjustedPrice.gt(maxGasPrice) ? maxGasPrice : adjustedPrice;
  }

  /**
   * Get execution statistics (enhanced with protocol efficiency metrics)
   */
  getStats() {
    const baseStats = {
      ...this.executionStats,
      opportunities: this.opportunities.length,
      successRate: this.executionStats.validated > 0 
        ? (this.executionStats.executed / this.executionStats.validated) * 100 
        : 0
    };

    // Add Rust engine stats if available
    if (this.rustEngines && this.rustEngines.isAvailable()) {
      baseStats.rustEngines = this.rustEngines.getStats();
    }

    // Add Protocol Efficiency stats
    if (this.riskManager) {
      baseStats.riskManagement = this.riskManager.getStats();
    }
    
    if (this.gasOptimizer) {
      baseStats.gasOptimization = this.gasOptimizer.getStats();
    }
    
    if (this.mevProtection) {
      baseStats.mevProtection = this.mevProtection.getStats();
    }

    return baseStats;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.executionStats = {
      scanned: 0,
      detected: 0,
      validated: 0,
      simulated: 0,
      simulationFailed: 0,
      executed: 0,
      failed: 0,
      blockedByRisk: 0,
      blockedByGas: 0,
      mevProtected: 0
    };
    this.opportunities = [];
  }

  /**
   * Increment scan counter
   */
  incrementScanCount() {
    this.executionStats.scanned++;
  }
}

module.exports = ArbitrageBot;
