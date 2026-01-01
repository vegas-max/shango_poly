// Layer 2: PRICE AGGREGATION - Aggregates prices from multiple sources
const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { getInstance: getRustEngineManager } = require('../utils/RustEngineManager');

class PriceOracle {
  constructor(provider) {
    this.provider = provider;
    this.priceCache = new Map();
    this.cacheTimeout = 10000; // 10 seconds
    this.rustEngines = getRustEngineManager();
  }

  /**
   * Get aggregated price for a token pair
   * @param {string} tokenA - First token address
   * @param {string} tokenB - Second token address
   * @returns {Object} Price data from multiple sources
   */
  async getPrice(tokenA, tokenB) {
    const cacheKey = `${tokenA}-${tokenB}`;
    const cached = this.priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const prices = await this.fetchPrices(tokenA, tokenB);
      const aggregated = this.aggregatePrices(prices);

      this.priceCache.set(cacheKey, {
        data: aggregated,
        timestamp: Date.now()
      });

      return aggregated;
    } catch (error) {
      logger.error('Failed to get price', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch prices from multiple sources
   * @param {string} tokenA - First token address
   * @param {string} tokenB - Second token address
   * @returns {Array} Prices from different sources
   */
  async fetchPrices(tokenA, tokenB) {
    const prices = [];

    // In production, this would fetch from:
    // - Chainlink oracles
    // - DEX reserves
    // - External price feeds
    
    // Mock implementation for demonstration
    prices.push({
      source: 'chainlink',
      price: ethers.utils.parseUnits('1.0', 18),
      timestamp: Date.now()
    });

    return prices;
  }

  /**
   * Aggregate prices using median or weighted average
   * @param {Array} prices - Array of price data
   * @returns {Object} Aggregated price
   */
  aggregatePrices(prices) {
    if (prices.length === 0) {
      throw new Error('No prices available');
    }

    if (prices.length === 1) {
      return prices[0];
    }

    // Try using Rust engine for median calculation (ARM-optimized)
    if (this.rustEngines && this.rustEngines.isAvailable()) {
      const rustPrices = prices.map(p => ({
        token_a: 'A',
        token_b: 'B',
        price: p.price.toString(),
        source: p.source,
        timestamp: p.timestamp
      }));
      
      const median = this.rustEngines.calculateMedianPrice(rustPrices);
      if (median) {
        return {
          source: median.source,
          price: ethers.BigNumber.from(median.price),
          timestamp: median.timestamp
        };
      }
    }

    // Fallback to JavaScript implementation
    // Use median for robustness against outliers
    const sorted = prices.slice().sort((a, b) => {
      if (a.price.gt(b.price)) return 1;
      if (a.price.lt(b.price)) return -1;
      return 0;
    });

    const medianIndex = Math.floor(sorted.length / 2);
    return sorted[medianIndex];
  }

  /**
   * Detect price discrepancies across sources
   * @param {string} tokenA - First token address
   * @param {string} tokenB - Second token address
   * @returns {Object} Discrepancy analysis
   */
  async detectDiscrepancies(tokenA, tokenB) {
    const prices = await this.fetchPrices(tokenA, tokenB);

    if (prices.length < 2) {
      return { hasDiscrepancy: false };
    }

    const priceValues = prices.map(p => p.price);
    const max = priceValues.reduce((a, b) => a.gt(b) ? a : b);
    const min = priceValues.reduce((a, b) => a.lt(b) ? a : b);

    const spread = max.sub(min);
    const spreadBps = spread.mul(10000).div(max);

    return {
      hasDiscrepancy: spreadBps.gt(50), // 0.5% threshold
      spreadBps: spreadBps.toNumber(),
      maxPrice: max,
      minPrice: min,
      sources: prices.map(p => p.source)
    };
  }

  /**
   * Clear price cache
   */
  clearCache() {
    this.priceCache.clear();
    logger.info('Price cache cleared');
  }
}

module.exports = PriceOracle;
