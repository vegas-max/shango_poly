// BacktestingEngine - Simulates trading performance over historical time periods
const logger = require('../utils/logger');
const { ethers } = require('ethers');

class BacktestingEngine {
  constructor(config) {
    this.config = config;
    this.startDate = null;
    this.endDate = null;
    this.currentSimTime = null;
    this.results = {
      trades: [],
      dailyProfits: [],
      weeklyProfits: [],
      monthlyProfits: [],
      metrics: {},
      riskAnalysis: {},
      conclusions: {}
    };
    this.portfolio = {
      startingBalance: ethers.utils.parseEther(config.startingBalanceEth || '10'),
      currentBalance: null,
      trades: 0,
      successfulTrades: 0,
      failedTrades: 0
    };
  }

  /**
   * Initialize backtesting engine for specified time period
   * @param {Date} startDate - Start date for simulation
   * @param {Date} endDate - End date for simulation
   */
  async initialize(startDate, endDate) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.currentSimTime = new Date(startDate);
    this.portfolio.currentBalance = this.portfolio.startingBalance;

    const durationDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    logger.info('='.repeat(80));
    logger.info('BACKTESTING ENGINE INITIALIZED');
    logger.info('='.repeat(80));
    logger.info(`Simulation Period: ${durationDays} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
    logger.info(`Starting Balance: ${ethers.utils.formatEther(this.portfolio.startingBalance)} ETH`);
    logger.info('='.repeat(80));
  }

  /**
   * Simulate trading for the entire period
   * @param {Object} bot - Trading bot instance
   * @param {Object} marketDataProvider - Provider for historical market data
   */
  async runSimulation(bot, marketDataProvider) {
    logger.info('Starting backtesting simulation...\n');

    const totalDays = Math.floor((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
    let currentDay = 0;

    // Simulate day by day
    while (this.currentSimTime < this.endDate) {
      currentDay++;
      const dayStart = new Date(this.currentSimTime);
      
      // Progress indicator
      if (currentDay % 7 === 0) {
        const progress = ((currentDay / totalDays) * 100).toFixed(1);
        logger.info(`Simulation Progress: Day ${currentDay}/${totalDays} (${progress}%)`);
      }

      // Get market conditions for this day
      const marketConditions = await marketDataProvider.getMarketConditions(this.currentSimTime);
      
      // Simulate opportunities throughout the day
      const dailyResults = await this.simulateDay(bot, marketConditions);
      
      // Record daily results
      this.recordDailyResults(dayStart, dailyResults);
      
      // Move to next day
      this.currentSimTime.setDate(this.currentSimTime.getDate() + 1);
    }

    logger.info(`\nSimulation completed: ${totalDays} days simulated`);
    
    // Calculate final metrics
    await this.calculateMetrics();
    
    // Perform risk analysis
    await this.performRiskAnalysis();
    
    // Generate conclusions and recommendations
    await this.generateConclusions();

    return this.results;
  }

  /**
   * Simulate one day of trading
   * @param {Object} bot - Trading bot instance
   * @param {Object} marketConditions - Market conditions for the day
   */
  async simulateDay(bot, marketConditions) {
    const dayResults = {
      opportunities: 0,
      tradesExecuted: 0,
      profit: ethers.BigNumber.from(0),
      gasCosts: ethers.BigNumber.from(0),
      failedTrades: 0,
      trades: []
    };

    // Simulate multiple opportunities throughout the day
    const opportunitiesPerDay = this.calculateOpportunitiesPerDay(marketConditions);
    
    for (let i = 0; i < opportunitiesPerDay; i++) {
      const opportunity = this.generateOpportunity(marketConditions);
      dayResults.opportunities++;

      // Simulate bot decision making
      const tradeDecision = await this.simulateTradeDecision(bot, opportunity, marketConditions);
      
      if (tradeDecision.execute) {
        const tradeResult = await this.simulateTrade(opportunity, marketConditions, tradeDecision);
        
        dayResults.trades.push(tradeResult);
        dayResults.tradesExecuted++;
        
        if (tradeResult.success) {
          dayResults.profit = dayResults.profit.add(tradeResult.profit);
          this.portfolio.successfulTrades++;
        } else {
          dayResults.failedTrades++;
          this.portfolio.failedTrades++;
        }
        
        dayResults.gasCosts = dayResults.gasCosts.add(tradeResult.gasCost);
        this.portfolio.trades++;
      }
    }

    // Update portfolio balance
    const netProfit = dayResults.profit.sub(dayResults.gasCosts);
    this.portfolio.currentBalance = this.portfolio.currentBalance.add(netProfit);

    return dayResults;
  }

  /**
   * Calculate number of opportunities per day based on market conditions
   */
  calculateOpportunitiesPerDay(marketConditions) {
    // Base opportunities per day
    let opportunities = 5;

    // Adjust based on volatility (more volatility = more opportunities)
    opportunities += Math.floor(marketConditions.volatility * 10);

    // Adjust based on liquidity (more liquidity = more opportunities)
    opportunities += Math.floor(marketConditions.liquidity * 5);

    // Adjust based on competition (more bots = fewer opportunities we can capture)
    opportunities = Math.floor(opportunities * (1 - marketConditions.competitionLevel * 0.5));

    return Math.max(1, Math.min(opportunities, 50)); // Cap between 1-50 per day
  }

  /**
   * Generate a simulated arbitrage opportunity
   */
  generateOpportunity(marketConditions) {
    const baseTokens = this.config.baseTokens || ['USDC', 'WETH', 'WMATIC'];
    const intermediateTokens = this.config.intermediateTokens || ['USDT', 'DAI', 'WBTC'];

    // Random token pair
    const tokenA = baseTokens[Math.floor(Math.random() * baseTokens.length)];
    const tokenB = intermediateTokens[Math.floor(Math.random() * intermediateTokens.length)];

    // Calculate profit based on market conditions
    // Higher volatility = potentially higher profits but also more risk
    const baseProfitBps = 20 + Math.random() * 100; // 0.2% to 1%
    const volatilityMultiplier = 1 + (marketConditions.volatility * 2);
    const profitBps = baseProfitBps * volatilityMultiplier;

    // Adjust for competition
    const competitionAdjustedProfit = profitBps * (1 - marketConditions.competitionLevel * 0.3);

    return {
      path: [tokenA, tokenB, tokenA],
      dexes: ['quickswap', 'sushiswap'],
      profitBps: competitionAdjustedProfit,
      estimatedProfit: ethers.utils.parseEther((0.1 + Math.random() * 0.5).toString()),
      timestamp: new Date(this.currentSimTime),
      marketConditions: {
        volatility: marketConditions.volatility,
        liquidity: marketConditions.liquidity,
        gasPrice: marketConditions.gasPrice
      }
    };
  }

  /**
   * Simulate bot's decision whether to execute trade
   */
  async simulateTradeDecision(bot, opportunity, marketConditions) {
    // Check if profit meets minimum threshold
    if (opportunity.profitBps < this.config.minProfitBps) {
      return { execute: false, reason: 'Below minimum profit threshold' };
    }

    // Check if gas price is acceptable
    if (marketConditions.gasPrice > this.config.maxGasPriceGwei) {
      return { execute: false, reason: 'Gas price too high' };
    }

    // Simulate validation failure rate (some opportunities don't pan out)
    const validationSuccessRate = 0.7; // 70% of opportunities pass validation
    if (Math.random() > validationSuccessRate) {
      return { execute: false, reason: 'Failed validation' };
    }

    return {
      execute: true,
      loanAmount: ethers.utils.parseEther((10 + Math.random() * 40).toString())
    };
  }

  /**
   * Simulate trade execution with realistic outcomes
   */
  async simulateTrade(opportunity, marketConditions, tradeDecision) {
    // Calculate gas cost
    const avgGasUsed = 350000; // Average gas for flash loan arbitrage
    const gasCost = ethers.BigNumber.from(marketConditions.gasPrice)
      .mul(1e9) // Convert to wei
      .mul(avgGasUsed);

    // Simulate execution success rate
    // Factors: competition, slippage, front-running
    let successRate = 0.6; // Base 60% success rate
    
    // Adjust for competition (more competition = lower success)
    successRate *= (1 - marketConditions.competitionLevel * 0.4);
    
    // Adjust for volatility (high volatility = more slippage risk)
    successRate *= (1 - marketConditions.volatility * 0.2);

    const success = Math.random() < successRate;

    if (success) {
      // Calculate actual profit (accounting for slippage)
      const slippage = 0.1 + (marketConditions.volatility * 0.3); // 10-40% profit loss to slippage
      const actualProfitBps = opportunity.profitBps * (1 - slippage);
      const profit = tradeDecision.loanAmount
        .mul(Math.floor(actualProfitBps))
        .div(10000);

      return {
        success: true,
        profit: profit,
        gasCost: gasCost,
        netProfit: profit.sub(gasCost),
        opportunity: opportunity,
        slippage: slippage
      };
    } else {
      // Failed trade - lost gas only
      return {
        success: false,
        profit: ethers.BigNumber.from(0),
        gasCost: gasCost,
        netProfit: gasCost.mul(-1),
        opportunity: opportunity,
        reason: this.getFailureReason()
      };
    }
  }

  /**
   * Get random failure reason
   */
  getFailureReason() {
    const reasons = [
      'Front-run by competitor',
      'Slippage exceeded tolerance',
      'Liquidity dried up',
      'Transaction reverted',
      'Price moved before execution',
      'MEV bot competition'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Record daily results
   */
  recordDailyResults(date, dayResults) {
    this.results.dailyProfits.push({
      date: date.toISOString().split('T')[0],
      opportunities: dayResults.opportunities,
      tradesExecuted: dayResults.tradesExecuted,
      profit: ethers.utils.formatEther(dayResults.profit),
      gasCosts: ethers.utils.formatEther(dayResults.gasCosts),
      netProfit: ethers.utils.formatEther(dayResults.profit.sub(dayResults.gasCosts)),
      balance: ethers.utils.formatEther(this.portfolio.currentBalance),
      successRate: dayResults.tradesExecuted > 0 
        ? ((dayResults.tradesExecuted - dayResults.failedTrades) / dayResults.tradesExecuted * 100).toFixed(2)
        : 0
    });

    // Add to weekly results (every 7 days)
    if (this.results.dailyProfits.length % 7 === 0) {
      this.aggregateWeeklyResults();
    }

    // Add to monthly results (every 30 days)
    if (this.results.dailyProfits.length % 30 === 0) {
      this.aggregateMonthlyResults();
    }

    // Store individual trades
    this.results.trades.push(...dayResults.trades);
  }

  /**
   * Aggregate weekly results
   */
  aggregateWeeklyResults() {
    const lastSevenDays = this.results.dailyProfits.slice(-7);
    
    const weeklyProfit = lastSevenDays.reduce((sum, day) => sum + parseFloat(day.netProfit), 0);
    const weeklyTrades = lastSevenDays.reduce((sum, day) => sum + day.tradesExecuted, 0);
    const weeklyOpportunities = lastSevenDays.reduce((sum, day) => sum + day.opportunities, 0);

    this.results.weeklyProfits.push({
      weekNumber: this.results.weeklyProfits.length + 1,
      startDate: lastSevenDays[0].date,
      endDate: lastSevenDays[lastSevenDays.length - 1].date,
      netProfit: weeklyProfit.toFixed(6),
      trades: weeklyTrades,
      opportunities: weeklyOpportunities,
      avgDailyProfit: (weeklyProfit / 7).toFixed(6)
    });
  }

  /**
   * Aggregate monthly results
   */
  aggregateMonthlyResults() {
    const lastThirtyDays = this.results.dailyProfits.slice(-30);
    
    const monthlyProfit = lastThirtyDays.reduce((sum, day) => sum + parseFloat(day.netProfit), 0);
    const monthlyTrades = lastThirtyDays.reduce((sum, day) => sum + day.tradesExecuted, 0);
    const monthlyOpportunities = lastThirtyDays.reduce((sum, day) => sum + day.opportunities, 0);

    this.results.monthlyProfits.push({
      monthNumber: this.results.monthlyProfits.length + 1,
      startDate: lastThirtyDays[0].date,
      endDate: lastThirtyDays[lastThirtyDays.length - 1].date,
      netProfit: monthlyProfit.toFixed(6),
      trades: monthlyTrades,
      opportunities: monthlyOpportunities,
      avgDailyProfit: (monthlyProfit / 30).toFixed(6)
    });
  }

  /**
   * Calculate final performance metrics
   */
  async calculateMetrics() {
    const totalProfit = parseFloat(ethers.utils.formatEther(
      this.portfolio.currentBalance.sub(this.portfolio.startingBalance)
    ));
    
    const totalDays = this.results.dailyProfits.length;
    const roi = (totalProfit / parseFloat(ethers.utils.formatEther(this.portfolio.startingBalance))) * 100;
    
    this.results.metrics = {
      totalDays: totalDays,
      startingBalance: ethers.utils.formatEther(this.portfolio.startingBalance),
      endingBalance: ethers.utils.formatEther(this.portfolio.currentBalance),
      totalProfit: totalProfit.toFixed(6),
      roi: roi.toFixed(2),
      totalTrades: this.portfolio.trades,
      successfulTrades: this.portfolio.successfulTrades,
      failedTrades: this.portfolio.failedTrades,
      successRate: ((this.portfolio.successfulTrades / this.portfolio.trades) * 100).toFixed(2),
      avgDailyProfit: (totalProfit / totalDays).toFixed(6),
      avgTradesPerDay: (this.portfolio.trades / totalDays).toFixed(2),
      profitPerTrade: this.portfolio.successfulTrades > 0 
        ? (totalProfit / this.portfolio.successfulTrades).toFixed(6)
        : '0'
    };
  }

  /**
   * Perform comprehensive risk analysis
   */
  async performRiskAnalysis() {
    const dailyProfits = this.results.dailyProfits.map(d => parseFloat(d.netProfit));
    
    // Calculate volatility (standard deviation)
    const avgProfit = dailyProfits.reduce((a, b) => a + b, 0) / dailyProfits.length;
    const variance = dailyProfits.reduce((sum, profit) => sum + Math.pow(profit - avgProfit, 2), 0) / dailyProfits.length;
    const volatility = Math.sqrt(variance);

    // Calculate max drawdown
    let maxBalance = 0;
    let maxDrawdown = 0;
    this.results.dailyProfits.forEach(day => {
      const balance = parseFloat(day.balance);
      if (balance > maxBalance) maxBalance = balance;
      const drawdown = ((maxBalance - balance) / maxBalance) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Calculate losing streak
    let currentStreak = 0;
    let maxLosingStreak = 0;
    this.results.dailyProfits.forEach(day => {
      if (parseFloat(day.netProfit) < 0) {
        currentStreak++;
        if (currentStreak > maxLosingStreak) maxLosingStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // Risk-adjusted return (Sharpe-like ratio)
    const riskAdjustedReturn = volatility > 0 ? avgProfit / volatility : 0;

    this.results.riskAnalysis = {
      volatility: volatility.toFixed(6),
      maxDrawdown: maxDrawdown.toFixed(2),
      maxLosingStreak: maxLosingStreak,
      riskAdjustedReturn: riskAdjustedReturn.toFixed(4),
      profitableDays: dailyProfits.filter(p => p > 0).length,
      losingDays: dailyProfits.filter(p => p < 0).length,
      breakEvenDays: dailyProfits.filter(p => p === 0).length,
      winRate: ((dailyProfits.filter(p => p > 0).length / dailyProfits.length) * 100).toFixed(2)
    };
  }

  /**
   * Generate honest conclusions and recommendations
   */
  async generateConclusions() {
    const roi = parseFloat(this.results.metrics.roi);
    const winRate = parseFloat(this.results.riskAnalysis.winRate);
    const maxDrawdown = parseFloat(this.results.riskAnalysis.maxDrawdown);
    const successRate = parseFloat(this.results.metrics.successRate);

    let viability = 'UNKNOWN';
    let recommendation = '';
    let warnings = [];
    let improvements = [];

    // Determine viability
    if (roi > 50 && winRate > 60 && maxDrawdown < 30 && successRate > 50) {
      viability = 'HIGHLY VIABLE';
      recommendation = 'This system shows strong profitability potential with acceptable risk levels. Recommended for production deployment with proper risk management.';
    } else if (roi > 20 && winRate > 50 && maxDrawdown < 50) {
      viability = 'MODERATELY VIABLE';
      recommendation = 'This system shows potential but requires optimization. Consider implementing suggested improvements before production deployment.';
    } else if (roi > 0 && winRate > 40) {
      viability = 'MARGINALLY VIABLE';
      recommendation = 'This system is barely profitable. Significant improvements needed before production deployment is recommended.';
    } else {
      viability = 'NOT VIABLE';
      recommendation = 'This system is not profitable in current market conditions. Do NOT deploy to production without major changes.';
    }

    // Identify warnings
    if (maxDrawdown > 40) {
      warnings.push(`High maximum drawdown (${maxDrawdown.toFixed(2)}%) indicates significant capital at risk`);
    }
    if (winRate < 50) {
      warnings.push(`Low win rate (${winRate}%) means more losing days than winning days`);
    }
    if (successRate < 40) {
      warnings.push(`Low trade success rate (${successRate}%) indicates poor execution or validation`);
    }
    if (parseFloat(this.results.riskAnalysis.maxLosingStreak) > 7) {
      warnings.push(`Long losing streaks (${this.results.riskAnalysis.maxLosingStreak} days) can deplete capital quickly`);
    }

    // Suggest improvements
    improvements.push('Implement dynamic profit thresholds based on market volatility');
    improvements.push('Add MEV protection mechanisms (flashbots, private transactions)');
    improvements.push('Optimize gas price strategies to reduce failed transactions');
    improvements.push('Implement better opportunity validation to increase success rate');
    improvements.push('Add liquidity depth analysis before execution');
    improvements.push('Consider multi-pool routing for better prices');
    
    if (successRate < 60) {
      improvements.push('CRITICAL: Improve trade execution logic - current success rate is too low');
    }
    if (maxDrawdown > 30) {
      improvements.push('CRITICAL: Implement stop-loss mechanisms to limit drawdowns');
    }

    this.results.conclusions = {
      viability,
      recommendation,
      warnings,
      improvements,
      keyFindings: [
        `Over ${this.results.metrics.totalDays} days, the system generated ${this.results.metrics.totalProfit} ETH profit (${roi.toFixed(2)}% ROI)`,
        `Win rate of ${winRate}% with ${this.results.riskAnalysis.profitableDays} profitable days`,
        `Trade success rate of ${successRate}% (${this.results.metrics.successfulTrades}/${this.results.metrics.totalTrades} trades)`,
        `Maximum drawdown of ${maxDrawdown.toFixed(2)}% indicates ${maxDrawdown > 30 ? 'HIGH' : maxDrawdown > 20 ? 'MODERATE' : 'LOW'} risk`,
        `Average daily profit of ${this.results.metrics.avgDailyProfit} ETH suggests ${parseFloat(this.results.metrics.avgDailyProfit) > 0.1 ? 'GOOD' : 'POOR'} consistency`
      ]
    };
  }

  /**
   * Get full results
   */
  getResults() {
    return this.results;
  }
}

module.exports = BacktestingEngine;
