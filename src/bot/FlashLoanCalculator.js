// Layer 4: CALCULATION - Calculates optimal flash loan sizes
const { ethers } = require('ethers');
const logger = require('../utils/logger');

class FlashLoanCalculator {
  constructor(aaveProvider) {
    this.aaveProvider = aaveProvider;
    this.maxFlashLoanPercentage = 0.15; // 15% of pool reserves
  }

  /**
   * Calculate optimal flash loan amount based on pool liquidity and profit potential
   * @param {string} asset - Token address
   * @param {Object} route - Trading route with DEX info
   * @returns {Object} Calculated loan details
   */
  async calculateOptimalLoan(asset, route) {
    try {
      // Get available liquidity from Aave
      const availableLiquidity = await this.getAvailableLiquidity(asset);
      
      // Calculate max flash loan amount (15% of pool)
      const maxFlashLoan = availableLiquidity.mul(15).div(100);
      
      // Calculate optimal amount based on price impact and profit
      const optimalAmount = await this.calculateOptimalAmount(
        asset,
        route,
        maxFlashLoan
      );

      logger.info('Calculated optimal flash loan', {
        asset,
        availableLiquidity: ethers.utils.formatUnits(availableLiquidity, 18),
        maxFlashLoan: ethers.utils.formatUnits(maxFlashLoan, 18),
        optimalAmount: ethers.utils.formatUnits(optimalAmount, 18)
      });

      return {
        asset,
        amount: optimalAmount,
        maxAmount: maxFlashLoan,
        availableLiquidity
      };
    } catch (error) {
      logger.error('Failed to calculate optimal loan', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available liquidity from Aave pool
   * @param {string} asset - Token address
   * @returns {BigNumber} Available liquidity
   */
  async getAvailableLiquidity(asset) {
    try {
      const reserveData = await this.aaveProvider.getReserveData(asset);
      return reserveData.availableLiquidity;
    } catch (error) {
      logger.error('Failed to get available liquidity', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate optimal amount considering price impact
   * @param {string} asset - Token address
   * @param {Object} route - Trading route
   * @param {BigNumber} maxAmount - Maximum flash loan amount
   * @returns {BigNumber} Optimal amount
   */
  async calculateOptimalAmount(asset, route, maxAmount) {
    // Start with maximum and work backwards to find optimal amount
    let optimalAmount = maxAmount;
    
    // For now, use a conservative approach: 50% of max
    // In production, this would involve complex calculations of:
    // - Price impact on each DEX
    // - Slippage tolerance
    // - Gas costs relative to profit
    optimalAmount = maxAmount.div(2);

    return optimalAmount;
  }

  /**
   * Calculate expected profit after fees
   * @param {BigNumber} amount - Flash loan amount
   * @param {number} profitBps - Profit in basis points
   * @returns {Object} Profit breakdown
   */
  calculateProfit(amount, profitBps) {
    const profit = amount.mul(profitBps).div(10000);
    const flashLoanFee = amount.mul(9).div(10000); // 0.09% Aave fee
    const netProfit = profit.sub(flashLoanFee);

    return {
      grossProfit: profit,
      flashLoanFee,
      netProfit,
      profitable: netProfit.gt(0)
    };
  }
}

module.exports = FlashLoanCalculator;
