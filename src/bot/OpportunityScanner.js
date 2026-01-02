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
        inputAmount: opp.inputAmount.toString(),
        outputAmount: opp.outputAmount.toString(),
        profit: opp.profit.toString(),
        profitBps: opp.profitBps,
        timestamp: Date.now()
      }));

      const filtered = this.rustEngines.filterOpportunities(rustOpportunities);
      
      // Convert back to JavaScript format
      opportunities = filtered.map(opp => ({
        path: opp.path,
        dexes: opp.dexes,
        inputAmount: ethers.BigNumber.from(opp.inputAmount),
        outputAmount: ethers.BigNumber.from(opp.outputAmount),
        profit: ethers.BigNumber.from(opp.profit),
        profitBps: opp.profitBps
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
   * Validate liquidity depth for the opportunity
   * @param {Object} opportunity - Opportunity to validate
   * @returns {Object} Validation result with liquidity score
   */
  async validateLiquidity(opportunity) {
    try {
      const minLiquidityMultiple = 3; // Require 3x the trade amount in liquidity
      const requiredLiquidity = opportunity.inputAmount.mul(minLiquidityMultiple);

      // Check liquidity on each DEX in the path
      for (let i = 0; i < opportunity.dexes.length; i++) {
        const dexName = opportunity.dexes[i];
        const tokenIn = opportunity.path[i];
        const tokenOut = opportunity.path[i + 1];

        const liquidity = await this.dexInterface.getLiquidity(dexName, tokenIn, tokenOut);
        
        if (liquidity.lt(requiredLiquidity)) {
          logger.warn('Insufficient liquidity', {
            dex: dexName,
            required: ethers.utils.formatUnits(requiredLiquidity, 18),
            available: ethers.utils.formatUnits(liquidity, 18)
          });
          return { 
            valid: false, 
            reason: `Insufficient liquidity on ${dexName}` 
          };
        }
      }

      // Calculate liquidity score (0-100)
      const score = 100; // Simplified for now
      
      return { valid: true, score };
    } catch (error) {
      logger.warn('Liquidity validation failed', { error: error.message });
      // If we can't validate liquidity, be conservative and reject
      return { valid: false, reason: 'Unable to validate liquidity' };
    }
  }

  /**
   * Validate price impact tolerance
   * @param {Object} opportunity - Opportunity to validate
   * @returns {Object} Validation result
   */
  async validatePriceImpact(opportunity) {
    const maxPriceImpact = 2.0; // 2% max price impact

    try {
      for (let i = 0; i < opportunity.dexes.length; i++) {
        const dexName = opportunity.dexes[i];
        const tokenIn = opportunity.path[i];
        const tokenOut = opportunity.path[i + 1];
        const amount = i === 0 ? opportunity.inputAmount : opportunity.outputAmount;

        const impact = await this.dexInterface.getPriceImpact(dexName, tokenIn, tokenOut, amount);
        
        if (impact > maxPriceImpact) {
          logger.warn('Price impact too high', {
            dex: dexName,
            impact: `${impact.toFixed(2)}%`,
            max: `${maxPriceImpact}%`
          });
          return { 
            valid: false, 
            reason: `Price impact ${impact.toFixed(2)}% exceeds ${maxPriceImpact}%` 
          };
        }
      }

      return { valid: true };
    } catch (error) {
      logger.warn('Price impact validation failed', { error: error.message });
      // If we can't validate price impact, be conservative and reject
      return { valid: false, reason: 'Unable to validate price impact' };
    }
  }

  /**
   * Calculate dynamic slippage tolerance based on market conditions
   * ENHANCED: Priority 1 - Improved slippage calculation for better execution success
   * @param {Object} opportunity - Opportunity
   * @returns {number} Slippage tolerance in basis points
   */
  async calculateDynamicSlippage(opportunity) {
    // Configuration constants
    const CONGESTION_THRESHOLD_GWEI = 200;
    const CONGESTION_SLIPPAGE_MULTIPLIER = 1.2;
    const MAX_SLIPPAGE_BPS = 300; // 3%
    
    // Base slippage tolerance
    let slippage = 50; // 0.5%

    // Factor 1: Adjust based on profit margin
    if (opportunity.profitBps < 100) {
      slippage = 30; // 0.3% for tight margins - be conservative
    } else if (opportunity.profitBps > 500) {
      slippage = 100; // 1% for high profit - can afford more slippage
    } else if (opportunity.profitBps > 1000) {
      slippage = 150; // 1.5% for very high profit
    }

    // Factor 2: Increase slippage for multi-hop routes (more complexity = more slippage risk)
    const hopCount = opportunity.path.length - 1;
    if (hopCount > 2) {
      slippage = Math.floor(slippage * 1.3); // 30% increase for 3+ hops
    }

    // Factor 3: Adjust for liquidity depth (lower liquidity = higher slippage needed)
    if (opportunity.liquidityScore && opportunity.liquidityScore < 50) {
      slippage = Math.floor(slippage * 1.4); // 40% increase for low liquidity
    }

    // Factor 4: Network congestion adjustment
    try {
      const gasPrice = await this.dexInterface.provider.getGasPrice();
      const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));
      
      // If gas is high, network is congested, need more slippage buffer
      if (gasPriceGwei > CONGESTION_THRESHOLD_GWEI) {
        slippage = Math.floor(slippage * CONGESTION_SLIPPAGE_MULTIPLIER);
      }
    } catch (error) {
      // If can't check gas price, use default
      logger.debug('Could not check gas price for slippage adjustment');
    }

    // Cap slippage at reasonable maximum
    slippage = Math.min(slippage, MAX_SLIPPAGE_BPS);
    
    logger.debug('Dynamic slippage calculated', {
      profitBps: opportunity.profitBps,
      hopCount,
      calculatedSlippage: slippage,
      slippagePercent: (slippage / 100).toFixed(2) + '%'
    });
    
    return slippage;
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
