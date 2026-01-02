// MEV Protection Strategies for Protocol Efficiency
const logger = require('./logger');

/**
 * MEVProtection - Strategies to protect against MEV attacks
 * Priority 2: MEV Protection for High-Priority Protocol Efficiency
 */
class MEVProtection {
  constructor(config = {}) {
    this.config = {
      // MEV protection strategies
      usePrivateTransactions: config.usePrivateTransactions || false,
      flashbotsRpcUrl: config.flashbotsRpcUrl || null,
      bundleTransactions: config.bundleTransactions || false,
      maxBundleSize: config.maxBundleSize || 3,
      
      // Transaction privacy settings
      hideTransactionAmount: config.hideTransactionAmount || false,
      useStealthAddresses: config.useStealthAddresses || false,
      
      // Anti-frontrunning measures
      maxBlockDelay: config.maxBlockDelay || 2, // Max blocks to wait before canceling
      minConfirmationBlocks: config.minConfirmationBlocks || 1,
      useDynamicSlippage: config.useDynamicSlippage || true,
      
      // Rate limiting to avoid patterns
      minTimeBetweenTrades: config.minTimeBetweenTrades || 30000, // 30 seconds
      randomizeDelay: config.randomizeDelay || true,
      
      // MEV protection constants
      delayJitterFactor: config.delayJitterFactor || 0.5, // 50% additional random delay
      highValueProfitThresholdEth: config.highValueProfitThresholdEth || 0.5, // 0.5 ETH threshold
      
      ...config
    };

    this.lastTradeTimestamp = 0;
    this.transactionBundle = [];
    this.stats = {
      totalTransactions: 0,
      privateTransactions: 0,
      bundledTransactions: 0,
      frontrunDetected: 0,
      mevProtectionEnabled: this.isMEVProtectionEnabled()
    };
  }

  /**
   * Check if MEV protection is enabled
   * @returns {boolean}
   */
  isMEVProtectionEnabled() {
    return this.config.usePrivateTransactions || 
           this.config.bundleTransactions ||
           this.config.flashbotsRpcUrl !== null;
  }

  /**
   * Prepare transaction with MEV protection
   * @param {Object} transaction - Transaction to protect
   * @returns {Object} Protected transaction configuration
   */
  async prepareProtectedTransaction(transaction) {
    logger.info('Preparing MEV-protected transaction', {
      mevProtectionEnabled: this.isMEVProtectionEnabled(),
      usePrivate: this.config.usePrivateTransactions
    });

    const protectedTx = { ...transaction };

    // Add timing protection (randomized delay)
    const delay = await this.calculateOptimalDelay();
    if (delay > 0) {
      await this.sleep(delay);
    }

    // Add slippage protection
    if (this.config.useDynamicSlippage) {
      protectedTx.slippageProtection = this.calculateAntiMEVSlippage(transaction);
    }

    // Configure for private transaction pool if enabled
    if (this.config.usePrivateTransactions && this.config.flashbotsRpcUrl) {
      protectedTx.flashbots = {
        enabled: true,
        rpcUrl: this.config.flashbotsRpcUrl,
        maxBlockNumber: transaction.blockNumber + this.config.maxBlockDelay
      };
      this.stats.privateTransactions++;
    }

    // Add to bundle if bundling is enabled
    if (this.config.bundleTransactions) {
      this.addToBundle(protectedTx);
    }

    this.lastTradeTimestamp = Date.now();
    this.stats.totalTransactions++;

    return protectedTx;
  }

  /**
   * Calculate optimal delay to avoid MEV detection patterns
   * @returns {number} Delay in milliseconds
   */
  async calculateOptimalDelay() {
    const timeSinceLastTrade = Date.now() - this.lastTradeTimestamp;
    
    if (timeSinceLastTrade < this.config.minTimeBetweenTrades) {
      const baseDelay = this.config.minTimeBetweenTrades - timeSinceLastTrade;
      
      // Add random jitter if enabled (0-50% additional delay)
      if (this.config.randomizeDelay) {
        const jitter = Math.random() * baseDelay * this.config.delayJitterFactor;
        return baseDelay + jitter;
      }
      
      return baseDelay;
    }

    // Even if enough time has passed, add small random delay to avoid patterns
    if (this.config.randomizeDelay) {
      return Math.random() * 5000; // 0-5 seconds random delay
    }

    return 0;
  }

  /**
   * Calculate anti-MEV slippage tolerance
   * Higher slippage tolerance for MEV protection, but still reasonable
   * @param {Object} transaction - Transaction details
   * @returns {Object} Slippage configuration
   */
  calculateAntiMEVSlippage(transaction) {
    const baseSlippage = transaction.slippageTolerance || 0.5; // 0.5% default
    
    // Increase slippage slightly to avoid front-running invalidation
    // but not too much to avoid losses
    const mevProtectedSlippage = baseSlippage * 1.5; // 50% increase
    
    // Cap at reasonable maximum (2%)
    const maxSlippage = 2.0;
    const finalSlippage = Math.min(mevProtectedSlippage, maxSlippage);

    return {
      tolerance: finalSlippage,
      type: 'mev-protected',
      originalTolerance: baseSlippage
    };
  }

  /**
   * Add transaction to bundle
   * @param {Object} transaction - Transaction to bundle
   */
  addToBundle(transaction) {
    this.transactionBundle.push(transaction);
    
    logger.info('Transaction added to bundle', {
      bundleSize: this.transactionBundle.length,
      maxSize: this.config.maxBundleSize
    });

    // Auto-submit bundle if it reaches max size
    if (this.transactionBundle.length >= this.config.maxBundleSize) {
      this.submitBundle();
    }
  }

  /**
   * Submit transaction bundle
   * @returns {Object} Bundle submission result
   */
  async submitBundle() {
    if (this.transactionBundle.length === 0) {
      return { submitted: false, reason: 'Empty bundle' };
    }

    logger.info('Submitting transaction bundle', {
      size: this.transactionBundle.length
    });

    const bundle = [...this.transactionBundle];
    this.transactionBundle = [];
    this.stats.bundledTransactions += bundle.length;

    // In a real implementation, this would submit to Flashbots or similar service
    return {
      submitted: true,
      bundleSize: bundle.length,
      bundle: bundle,
      note: 'Bundle ready for submission to private transaction pool'
    };
  }

  /**
   * Detect potential frontrunning
   * @param {Object} originalTx - Original transaction
   * @param {Object} executedTx - Executed transaction result
   * @returns {Object} Detection result
   */
  detectFrontrunning(originalTx, executedTx) {
    // Check if execution price differs significantly from expected
    if (!originalTx.expectedPrice || !executedTx.actualPrice) {
      return { detected: false, confidence: 0 };
    }

    const priceDifference = Math.abs(
      (executedTx.actualPrice - originalTx.expectedPrice) / originalTx.expectedPrice * 100
    );

    // If price moved more than 1% unexpectedly, possible frontrunning
    const frontrunThreshold = 1.0; // 1%
    const detected = priceDifference > frontrunThreshold;

    if (detected) {
      this.stats.frontrunDetected++;
      logger.warn('Potential frontrunning detected', {
        expectedPrice: originalTx.expectedPrice,
        actualPrice: executedTx.actualPrice,
        difference: priceDifference.toFixed(2) + '%'
      });
    }

    return {
      detected,
      confidence: Math.min(priceDifference * 10, 100), // Scale to 0-100
      priceDifference
    };
  }

  /**
   * Get MEV protection recommendations
   * @param {Object} opportunity - Trading opportunity
   * @returns {Object} Recommendations
   */
  getProtectionRecommendations(opportunity) {
    const recommendations = {
      usePrivatePool: false,
      increaseSlippage: false,
      delayExecution: false,
      bundleWithOthers: false,
      reasons: []
    };

    // High-value trades should use private pool
    const profitThreshold = this.config.highValueProfitThresholdEth;
    if (opportunity.expectedProfit && opportunity.expectedProfit > profitThreshold) {
      recommendations.usePrivatePool = true;
      recommendations.reasons.push('High-value trade detected');
    }

    // Competitive pools need extra slippage protection
    if (opportunity.competitionLevel && opportunity.competitionLevel > 7) {
      recommendations.increaseSlippage = true;
      recommendations.reasons.push('High competition detected');
    }

    // Multiple simultaneous opportunities could be bundled
    if (this.transactionBundle.length > 0) {
      recommendations.bundleWithOthers = true;
      recommendations.reasons.push('Other transactions pending in bundle');
    }

    return recommendations;
  }

  /**
   * Get MEV protection statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      config: {
        mevProtectionEnabled: this.isMEVProtectionEnabled(),
        usePrivateTransactions: this.config.usePrivateTransactions,
        bundleTransactions: this.config.bundleTransactions,
        flashbotsConfigured: this.config.flashbotsRpcUrl !== null
      },
      currentBundleSize: this.transactionBundle.length,
      frontrunRate: this.stats.totalTransactions > 0 
        ? (this.stats.frontrunDetected / this.stats.totalTransactions * 100).toFixed(2) 
        : 0
    };
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.stats.mevProtectionEnabled = this.isMEVProtectionEnabled();
    logger.info('MEV Protection configuration updated', { 
      mevProtectionEnabled: this.stats.mevProtectionEnabled 
    });
  }
}

module.exports = MEVProtection;
