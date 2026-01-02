// MarketDataProvider - Provides realistic market conditions for backtesting
const logger = require('../utils/logger');

class MarketDataProvider {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.historicalData = new Map();
    this.marketPhases = this.initializeMarketPhases();
  }

  /**
   * Initialize different market phases with realistic characteristics
   */
  initializeMarketPhases() {
    return [
      {
        name: 'Bull Market - High Volatility',
        duration: 30, // days
        volatility: 0.8,
        liquidity: 0.9,
        competitionLevel: 0.7,
        gasPrice: 80,
        description: 'Strong uptrend with high trading volume and volatility'
      },
      {
        name: 'Consolidation - Normal Conditions',
        duration: 30,
        volatility: 0.4,
        liquidity: 0.7,
        competitionLevel: 0.5,
        gasPrice: 50,
        description: 'Sideways market with normal conditions'
      },
      {
        name: 'Bear Market - Low Volatility',
        duration: 30,
        volatility: 0.3,
        liquidity: 0.5,
        competitionLevel: 0.6,
        gasPrice: 40,
        description: 'Downtrend with reduced liquidity'
      },
      {
        name: 'Extreme Volatility - Crisis',
        duration: 15,
        volatility: 0.95,
        liquidity: 0.4,
        competitionLevel: 0.9,
        gasPrice: 150,
        description: 'Market crisis with extreme volatility and competition'
      },
      {
        name: 'Recovery - Increasing Activity',
        duration: 30,
        volatility: 0.6,
        liquidity: 0.8,
        competitionLevel: 0.6,
        gasPrice: 60,
        description: 'Market recovery with increasing activity'
      },
      {
        name: 'Low Activity - Weekend/Holiday',
        duration: 15,
        volatility: 0.2,
        liquidity: 0.3,
        competitionLevel: 0.3,
        gasPrice: 30,
        description: 'Low activity period with reduced opportunities'
      }
    ];
  }

  /**
   * Get market conditions for a specific date
   * @param {Date} date - Date to get conditions for
   */
  async getMarketConditions(date) {
    // Determine which market phase we're in based on simulation day
    const simulationDay = Math.floor((date - this.config.startDate) / (1000 * 60 * 60 * 24));
    const phase = this.getMarketPhase(simulationDay);

    // Add some randomness to make it more realistic
    const randomFactor = 0.2; // 20% random variation

    const conditions = {
      date: date.toISOString().split('T')[0],
      phase: phase.name,
      volatility: this.addRandomness(phase.volatility, randomFactor),
      liquidity: this.addRandomness(phase.liquidity, randomFactor),
      competitionLevel: this.addRandomness(phase.competitionLevel, randomFactor),
      gasPrice: Math.floor(this.addRandomness(phase.gasPrice, randomFactor * 2)),
      description: phase.description
    };

    // Clamp values to realistic ranges
    conditions.volatility = Math.max(0.1, Math.min(1.0, conditions.volatility));
    conditions.liquidity = Math.max(0.1, Math.min(1.0, conditions.liquidity));
    conditions.competitionLevel = Math.max(0.1, Math.min(1.0, conditions.competitionLevel));
    conditions.gasPrice = Math.max(20, Math.min(300, conditions.gasPrice));

    return conditions;
  }

  /**
   * Get market phase based on simulation day
   */
  getMarketPhase(simulationDay) {
    let cumulativeDays = 0;
    
    // Cycle through phases
    const cycleLength = this.marketPhases.reduce((sum, phase) => sum + phase.duration, 0);
    const dayInCycle = simulationDay % cycleLength;

    for (const phase of this.marketPhases) {
      if (dayInCycle < cumulativeDays + phase.duration) {
        return phase;
      }
      cumulativeDays += phase.duration;
    }

    // Fallback to first phase
    return this.marketPhases[0];
  }

  /**
   * Add random variation to a value
   */
  addRandomness(value, factor) {
    const variation = (Math.random() - 0.5) * 2 * factor;
    return value * (1 + variation);
  }

  /**
   * Get historical price data (simulated)
   * In a real implementation, this would fetch actual on-chain data
   */
  async getHistoricalPrices(tokenPair, date) {
    // Simulate price fetching
    return {
      tokenA: tokenPair[0],
      tokenB: tokenPair[1],
      price: 1.0 + (Math.random() - 0.5) * 0.1,
      timestamp: date
    };
  }

  /**
   * Get summary of all market phases
   */
  getMarketPhasesSummary() {
    return this.marketPhases.map(phase => ({
      name: phase.name,
      duration: phase.duration,
      description: phase.description
    }));
  }
}

module.exports = MarketDataProvider;
