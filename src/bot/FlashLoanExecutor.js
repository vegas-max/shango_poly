// Layer 7: EXECUTION - Executes flash loan arbitrage trades
const { ethers } = require('ethers');
const logger = require('../utils/logger');

class FlashLoanExecutor {
  constructor(provider, contractAddress, privateKey) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.contract = null;
  }

  async initialize(contractABI) {
    this.contract = new ethers.Contract(
      this.contractAddress,
      contractABI,
      this.wallet
    );
    logger.info('FlashLoanExecutor initialized');
  }

  /**
   * Execute a flash loan arbitrage trade
   * @param {Object} opportunity - Validated arbitrage opportunity
   * @returns {Object} Transaction result
   */
  async execute(opportunity) {
    logger.info('Executing flash loan arbitrage', {
      asset: opportunity.asset,
      amount: opportunity.amount.toString(),
      expectedProfit: opportunity.expectedProfit.toString()
    });

    try {
      const tx = await this.contract.executeArbitrage(
        opportunity.asset,
        opportunity.amount,
        opportunity.path,
        opportunity.dexes,
        {
          gasLimit: opportunity.gasLimit,
          gasPrice: opportunity.gasPrice
        }
      );

      logger.info('Transaction submitted', { hash: tx.hash });

      const receipt = await tx.wait();
      
      logger.info('Transaction confirmed', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status
      });

      return {
        success: receipt.status === 1,
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed,
        receipt
      };
    } catch (error) {
      logger.error('Execution failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Estimate gas for a flash loan transaction
   * @param {Object} opportunity - Arbitrage opportunity
   * @returns {BigNumber} Estimated gas
   */
  async estimateGas(opportunity) {
    try {
      const gasEstimate = await this.contract.estimateGas.executeArbitrage(
        opportunity.asset,
        opportunity.amount,
        opportunity.path,
        opportunity.dexes
      );
      return gasEstimate;
    } catch (error) {
      logger.error('Gas estimation failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = FlashLoanExecutor;
