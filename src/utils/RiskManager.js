// Risk Management System for Protocol Efficiency
const logger = require('./logger');
const { ethers } = require('ethers');

/**
 * RiskManager - Implements circuit breakers, loss limits, and risk controls
 * Priority 4: Risk Management for High-Priority Protocol Efficiency
 */
class RiskManager {
  constructor(config = {}) {
    // Configuration with sensible defaults
    this.config = {
      dailyLossLimitEth: config.dailyLossLimitEth || 0.5, // Max 0.5 ETH loss per day
      maxConsecutiveFailures: config.maxConsecutiveFailures || 5,
      maxDrawdownPercent: config.maxDrawdownPercent || 10, // 10% max drawdown
      minBalanceEth: config.minBalanceEth || 1.0, // Minimum balance to continue trading
      cooldownPeriodMs: config.cooldownPeriodMs || 5 * 60 * 1000, // 5 minutes cooldown after circuit breaker
      ...config
    };

    // State tracking
    this.stats = {
      dailyLoss: ethers.BigNumber.from(0),
      consecutiveFailures: 0,
      lastResetTimestamp: Date.now(),
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      peakBalance: ethers.BigNumber.from(0),
      currentBalance: ethers.BigNumber.from(0)
    };

    this.circuitBreakerActive = false;
    this.circuitBreakerActivatedAt = null;
  }

  /**
   * Initialize risk manager with starting balance
   * @param {BigNumber} initialBalance - Starting balance in wei
   */
  initialize(initialBalance) {
    this.stats.peakBalance = initialBalance;
    this.stats.currentBalance = initialBalance;
    logger.info('RiskManager initialized', {
      peakBalance: ethers.utils.formatEther(initialBalance),
      config: this.config
    });
  }

  /**
   * Check if trading should be allowed based on risk limits
   * @returns {Object} { allowed: boolean, reason: string }
   */
  canTrade() {
    // Check if circuit breaker is active
    if (this.circuitBreakerActive) {
      const cooldownRemaining = this.getRemainingCooldown();
      if (cooldownRemaining > 0) {
        return {
          allowed: false,
          reason: `Circuit breaker active. Cooldown: ${Math.ceil(cooldownRemaining / 1000)}s remaining`
        };
      } else {
        // Cooldown period expired, reset circuit breaker
        this.resetCircuitBreaker();
      }
    }

    // Check daily loss limit
    const dailyLossEth = parseFloat(ethers.utils.formatEther(this.stats.dailyLoss));
    if (dailyLossEth >= this.config.dailyLossLimitEth) {
      this.activateCircuitBreaker('Daily loss limit exceeded');
      return {
        allowed: false,
        reason: `Daily loss limit reached: ${dailyLossEth.toFixed(4)} ETH`
      };
    }

    // Check consecutive failures
    if (this.stats.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.activateCircuitBreaker('Too many consecutive failures');
      return {
        allowed: false,
        reason: `Max consecutive failures reached: ${this.stats.consecutiveFailures}`
      };
    }

    // Check drawdown
    const drawdownPercent = this.calculateDrawdown();
    if (drawdownPercent >= this.config.maxDrawdownPercent) {
      this.activateCircuitBreaker('Maximum drawdown exceeded');
      return {
        allowed: false,
        reason: `Max drawdown exceeded: ${drawdownPercent.toFixed(2)}%`
      };
    }

    // Check minimum balance
    const balanceEth = parseFloat(ethers.utils.formatEther(this.stats.currentBalance));
    if (balanceEth < this.config.minBalanceEth) {
      this.activateCircuitBreaker('Balance below minimum threshold');
      return {
        allowed: false,
        reason: `Balance too low: ${balanceEth.toFixed(4)} ETH`
      };
    }

    return { allowed: true };
  }

  /**
   * Record a trade result (success or failure)
   * @param {boolean} success - Whether trade succeeded
   * @param {BigNumber} profit - Profit/loss in wei (negative for loss)
   * @param {BigNumber} newBalance - Updated balance after trade
   */
  recordTrade(success, profit, newBalance) {
    this.stats.totalTrades++;

    // Update balance and peak
    this.stats.currentBalance = newBalance;
    if (newBalance.gt(this.stats.peakBalance)) {
      this.stats.peakBalance = newBalance;
    }

    if (success) {
      this.stats.successfulTrades++;
      this.stats.consecutiveFailures = 0; // Reset on success
    } else {
      this.stats.failedTrades++;
      this.stats.consecutiveFailures++;
      
      // Add loss to daily loss (only for failed trades)
      if (profit.isNegative()) {
        this.stats.dailyLoss = this.stats.dailyLoss.add(profit.abs());
      }
    }

    logger.info('Trade recorded', {
      success,
      profit: ethers.utils.formatEther(profit),
      consecutiveFailures: this.stats.consecutiveFailures,
      dailyLoss: ethers.utils.formatEther(this.stats.dailyLoss),
      successRate: this.getSuccessRate()
    });

    // Check if we need to activate circuit breaker
    this.canTrade();
  }

  /**
   * Calculate current drawdown percentage
   * @returns {number} Drawdown percentage
   */
  calculateDrawdown() {
    if (this.stats.peakBalance.isZero()) {
      return 0;
    }

    const drawdown = this.stats.peakBalance.sub(this.stats.currentBalance);
    const drawdownPercent = drawdown.mul(10000).div(this.stats.peakBalance).toNumber() / 100;
    return drawdownPercent;
  }

  /**
   * Activate circuit breaker
   * @param {string} reason - Reason for activation
   */
  activateCircuitBreaker(reason) {
    if (!this.circuitBreakerActive) {
      this.circuitBreakerActive = true;
      this.circuitBreakerActivatedAt = Date.now();
      logger.warn('🚨 CIRCUIT BREAKER ACTIVATED', { reason });
    }
  }

  /**
   * Reset circuit breaker (called after cooldown period)
   */
  resetCircuitBreaker() {
    this.circuitBreakerActive = false;
    this.circuitBreakerActivatedAt = null;
    this.stats.consecutiveFailures = 0; // Reset consecutive failures
    logger.info('✅ Circuit breaker reset - trading resumed');
  }

  /**
   * Get remaining cooldown time in milliseconds
   * @returns {number} Remaining cooldown time
   */
  getRemainingCooldown() {
    if (!this.circuitBreakerActivatedAt) {
      return 0;
    }
    const elapsed = Date.now() - this.circuitBreakerActivatedAt;
    return Math.max(0, this.config.cooldownPeriodMs - elapsed);
  }

  /**
   * Reset daily statistics (should be called at start of each day)
   */
  resetDailyStats() {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - this.stats.lastResetTimestamp >= dayInMs) {
      this.stats.dailyLoss = ethers.BigNumber.from(0);
      this.stats.lastResetTimestamp = now;
      logger.info('Daily stats reset');
    }
  }

  /**
   * Get success rate
   * @returns {number} Success rate percentage
   */
  getSuccessRate() {
    if (this.stats.totalTrades === 0) {
      return 0;
    }
    return (this.stats.successfulTrades / this.stats.totalTrades) * 100;
  }

  /**
   * Get comprehensive risk statistics
   * @returns {Object} Risk statistics
   */
  getStats() {
    return {
      ...this.stats,
      dailyLoss: ethers.utils.formatEther(this.stats.dailyLoss),
      peakBalance: ethers.utils.formatEther(this.stats.peakBalance),
      currentBalance: ethers.utils.formatEther(this.stats.currentBalance),
      drawdown: this.calculateDrawdown(),
      successRate: this.getSuccessRate(),
      circuitBreakerActive: this.circuitBreakerActive,
      cooldownRemaining: this.getRemainingCooldown()
    };
  }

  /**
   * Force reset (use with caution)
   */
  forceReset() {
    this.circuitBreakerActive = false;
    this.circuitBreakerActivatedAt = null;
    this.stats.consecutiveFailures = 0;
    this.stats.dailyLoss = ethers.BigNumber.from(0);
    logger.warn('Risk manager force reset');
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Risk manager configuration updated', { config: this.config });
  }
}

module.exports = RiskManager;
