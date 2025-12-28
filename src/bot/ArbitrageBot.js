// Main ArbitrageBot - Orchestrates all layers from EXECUTION to DATA FETCH
const FlashLoanExecutor = require('./FlashLoanExecutor');
const FlashLoanCalculator = require('./FlashLoanCalculator');
const OpportunityScanner = require('./OpportunityScanner');
const logger = require('../utils/logger');

class ArbitrageBot {
  constructor(config) {
    this.config = config;
    this.executor = null;
    this.calculator = null;
    this.scanner = null;
    this.dexInterface = null;
    this.priceOracle = null;
    this.isRunning = false;
  }

  /**
   * Initialize all bot components (backwards: Execution -> Data Fetch)
   */
  async initialize(provider, dexInterface, priceOracle, aaveProvider) {
    logger.info('Initializing ArbitrageBot with backward architecture');

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

    logger.info('ArbitrageBot initialized successfully');
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
   * @param {Object} opportunity - Discovered opportunity from scanner
   */
  async handleOpportunity(opportunity) {
    logger.info('Processing opportunity', { opportunity });

    try {
      // LAYER 1: Validate opportunity (DATA FETCH layer confirms)
      const validation = await this.scanner.validateOpportunity(opportunity);
      if (!validation.valid) {
        logger.info('Opportunity invalid', { reason: validation.reason });
        return;
      }

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

      // LAYER 6: Build transaction parameters
      const gasPrice = await this.getOptimalGasPrice();
      const gasLimit = await this.executor.estimateGas({
        asset: loanDetails.asset,
        amount: loanDetails.amount,
        path: opportunity.path,
        dexes: opportunity.dexes
      });

      // LAYER 7: EXECUTE the flash loan arbitrage
      const executionParams = {
        asset: loanDetails.asset,
        amount: loanDetails.amount,
        path: opportunity.path,
        dexes: opportunity.dexes,
        gasPrice,
        gasLimit,
        expectedProfit: profitCalc.netProfit
      };

      const result = await this.executor.execute(executionParams);

      if (result.success) {
        logger.info('Arbitrage executed successfully', {
          hash: result.hash,
          gasUsed: result.gasUsed.toString()
        });
      } else {
        logger.error('Arbitrage execution failed', { error: result.error });
      }
    } catch (error) {
      logger.error('Error handling opportunity', { error: error.message });
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
}

module.exports = ArbitrageBot;
