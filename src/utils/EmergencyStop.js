// Emergency stop functionality for production safety
const logger = require('./logger');
const axios = require('axios');

class EmergencyStop {
  constructor(config) {
    this.enabled = config?.enableEmergencyStop !== false;
    this.webhookUrl = config?.emergencyWebhookUrl || null;
    this.isStopped = false;
    this.stopReason = null;
    this.stopTimestamp = null;
    this.callbacks = [];
  }

  /**
   * Register a callback to be called when emergency stop is triggered
   */
  onStop(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  /**
   * Trigger emergency stop
   */
  async trigger(reason, metadata = {}) {
    if (!this.enabled) {
      logger.warn('Emergency stop disabled, ignoring trigger', { reason });
      return false;
    }

    if (this.isStopped) {
      logger.warn('Emergency stop already active', { 
        currentReason: this.stopReason,
        newReason: reason 
      });
      return false;
    }

    this.isStopped = true;
    this.stopReason = reason;
    this.stopTimestamp = new Date();

    logger.error('🚨 EMERGENCY STOP TRIGGERED 🚨', {
      reason,
      timestamp: this.stopTimestamp.toISOString(),
      metadata
    });

    // Send notification if webhook configured
    if (this.webhookUrl) {
      await this.sendNotification(reason, metadata);
    }

    // Call all registered callbacks
    for (const callback of this.callbacks) {
      try {
        await callback(reason, metadata);
      } catch (error) {
        logger.error('Emergency stop callback failed', { error: error.message });
      }
    }

    return true;
  }

  /**
   * Send notification via webhook
   */
  async sendNotification(reason, metadata) {
    try {
      await axios.post(this.webhookUrl, {
        event: 'EMERGENCY_STOP',
        reason,
        timestamp: this.stopTimestamp.toISOString(),
        metadata,
        severity: 'CRITICAL'
      }, {
        timeout: 5000
      });
      logger.info('Emergency notification sent successfully');
    } catch (error) {
      logger.error('Failed to send emergency notification', { error: error.message });
    }
  }

  /**
   * Check if system is stopped
   */
  isStopped() {
    return this.isStopped;
  }

  /**
   * Get stop information
   */
  getStopInfo() {
    if (!this.isStopped) {
      return null;
    }

    return {
      reason: this.stopReason,
      timestamp: this.stopTimestamp,
      duration: Date.now() - this.stopTimestamp.getTime()
    };
  }

  /**
   * Reset emergency stop (requires manual intervention)
   */
  reset(authorization) {
    if (!authorization || authorization !== 'AUTHORIZED_RESET') {
      logger.error('Unauthorized emergency stop reset attempt');
      return false;
    }

    logger.warn('Emergency stop reset', {
      previousReason: this.stopReason,
      downtime: Date.now() - this.stopTimestamp.getTime()
    });

    this.isStopped = false;
    this.stopReason = null;
    this.stopTimestamp = null;

    return true;
  }

  /**
   * Check conditions and trigger if needed
   */
  async checkConditions(stats) {
    if (this.isStopped || !this.enabled) {
      return;
    }

    // Example conditions that could trigger emergency stop
    const conditions = [];

    // Check for excessive consecutive failures
    if (stats.consecutiveFailures >= 10) {
      conditions.push({
        reason: 'Excessive consecutive failures',
        metadata: { consecutiveFailures: stats.consecutiveFailures }
      });
    }

    // Check for abnormal loss rate
    if (stats.lossRate >= 0.8) { // 80% loss rate
      conditions.push({
        reason: 'Abnormal loss rate detected',
        metadata: { lossRate: stats.lossRate }
      });
    }

    // Trigger on first critical condition
    if (conditions.length > 0) {
      await this.trigger(conditions[0].reason, conditions[0].metadata);
    }
  }
}

module.exports = EmergencyStop;
