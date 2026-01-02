// Gas Manager - Dynamic gas price optimization for Polygon
const { ethers } = require('ethers');
const logger = require('./logger');

class GasManager {
  constructor(provider, config = {}) {
    this.provider = provider;
    this.maxGasPriceGwei = config.maxGasPriceGwei || 500;
    this.optimalGasPriceGwei = config.optimalGasPriceGwei || 100;
    this.congestionThreshold = config.congestionThreshold || 200; // Gwei
    
    // Track gas price history for trend analysis
    this.gasPriceHistory = [];
    this.maxHistoryLength = 50;
    
    // Network congestion metrics
    this.lastCongestionCheck = 0;
    this.congestionCheckInterval = 10000; // 10 seconds
    this.isCongested = false;
  }

  /**
   * Get optimal gas price for current network conditions
   * @returns {BigNumber} Gas price in wei
   */
  async getOptimalGasPrice() {
    try {
      const currentGasPrice = await this.provider.getGasPrice();
      const currentGasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));

      // Add to history
      this.addToHistory(currentGasPriceGwei);

      // Check if gas price is acceptable
      if (currentGasPriceGwei > this.maxGasPriceGwei) {
        logger.warn('Gas price too high', {
          current: `${currentGasPriceGwei.toFixed(2)} Gwei`,
          max: `${this.maxGasPriceGwei} Gwei`
        });
        return null; // Signal to skip this trade
      }

      // Calculate optimal gas price based on market conditions
      const trend = this.getGasPriceTrend();
      let optimalGasPrice = currentGasPrice;

      // If gas is trending down, use lower gas price
      if (trend === 'decreasing') {
        optimalGasPrice = currentGasPrice.mul(95).div(100); // 5% lower
        logger.debug('Gas trending down, using lower price');
      }
      // If gas is spiking, use higher to ensure execution
      else if (trend === 'spiking') {
        optimalGasPrice = currentGasPrice.mul(110).div(100); // 10% higher
        logger.debug('Gas spiking, using higher price for execution');
      }

      logger.info('Optimal gas price calculated', {
        current: `${currentGasPriceGwei.toFixed(2)} Gwei`,
        optimal: `${parseFloat(ethers.utils.formatUnits(optimalGasPrice, 'gwei')).toFixed(2)} Gwei`,
        trend
      });

      return optimalGasPrice;
    } catch (error) {
      logger.error('Failed to get optimal gas price', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if network is congested
   * @returns {boolean} True if congested
   */
  async isNetworkCongested() {
    const now = Date.now();
    
    // Use cached result if recent
    if (now - this.lastCongestionCheck < this.congestionCheckInterval) {
      return this.isCongested;
    }

    try {
      const currentGasPrice = await this.provider.getGasPrice();
      const currentGasPriceGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));

      this.isCongested = currentGasPriceGwei > this.congestionThreshold;
      this.lastCongestionCheck = now;

      if (this.isCongested) {
        logger.warn('Network congestion detected', {
          gasPrice: `${currentGasPriceGwei.toFixed(2)} Gwei`,
          threshold: `${this.congestionThreshold} Gwei`
        });
      }

      return this.isCongested;
    } catch (error) {
      logger.error('Failed to check network congestion', { error: error.message });
      return false; // Assume not congested on error
    }
  }

  /**
   * Calculate gas cost for a transaction
   * @param {BigNumber} gasLimit - Estimated gas limit
   * @param {BigNumber} gasPrice - Gas price in wei
   * @returns {BigNumber} Total gas cost in wei
   */
  calculateGasCost(gasLimit, gasPrice) {
    return gasLimit.mul(gasPrice);
  }

  /**
   * Validate if trade is profitable after gas costs
   * @param {BigNumber} expectedProfit - Expected profit in wei
   * @param {BigNumber} gasLimit - Estimated gas limit
   * @param {BigNumber} gasPrice - Gas price in wei
   * @returns {Object} Profitability validation
   */
  validateProfitAfterGas(expectedProfit, gasLimit, gasPrice) {
    const gasCost = this.calculateGasCost(gasLimit, gasPrice);
    const netProfit = expectedProfit.sub(gasCost);
    const profitable = netProfit.gt(0);

    // Require at least 2x gas cost as profit (safety margin)
    const safetyMargin = gasCost.mul(2);
    const safelyProfitable = expectedProfit.gte(safetyMargin);

    logger.debug('Gas profitability check', {
      expectedProfit: ethers.utils.formatEther(expectedProfit),
      gasCost: ethers.utils.formatEther(gasCost),
      netProfit: ethers.utils.formatEther(netProfit),
      profitable,
      safelyProfitable
    });

    return {
      profitable,
      safelyProfitable,
      gasCost,
      netProfit,
      margin: safelyProfitable ? netProfit.sub(gasCost).toString() : '0'
    };
  }

  /**
   * Estimate gas limit for arbitrage transaction
   * @param {Object} opportunity - Arbitrage opportunity
   * @returns {BigNumber} Estimated gas limit
   */
  estimateGasLimit(opportunity) {
    // Base gas for flash loan execution
    let gasEstimate = 350000;

    // Add gas for each swap in the path
    const swapCount = opportunity.path.length - 1;
    gasEstimate += swapCount * 100000; // ~100k per swap

    // Add 20% buffer for safety
    gasEstimate = Math.floor(gasEstimate * 1.2);

    return ethers.BigNumber.from(gasEstimate);
  }

  /**
   * Add gas price to history
   * @param {number} gasPriceGwei - Gas price in Gwei
   */
  addToHistory(gasPriceGwei) {
    this.gasPriceHistory.push({
      price: gasPriceGwei,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (this.gasPriceHistory.length > this.maxHistoryLength) {
      this.gasPriceHistory.shift();
    }
  }

  /**
   * Analyze gas price trend
   * @returns {string} Trend: 'increasing', 'decreasing', 'stable', 'spiking'
   */
  getGasPriceTrend() {
    if (this.gasPriceHistory.length < 5) {
      return 'stable'; // Not enough data
    }

    const recent = this.gasPriceHistory.slice(-5);
    const prices = recent.map(h => h.price);
    
    // Calculate simple moving average
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 2];

    // Check for spike (>20% increase in last reading)
    if (current > previous * 1.2) {
      return 'spiking';
    }

    // Check trend
    const change = ((current - avg) / avg) * 100;
    
    if (change > 5) {
      return 'increasing';
    } else if (change < -5) {
      return 'decreasing';
    }
    
    return 'stable';
  }

  /**
   * Get gas price statistics
   * @returns {Object} Gas price stats
   */
  getStats() {
    if (this.gasPriceHistory.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        trend: 'unknown'
      };
    }

    const prices = this.gasPriceHistory.map(h => h.price);
    const current = prices[prices.length - 1];
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const trend = this.getGasPriceTrend();

    return {
      current: current.toFixed(2),
      average: average.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      trend,
      samples: this.gasPriceHistory.length
    };
  }
}

module.exports = GasManager;
