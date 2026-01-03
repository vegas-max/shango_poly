// Real-time pool data provider for DEXes
const { ethers } = require('ethers');
const logger = require('./logger');

class PoolDataProvider {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.wsProvider = null;
    this.poolCache = new Map();
    this.cacheTimeout = config?.poolUpdateIntervalMs || 10000;
    this.isWebSocketEnabled = config?.useWebSocket || false;
    this.subscriptions = new Map();
    
    // UniswapV2 Pair ABI (used by QuickSwap and SushiSwap)
    this.pairABI = [
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() external view returns (address)',
      'function token1() external view returns (address)',
      'event Sync(uint112 reserve0, uint112 reserve1)'
    ];
    
    // Factory ABI for getting pair addresses
    this.factoryABI = [
      'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ];
  }

  /**
   * Initialize WebSocket connection if enabled
   */
  async initializeWebSocket(wsUrl) {
    if (!this.isWebSocketEnabled || !wsUrl) {
      logger.info('WebSocket disabled or URL not provided, using polling mode');
      return;
    }

    try {
      this.wsProvider = new ethers.providers.WebSocketProvider(wsUrl);
      await this.wsProvider.ready;
      logger.info('✅ WebSocket connection established for real-time pool data');
      
      // Set up reconnection logic
      this.wsProvider._websocket.on('close', () => {
        logger.warn('WebSocket connection closed, reconnecting...');
        setTimeout(() => this.initializeWebSocket(wsUrl), 5000);
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket, falling back to polling', { error: error.message });
      this.isWebSocketEnabled = false;
      this.wsProvider = null;
    }
  }

  /**
   * Get pool address for a token pair from factory
   */
  async getPairAddress(factoryAddress, tokenA, tokenB) {
    const cacheKey = `pair-${factoryAddress}-${tokenA}-${tokenB}`;
    const cached = this.poolCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 3600000) { // Cache for 1 hour
      return cached.address;
    }

    try {
      const factory = new ethers.Contract(factoryAddress, this.factoryABI, this.provider);
      const pairAddress = await factory.getPair(tokenA, tokenB);
      
      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      
      this.poolCache.set(cacheKey, {
        address: pairAddress,
        timestamp: Date.now()
      });
      
      return pairAddress;
    } catch (error) {
      logger.warn('Failed to get pair address', { 
        factory: factoryAddress,
        tokenA,
        tokenB,
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Get real-time reserves for a pool
   */
  async getPoolReserves(dexName, tokenA, tokenB, factoryAddress) {
    const cacheKey = `reserves-${dexName}-${tokenA}-${tokenB}`;
    const cached = this.poolCache.get(cacheKey);
    
    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Get pair address
      const pairAddress = await this.getPairAddress(factoryAddress, tokenA, tokenB);
      if (!pairAddress) {
        logger.debug(`No pool found for ${dexName}: ${tokenA}/${tokenB}`);
        return null;
      }

      // Get reserves from the pair contract
      const pair = new ethers.Contract(pairAddress, this.pairABI, this.provider);
      const [reserve0, reserve1, blockTimestampLast] = await pair.getReserves();
      const token0 = await pair.token0();
      
      // Determine which reserve corresponds to which token
      const isToken0 = token0.toLowerCase() === tokenA.toLowerCase();
      const reserveA = isToken0 ? reserve0 : reserve1;
      const reserveB = isToken0 ? reserve1 : reserve0;

      const reserveData = {
        pairAddress,
        tokenA,
        tokenB,
        token0Address: token0, // Store for WebSocket updates
        reserveA,
        reserveB,
        blockTimestampLast,
        timestamp: Date.now()
      };

      // Cache the data
      this.poolCache.set(cacheKey, {
        data: reserveData,
        timestamp: Date.now()
      });

      // Set up WebSocket subscription if enabled and not already subscribed
      if (this.isWebSocketEnabled && this.wsProvider && !this.subscriptions.has(cacheKey)) {
        this.subscribeToPoolUpdates(pair, cacheKey);
      }

      return reserveData;
    } catch (error) {
      logger.warn('Failed to get pool reserves', {
        dex: dexName,
        tokenA,
        tokenB,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Subscribe to real-time pool updates via WebSocket
   */
  subscribeToPoolUpdates(pair, cacheKey) {
    try {
      const wsContract = pair.connect(this.wsProvider);
      
      const filter = wsContract.filters.Sync();
      wsContract.on(filter, (reserve0, reserve1, event) => {
        logger.debug('Pool reserves updated', {
          cacheKey,
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString()
        });

        // Update cache with new reserves
        const cached = this.poolCache.get(cacheKey);
        if (cached && cached.data) {
          // Determine which reserve corresponds to which token
          const isToken0 = cached.data.token0Address.toLowerCase() === cached.data.tokenA.toLowerCase();
          
          cached.data.reserveA = isToken0 ? reserve0 : reserve1;
          cached.data.reserveB = isToken0 ? reserve1 : reserve0;
          cached.data.timestamp = Date.now();
          cached.timestamp = Date.now();
        }
      });

      this.subscriptions.set(cacheKey, wsContract);
      logger.debug('Subscribed to pool updates', { cacheKey });
    } catch (error) {
      logger.warn('Failed to subscribe to pool updates', { 
        cacheKey,
        error: error.message 
      });
    }
  }

  /**
   * Get liquidity in USD for a pool (if price feeds available)
   */
  async getPoolLiquidityUSD(dexName, tokenA, tokenB, factoryAddress, priceOracle) {
    const reserves = await this.getPoolReserves(dexName, tokenA, tokenB, factoryAddress);
    if (!reserves) {
      return null;
    }

    try {
      // This would integrate with a price oracle to convert reserves to USD
      // For now, return the raw reserves
      return {
        reserveA: reserves.reserveA,
        reserveB: reserves.reserveB,
        // USD values would require price oracle integration
        liquidityUSD: null
      };
    } catch (error) {
      logger.warn('Failed to calculate liquidity USD', { error: error.message });
      return null;
    }
  }

  /**
   * Clean up WebSocket connections
   */
  async cleanup() {
    if (this.wsProvider) {
      logger.info('Closing WebSocket connections...');
      
      // Remove all event listeners
      for (const [key, contract] of this.subscriptions) {
        try {
          contract.removeAllListeners();
        } catch (error) {
          logger.warn('Failed to remove listeners', { key, error: error.message });
        }
      }
      
      this.subscriptions.clear();
      
      // Close WebSocket connection
      try {
        await this.wsProvider.destroy();
      } catch (error) {
        logger.warn('Failed to close WebSocket', { error: error.message });
      }
      
      this.wsProvider = null;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.poolCache.size,
      subscriptions: this.subscriptions.size,
      webSocketEnabled: this.isWebSocketEnabled,
      webSocketConnected: this.wsProvider !== null
    };
  }
}

module.exports = PoolDataProvider;
