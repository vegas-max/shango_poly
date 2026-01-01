// Layer 1: DATA FETCH - Scans for arbitrage opportunities
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { getInstance: getRustEngineManager } = require('../utils/RustEngineManager');

class OpportunityScanner {
  constructor(dexInterface, priceOracle, config) {
    this.dexInterface = dexInterface;
    this.priceOracle = priceOracle;
    this.config = config;
    this.isScanning = false;
    this.rustEngines = getRustEngineManager();
  }

  /**
   * Start scanning for arbitrage opportunities
   * @param {Function} onOpportunity - Callback when opportunity is found
   */
  async startScanning(onOpportunity) {
    this.isScanning = true;
    logger.info('Starting opportunity scanner');

    while (this.isScanning) {
      try {
        const opportunities = await this.scan();
        
        // Notify parent bot of scan completion
        if (onOpportunity.bot && onOpportunity.bot.incrementScanCount) {
          onOpportunity.bot.incrementScanCount();
        }
        
        for (const opp of opportunities) {
          if (opp.profitBps >= this.config.minProfitBps) {
            logger.info('Opportunity found', {
              profitBps: opp.profitBps,
              path: opp.path
            });
            await onOpportunity(opp);
          }
        }
      } catch (error) {
        logger.error('Scan error', { error: error.message });
      }

      // Wait before next scan
      await this.sleep(this.config.scanIntervalMs || 5000);
    }
  }

  /**
   * Stop scanning
   */
  stopScanning() {
    this.isScanning = false;
    logger.info('Stopping opportunity scanner');
  }

  /**
   * Scan for arbitrage opportunities across all configured token pairs
   * @returns {Array} Array of opportunities
   */
  async scan() {
    let opportunities = [];

    // Scan each base token with intermediate tokens
    for (const baseToken of this.config.baseTokens) {
      try {
        const baseAmount = ethers.utils.parseUnits(
          this.config.defaultAmount.toString(),
          18
        );

        const routes = await this.dexInterface.findArbitrageRoutes(
          baseToken,
          this.config.intermediateTokens,
          baseAmount
        );

        opportunities.push(...routes);
      } catch (error) {
        logger.debug(`Failed to scan ${baseToken}`, { error: error.message });
      }
    }

    // Use Rust TurboScanner for filtering and deduplication (3x faster)
    if (this.rustEngines && this.rustEngines.isAvailable()) {
      const rustOpportunities = opportunities.map(opp => ({
        path: opp.path,
        dexes: opp.dexes,
        input_amount: opp.inputAmount.toString(),
        output_amount: opp.outputAmount.toString(),
        profit: opp.profit.toString(),
        profit_bps: opp.profitBps,
        timestamp: Date.now()
      }));

      const filtered = this.rustEngines.filterOpportunities(rustOpportunities);
      
      // Convert back to JavaScript format
      opportunities = filtered.map(opp => ({
        path: opp.path,
        dexes: opp.dexes,
        inputAmount: ethers.BigNumber.from(opp.input_amount),
        outputAmount: ethers.BigNumber.from(opp.output_amount),
        profit: ethers.BigNumber.from(opp.profit),
        profitBps: opp.profit_bps
      }));
    }

    // Detect price discrepancies
    for (const tokenA of this.config.baseTokens) {
      for (const tokenB of this.config.intermediateTokens) {
        try {
          const discrepancy = await this.priceOracle.detectDiscrepancies(
            tokenA,
            tokenB
          );

          if (discrepancy.hasDiscrepancy) {
            logger.info('Price discrepancy detected', {
              tokenA,
              tokenB,
              spreadBps: discrepancy.spreadBps
            });
          }
        } catch (error) {
          logger.debug('Failed to check discrepancy', { error: error.message });
        }
      }
    }

    return opportunities;
  }

  /**
   * Validate an opportunity before execution
   * @param {Object} opportunity - Opportunity to validate
   * @returns {Object} Validated opportunity with execution params
   */
  async validateOpportunity(opportunity) {
    // Check if opportunity is still valid
    const currentRoute = await this.dexInterface.findBestRoute(
      opportunity.path[0],
      opportunity.path[1],
      opportunity.inputAmount
    );

    const stillProfitable = currentRoute.amountOut.gte(
      opportunity.outputAmount.mul(95).div(100) // 5% tolerance
    );

    if (!stillProfitable) {
      return { valid: false, reason: 'Opportunity no longer profitable' };
    }

    return {
      valid: true,
      opportunity: {
        ...opportunity,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OpportunityScanner;
