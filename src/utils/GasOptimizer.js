// Gas Optimization System for Protocol Efficiency
const { ethers } = require('ethers');
const logger = require('./logger');

/**
 * GasOptimizer - Dynamic gas price optimization based on network conditions
 * Priority 3: Gas Optimization for High-Priority Protocol Efficiency
 */
class GasOptimizer {
  constructor(provider, config = {}) {
    this.provider = provider;
    this.config = {
      maxGasPriceGwei: config.maxGasPriceGwei || 500, // Max gas price in gwei
      targetGasPriceGwei: config.targetGasPriceGwei || 100, // Target gas price
      peakHourGasMultiplier: config.peakHourGasMultiplier || 1.5, // Avoid trading if gas > target * multiplier
      historicalBlockCount: config.historicalBlockCount || 10, // Blocks to analyze for prediction
      competitiveBoostPercent: config.competitiveBoostPercent || 10, // % to add for competitiveness
      ...config
    };

    this.gasHistory = [];
    this.lastUpdate = 0;
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  /**
   * Get optimal gas price based on network conditions
   * @param {Object} options - Options for gas calculation
   * @returns {Object} { gasPrice: BigNumber, shouldTrade: boolean, reason: string }
   */
  async getOptimalGasPrice(options = {}) {
    try {
      // Get current gas price
      const currentGasPrice = await this.provider.getGasPrice();
      const currentGwei = parseFloat(ethers.utils.formatUnits(currentGasPrice, 'gwei'));

      // Update gas history
      await this.updateGasHistory(currentGasPrice);

      // Predict future gas price trend
      const prediction = this.predictGasTrend();

      // Check if we should trade based on gas price
      const shouldTrade = this.shouldTradeAtGasPrice(currentGwei, prediction);

      if (!shouldTrade.trade) {
        return {
          gasPrice: currentGasPrice,
          shouldTrade: false,
          reason: shouldTrade.reason,
          currentGwei,
          prediction
        };
      }

      // Calculate optimal gas price (add competitive boost)
      const competitiveGasPrice = currentGasPrice
        .mul(100 + this.config.competitiveBoostPercent)
        .div(100);

      // Cap at max gas price
      const maxGasPrice = ethers.utils.parseUnits(
        this.config.maxGasPriceGwei.toString(),
        'gwei'
      );

      const optimalGasPrice = competitiveGasPrice.gt(maxGasPrice) 
        ? maxGasPrice 
        : competitiveGasPrice;

      const optimalGwei = parseFloat(ethers.utils.formatUnits(optimalGasPrice, 'gwei'));

      logger.info('Gas price calculated', {
        current: currentGwei.toFixed(2),
        optimal: optimalGwei.toFixed(2),
        trend: prediction.trend,
        shouldTrade: true
      });

      return {
        gasPrice: optimalGasPrice,
        shouldTrade: true,
        currentGwei,
        optimalGwei,
        prediction
      };
    } catch (error) {
      logger.error('Failed to get optimal gas price', { error: error.message });
      throw error;
    }
  }

  /**
   * Update gas price history for trend prediction
   * @param {BigNumber} gasPrice - Current gas price
   */
  async updateGasHistory(gasPrice) {
    const now = Date.now();
    
    // Only update if cache expired
    if (now - this.lastUpdate < this.cacheTimeout) {
      return;
    }

    this.gasHistory.push({
      timestamp: now,
      gasPrice: gasPrice,
      gwei: parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'))
    });

    // Keep only recent history
    const maxHistory = this.config.historicalBlockCount * 2;
    if (this.gasHistory.length > maxHistory) {
      this.gasHistory = this.gasHistory.slice(-maxHistory);
    }

    this.lastUpdate = now;
  }

  /**
   * Predict gas price trend based on historical data
   * @returns {Object} { trend: string, confidence: number, avgGwei: number }
   */
  predictGasTrend() {
    // Trend detection constants
    const MIN_HISTORY_FOR_PREDICTION = 3;
    const TREND_CHANGE_THRESHOLD_PERCENT = 10;
    const DEFAULT_CONFIDENCE = 70;
    const HIGH_CONFIDENCE = 80;
    
    if (this.gasHistory.length < MIN_HISTORY_FOR_PREDICTION) {
      return { trend: 'unknown', confidence: 0, avgGwei: 0 };
    }

    // Calculate average gas price
    const avgGwei = this.gasHistory.reduce((sum, entry) => sum + entry.gwei, 0) / this.gasHistory.length;

    // Calculate trend (increasing/decreasing/stable)
    const recentHistory = this.gasHistory.slice(-5);
    const olderHistory = this.gasHistory.slice(-10, -5);

    if (olderHistory.length === 0) {
      return { trend: 'stable', confidence: DEFAULT_CONFIDENCE / 2, avgGwei };
    }

    const recentAvg = recentHistory.reduce((sum, entry) => sum + entry.gwei, 0) / recentHistory.length;
    const olderAvg = olderHistory.reduce((sum, entry) => sum + entry.gwei, 0) / olderHistory.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    let trend = 'stable';
    let confidence = DEFAULT_CONFIDENCE;

    if (changePercent > TREND_CHANGE_THRESHOLD_PERCENT) {
      trend = 'increasing';
      confidence = HIGH_CONFIDENCE;
    } else if (changePercent < -TREND_CHANGE_THRESHOLD_PERCENT) {
      trend = 'decreasing';
      confidence = HIGH_CONFIDENCE;
    }

    return { trend, confidence, avgGwei, changePercent };
  }

  /**
   * Determine if we should trade at current gas price
   * @param {number} currentGwei - Current gas price in gwei
   * @param {Object} prediction - Gas trend prediction
   * @returns {Object} { trade: boolean, reason: string }
   */
  shouldTradeAtGasPrice(currentGwei, prediction) {
    // Check if gas price is above absolute maximum
    if (currentGwei > this.config.maxGasPriceGwei) {
      return {
        trade: false,
        reason: `Gas price too high: ${currentGwei.toFixed(2)} gwei (max: ${this.config.maxGasPriceGwei})`
      };
    }

    // Check if we're in peak hours (gas > target * multiplier)
    const peakThreshold = this.config.targetGasPriceGwei * this.config.peakHourGasMultiplier;
    if (currentGwei > peakThreshold) {
      return {
        trade: false,
        reason: `Peak hour gas detected: ${currentGwei.toFixed(2)} gwei (threshold: ${peakThreshold.toFixed(2)})`
      };
    }

    // If gas is increasing rapidly, be cautious
    if (prediction.trend === 'increasing' && prediction.changePercent > 20) {
      return {
        trade: false,
        reason: `Gas price increasing rapidly: ${prediction.changePercent.toFixed(1)}% change`
      };
    }

    return { trade: true };
  }

  /**
   * Estimate if trade will be profitable after gas costs
   * @param {BigNumber} expectedProfit - Expected profit in wei
   * @param {BigNumber} gasPrice - Gas price in wei
   * @param {number} estimatedGasUnits - Estimated gas units for transaction
   * @returns {Object} { profitable: boolean, netProfit: BigNumber, gasCost: BigNumber }
   */
  checkProfitabilityAfterGas(expectedProfit, gasPrice, estimatedGasUnits = 500000) {
    const gasCost = gasPrice.mul(estimatedGasUnits);
    const netProfit = expectedProfit.sub(gasCost);
    const profitable = netProfit.gt(0);

    logger.debug('Profitability check', {
      expectedProfit: ethers.utils.formatEther(expectedProfit),
      gasCost: ethers.utils.formatEther(gasCost),
      netProfit: ethers.utils.formatEther(netProfit),
      profitable
    });

    return {
      profitable,
      netProfit,
      gasCost,
      expectedProfit
    };
  }

  /**
   * Get time-based gas multiplier (avoid peak hours)
   * @returns {number} Multiplier based on time of day
   */
  getTimeBasedMultiplier() {
    const hour = new Date().getUTCHours();
    
    // Peak hours typically 12-18 UTC (higher activity)
    if (hour >= 12 && hour < 18) {
      return 1.3; // 30% higher threshold during peak
    }
    
    // Off-peak hours (lower activity)
    if (hour >= 0 && hour < 6) {
      return 0.8; // 20% lower threshold during off-peak
    }
    
    return 1.0; // Normal hours
  }

  /**
   * Get comprehensive gas statistics
   * @returns {Object} Gas statistics
   */
  getStats() {
    const prediction = this.predictGasTrend();
    const currentGas = this.gasHistory.length > 0 
      ? this.gasHistory[this.gasHistory.length - 1].gwei 
      : 0;

    return {
      currentGasGwei: currentGas,
      avgGasGwei: prediction.avgGwei,
      trend: prediction.trend,
      trendConfidence: prediction.confidence,
      historySize: this.gasHistory.length,
      peakThreshold: this.config.targetGasPriceGwei * this.config.peakHourGasMultiplier,
      maxGasPrice: this.config.maxGasPriceGwei,
      timeMultiplier: this.getTimeBasedMultiplier()
    };
  }

  /**
   * Clear gas history
   */
  clearHistory() {
    this.gasHistory = [];
    this.lastUpdate = 0;
    logger.info('Gas history cleared');
  }
}

module.exports = GasOptimizer;
