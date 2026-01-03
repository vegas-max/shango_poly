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
    // Check if contract address is set and not zero address
    const isZeroAddress = this.contractAddress === '0x0000000000000000000000000000000000000000' 
                         || !this.contractAddress;
    
    if (isZeroAddress) {
      logger.warn('⚠️  Flash loan contract not deployed - running in SIMULATION ONLY mode');
      this.contract = null;
      return;
    }

    try {
      this.contract = new ethers.Contract(
        this.contractAddress,
        contractABI,
        this.wallet
      );
      
      // Verify contract exists by checking code
      const code = await this.provider.getCode(this.contractAddress);
      if (code === '0x' || code === '0x0') {
        logger.warn('⚠️  No contract code at address - running in SIMULATION ONLY mode');
        this.contract = null;
        return;
      }
      
      logger.info('FlashLoanExecutor initialized with contract at ' + this.contractAddress);
    } catch (error) {
      logger.error('Failed to initialize FlashLoanExecutor', { error: error.message });
      this.contract = null;
    }
  }

  /**
   * Simulate a transaction before broadcasting to validate it will succeed
   * @param {Object} opportunity - Arbitrage opportunity to simulate
   * @returns {Object} Simulation result with success status and details
   */
  async simulateTransaction(opportunity) {
    logger.info('Simulating transaction before broadcast', {
      asset: opportunity.asset,
      amount: opportunity.amount.toString()
    });

    // If no contract deployed, simulation always fails
    if (!this.contract) {
      return {
        success: false,
        error: 'Contract not deployed',
        reason: 'SIMULATION_MODE',
        message: 'Contract not deployed - running in simulation mode only'
      };
    }

    try {
      // Use callStatic to simulate the transaction without broadcasting
      const result = await this.contract.callStatic.executeArbitrage(
        opportunity.asset,
        opportunity.amount,
        opportunity.path,
        opportunity.dexes,
        {
          gasLimit: opportunity.gasLimit,
          gasPrice: opportunity.gasPrice
        }
      );

      logger.info('Transaction simulation successful', {
        result: result.toString()
      });

      return {
        success: true,
        simulationResult: result,
        message: 'Transaction simulation passed - safe to broadcast'
      };
    } catch (error) {
      logger.warn('Transaction simulation failed', {
        error: error.message,
        reason: error.reason || 'Unknown'
      });

      return {
        success: false,
        error: error.message,
        reason: error.reason,
        message: 'Transaction would fail - skipping broadcast'
      };
    }
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

    // If no contract deployed, cannot execute
    if (!this.contract) {
      logger.error('Cannot execute - contract not deployed');
      return {
        success: false,
        error: 'Contract not deployed - running in simulation mode only'
      };
    }

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
    // If no contract deployed, return a reasonable default
    if (!this.contract) {
      logger.debug('Contract not deployed, using default gas estimate');
      return ethers.BigNumber.from('500000'); // 500k gas default
    }

    try {
      const gasEstimate = await this.contract.estimateGas.executeArbitrage(
        opportunity.asset,
        opportunity.amount,
        opportunity.path,
        opportunity.dexes
      );
      return gasEstimate;
    } catch (error) {
      logger.warn('Gas estimation failed, using default', { error: error.message });
      // Return a reasonable default if estimation fails
      return ethers.BigNumber.from('500000');
    }
  }
}

module.exports = FlashLoanExecutor;
