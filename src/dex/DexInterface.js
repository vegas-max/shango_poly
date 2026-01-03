// Layer 3: ROUTING - Finds best trading routes across DEXes
const logger = require('../utils/logger');

class DexInterface {
  constructor() {
    this.dexes = new Map();
    this.provider = null; // Will be set when first DEX is registered
  }

  /**
   * Register a DEX for routing
   * @param {string} name - DEX name
   * @param {Object} dex - DEX instance
   */
  registerDex(name, dex) {
    this.dexes.set(name, dex);
    // Set provider from first registered DEX
    if (!this.provider && dex.provider) {
      this.provider = dex.provider;
    }
    logger.info(`Registered DEX: ${name}`);
  }

  /**
   * Find best route for token swap across all DEXes
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @param {BigNumber} amountIn - Input amount
   * @returns {Object} Best route with DEX and price info
   */
  async findBestRoute(tokenIn, tokenOut, amountIn) {
    const routes = [];

    // Get quotes from all registered DEXes
    for (const [name, dex] of this.dexes) {
      try {
        const quote = await dex.getQuote(tokenIn, tokenOut, amountIn);
        routes.push({
          dex: name,
          amountOut: quote.amountOut,
          path: quote.path,
          priceImpact: quote.priceImpact
        });
      } catch (error) {
        logger.warn(`Failed to get quote from ${name}`, { error: error.message });
      }
    }

    // Sort by amount out (descending)
    routes.sort((a, b) => {
      if (b.amountOut.gt(a.amountOut)) return 1;
      if (b.amountOut.lt(a.amountOut)) return -1;
      return 0;
    });

    if (routes.length === 0) {
      throw new Error('No routes found');
    }

    logger.info('Found best route', {
      dex: routes[0].dex,
      amountOut: routes[0].amountOut.toString()
    });

    return routes[0];
  }

  /**
   * Find multi-hop arbitrage opportunities
   * @param {string} baseToken - Starting and ending token
   * @param {Array} intermediateTokens - Tokens to route through
   * @param {BigNumber} amount - Starting amount
   * @returns {Array} Arbitrage opportunities
   */
  async findArbitrageRoutes(baseToken, intermediateTokens, amount) {
    const opportunities = [];

    // Try different combinations of intermediate tokens
    for (const intermediate of intermediateTokens) {
      try {
        // Route: baseToken -> intermediate -> baseToken
        const route1 = await this.findBestRoute(baseToken, intermediate, amount);
        const route2 = await this.findBestRoute(intermediate, baseToken, route1.amountOut);

        const finalAmount = route2.amountOut;
        
        if (finalAmount.gt(amount)) {
          const profit = finalAmount.sub(amount);
          const profitBps = profit.mul(10000).div(amount);

          opportunities.push({
            path: [baseToken, intermediate, baseToken],
            dexes: [route1.dex, route2.dex],
            inputAmount: amount,
            outputAmount: finalAmount,
            profit,
            profitBps: profitBps.toNumber()
          });
        }
      } catch (error) {
        logger.debug(`Failed to find route through ${intermediate}`, { error: error.message });
      }
    }

    return opportunities;
  }

  /**
   * Get liquidity for a token pair on a specific DEX
   * @param {string} dexName - Name of the DEX
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @returns {BigNumber} Available liquidity
   */
  async getLiquidity(dexName, tokenIn, tokenOut) {
    const dex = this.dexes.get(dexName);
    if (!dex) {
      throw new Error(`DEX ${dexName} not registered`);
    }

    if (typeof dex.getLiquidity !== 'function') {
      throw new Error(`DEX ${dexName} does not support getLiquidity`);
    }

    return await dex.getLiquidity(tokenIn, tokenOut);
  }

  /**
   * Get price impact for a trade on a specific DEX
   * @param {string} dexName - Name of the DEX
   * @param {string} tokenIn - Input token address
   * @param {string} tokenOut - Output token address
   * @param {BigNumber} amount - Trade amount
   * @returns {number} Price impact percentage
   */
  async getPriceImpact(dexName, tokenIn, tokenOut, amount) {
    const dex = this.dexes.get(dexName);
    if (!dex) {
      throw new Error(`DEX ${dexName} not registered`);
    }

    if (typeof dex.getPriceImpact !== 'function') {
      throw new Error(`DEX ${dexName} does not support getPriceImpact`);
    }

    return await dex.getPriceImpact(tokenIn, tokenOut, amount);
  }

  /**
   * Get all registered DEX names
   * @returns {Array} DEX names
   */
  getRegisteredDexes() {
    return Array.from(this.dexes.keys());
  }
}

module.exports = DexInterface;
