// UniswapV3 DEX implementation
const { ethers } = require('ethers');
const logger = require('../utils/logger');

class UniswapV3Dex {
  constructor(provider, config, poolDataProvider = null) {
    this.provider = provider;
    this.config = config;
    this.routerAddress = config.router;
    this.quoterAddress = config.quoter;
    this.factoryAddress = config.factory;
    this.poolDataProvider = poolDataProvider;
    
    // Quoter ABI for getting quotes
    this.quoterABI = [
      'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
    ];
    
    // Router ABI for swaps
    this.routerABI = [
      'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
    ];
    
    // Factory ABI for getting pools
    this.factoryABI = [
      'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
    ];
    
    // Pool ABI for getting data
    this.poolABI = [
      'function liquidity() external view returns (uint128)',
      'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
      'function token0() external view returns (address)',
      'function token1() external view returns (address)'
    ];
    
    this.quoter = new ethers.Contract(
      this.quoterAddress,
      this.quoterABI,
      provider
    );
    
    this.router = new ethers.Contract(
      this.routerAddress,
      this.routerABI,
      provider
    );
    
    this.factory = new ethers.Contract(
      this.factoryAddress,
      this.factoryABI,
      provider
    );
    
    // Fee tiers available on Uniswap V3
    this.feeTiers = config.fees || [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  }

  /**
   * Set pool data provider for real-time data
   */
  setPoolDataProvider(poolDataProvider) {
    this.poolDataProvider = poolDataProvider;
    logger.debug('Pool data provider set for UniswapV3');
  }

  /**
   * Get quote for token swap
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @param {BigNumber} amountIn - Input amount
   * @returns {Object} Quote with output amount and path
   */
  async getQuote(tokenIn, tokenOut, amountIn) {
    try {
      // Try each fee tier and get the best quote
      let bestQuote = null;
      let bestFee = null;
      
      for (const fee of this.feeTiers) {
        try {
          // Check if pool exists for this fee tier
          const poolAddress = await this.factory.getPool(tokenIn, tokenOut, fee);
          if (poolAddress === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          // Get quote using callStatic to avoid state changes
          const amountOut = await this.quoter.callStatic.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0 // sqrtPriceLimitX96 = 0 means no price limit
          );
          
          if (!bestQuote || amountOut.gt(bestQuote)) {
            bestQuote = amountOut;
            bestFee = fee;
          }
        } catch (error) {
          // Pool might not exist or not have enough liquidity
          logger.debug(`UniswapV3 quote failed for fee tier ${fee}`, { error: error.message });
        }
      }
      
      if (!bestQuote) {
        throw new Error('No valid quote found for any fee tier');
      }
      
      const priceImpact = this.calculatePriceImpact(amountIn, bestQuote);

      return {
        amountOut: bestQuote,
        path: [tokenIn, tokenOut],
        fee: bestFee,
        priceImpact,
        dex: 'uniswapv3'
      };
    } catch (error) {
      logger.error('UniswapV3 quote failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate price impact
   * @param {BigNumber} amountIn - Input amount
   * @param {BigNumber} amountOut - Output amount
   * @returns {number} Price impact in basis points
   */
  calculatePriceImpact(amountIn, amountOut) {
    // Simplified price impact calculation
    // In production, this would use pool reserves and sqrt price
    return 100; // 1% placeholder
  }

  /**
   * Get liquidity for a token pair
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @returns {BigNumber} Available liquidity
   */
  async getLiquidity(tokenIn, tokenOut) {
    try {
      // Get liquidity from the most liquid pool (highest fee tier usually)
      let maxLiquidity = ethers.BigNumber.from(0);
      
      for (const fee of this.feeTiers) {
        try {
          const poolAddress = await this.factory.getPool(tokenIn, tokenOut, fee);
          if (poolAddress === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          const pool = new ethers.Contract(poolAddress, this.poolABI, this.provider);
          const liquidity = await pool.liquidity();
          
          if (liquidity.gt(maxLiquidity)) {
            maxLiquidity = liquidity;
          }
        } catch (error) {
          logger.debug(`Failed to get liquidity for fee tier ${fee}`, { error: error.message });
        }
      }
      
      if (maxLiquidity.eq(0)) {
        // Return default if no pools found
        return ethers.utils.parseUnits('10000', 18);
      }
      
      return maxLiquidity;
    } catch (error) {
      logger.warn('UniswapV3 getLiquidity failed', { error: error.message });
      return ethers.utils.parseUnits('10000', 18);
    }
  }

  /**
   * Get price impact for a specific trade amount
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @param {BigNumber} amount - Trade amount
   * @returns {number} Price impact percentage
   */
  async getPriceImpact(tokenIn, tokenOut, amount) {
    try {
      // Get quotes for actual amount and small reference amount
      const actualQuote = await this.getQuote(tokenIn, tokenOut, amount);
      const actualOut = actualQuote.amountOut;
      
      // Use 1% of amount as reference
      const refAmount = amount.div(100).gt(0) ? amount.div(100) : ethers.BigNumber.from(1);
      const refQuote = await this.getQuote(tokenIn, tokenOut, refAmount);
      const refOut = refQuote.amountOut;
      
      // Calculate expected output if there was no price impact
      const expectedOut = refOut.mul(100);
      
      // Price impact = (expected - actual) / expected * 100
      if (expectedOut.gt(0)) {
        const impact = expectedOut.sub(actualOut).mul(10000).div(expectedOut);
        return impact.toNumber() / 100; // Convert to percentage
      }
      
      return 1.0; // Default 1% if calculation fails
    } catch (error) {
      logger.warn('UniswapV3 getPriceImpact failed', { error: error.message });
      return 1.0; // Default 1% on error
    }
  }
  
  /**
   * Get pool information for a specific fee tier
   * @param {string} tokenA - First token address
   * @param {string} tokenB - Second token address
   * @param {number} fee - Fee tier
   * @returns {Object} Pool information
   */
  async getPoolInfo(tokenA, tokenB, fee) {
    try {
      const poolAddress = await this.factory.getPool(tokenA, tokenB, fee);
      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      
      const pool = new ethers.Contract(poolAddress, this.poolABI, this.provider);
      const [liquidity, slot0, token0, token1] = await Promise.all([
        pool.liquidity(),
        pool.slot0(),
        pool.token0(),
        pool.token1()
      ]);
      
      return {
        poolAddress,
        token0,
        token1,
        fee,
        liquidity,
        sqrtPriceX96: slot0.sqrtPriceX96,
        tick: slot0.tick
      };
    } catch (error) {
      logger.warn('Failed to get pool info', { 
        tokenA, 
        tokenB, 
        fee,
        error: error.message 
      });
      return null;
    }
  }
}

module.exports = UniswapV3Dex;
