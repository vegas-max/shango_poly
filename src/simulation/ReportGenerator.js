// ReportGenerator - Generates comprehensive simulation reports
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ReportGenerator {
  constructor(results, config) {
    this.results = results;
    this.config = config;
  }

  /**
   * Generate and display comprehensive report
   */
  displayReport() {
    this.displayHeader();
    this.displayMetrics();
    this.displayRiskAnalysis();
    this.displayProfitabilityTimeline();
    this.displayConclusions();
    this.displayRecommendations();
    this.displayFooter();
  }

  /**
   * Display report header
   */
  displayHeader() {
    logger.info('');
    logger.info('='.repeat(100));
    logger.info('BACKTESTING SIMULATION RESULTS - HONEST ASSESSMENT'.padStart(65));
    logger.info('='.repeat(100));
    logger.info('');
  }

  /**
   * Display key metrics
   */
  displayMetrics() {
    const m = this.results.metrics;
    
    logger.info('📊 PERFORMANCE METRICS');
    logger.info('-'.repeat(100));
    logger.info(`Simulation Period:        ${m.totalDays} days`);
    logger.info(`Starting Balance:         ${m.startingBalance} ETH`);
    logger.info(`Ending Balance:           ${m.endingBalance} ETH`);
    logger.info(`Total Profit/Loss:        ${m.totalProfit} ETH (${m.roi}% ROI)`);
    logger.info('');
    logger.info(`Total Trades:             ${m.totalTrades}`);
    logger.info(`Successful Trades:        ${m.successfulTrades} (${m.successRate}%)`);
    logger.info(`Failed Trades:            ${m.failedTrades}`);
    logger.info('');
    logger.info(`Average Daily Profit:     ${m.avgDailyProfit} ETH`);
    logger.info(`Average Trades/Day:       ${m.avgTradesPerDay}`);
    logger.info(`Profit per Trade:         ${m.profitPerTrade} ETH`);
    logger.info('');
  }

  /**
   * Display risk analysis
   */
  displayRiskAnalysis() {
    const r = this.results.riskAnalysis;
    
    logger.info('⚠️  RISK ANALYSIS');
    logger.info('-'.repeat(100));
    logger.info(`Profit Volatility:        ${r.volatility} ETH (daily standard deviation)`);
    logger.info(`Maximum Drawdown:         ${r.maxDrawdown}%`);
    logger.info(`Max Losing Streak:        ${r.maxLosingStreak} days`);
    logger.info(`Risk-Adjusted Return:     ${r.riskAdjustedReturn}`);
    logger.info('');
    logger.info(`Profitable Days:          ${r.profitableDays} (${r.winRate}%)`);
    logger.info(`Losing Days:              ${r.losingDays}`);
    logger.info(`Break-Even Days:          ${r.breakEvenDays}`);
    logger.info('');
  }

  /**
   * Display profitability timeline
   */
  displayProfitabilityTimeline() {
    logger.info('📈 PROFITABILITY TIMELINE');
    logger.info('-'.repeat(100));
    
    // Weekly summary
    if (this.results.weeklyProfits.length > 0) {
      logger.info('');
      logger.info('Weekly Results:');
      logger.info('Week'.padEnd(8) + 'Period'.padEnd(30) + 'Net Profit'.padEnd(20) + 'Trades'.padEnd(10) + 'Avg Daily');
      logger.info('-'.repeat(100));
      
      this.results.weeklyProfits.forEach(week => {
        const weekNum = `Week ${week.weekNumber}`.padEnd(8);
        const period = `${week.startDate} to ${week.endDate}`.padEnd(30);
        const profit = `${week.netProfit} ETH`.padEnd(20);
        const trades = week.trades.toString().padEnd(10);
        const avgDaily = `${week.avgDailyProfit} ETH`;
        logger.info(weekNum + period + profit + trades + avgDaily);
      });
    }

    // Monthly summary
    if (this.results.monthlyProfits.length > 0) {
      logger.info('');
      logger.info('Monthly Results:');
      logger.info('Month'.padEnd(10) + 'Period'.padEnd(30) + 'Net Profit'.padEnd(20) + 'Trades'.padEnd(10) + 'Avg Daily');
      logger.info('-'.repeat(100));
      
      this.results.monthlyProfits.forEach(month => {
        const monthNum = `Month ${month.monthNumber}`.padEnd(10);
        const period = `${month.startDate} to ${month.endDate}`.padEnd(30);
        const profit = `${month.netProfit} ETH`.padEnd(20);
        const trades = month.trades.toString().padEnd(10);
        const avgDaily = `${month.avgDailyProfit} ETH`;
        logger.info(monthNum + period + profit + trades + avgDaily);
      });
    }
    
    logger.info('');
  }

  /**
   * Display conclusions
   */
  displayConclusions() {
    const c = this.results.conclusions;
    
    logger.info('🎯 HONEST ASSESSMENT & CONCLUSIONS');
    logger.info('-'.repeat(100));
    logger.info('');
    logger.info(`VIABILITY RATING: ${c.viability}`);
    logger.info('');
    logger.info('Recommendation:');
    logger.info(`  ${c.recommendation}`);
    logger.info('');
    
    logger.info('Key Findings:');
    c.keyFindings.forEach((finding, index) => {
      logger.info(`  ${index + 1}. ${finding}`);
    });
    logger.info('');

    if (c.warnings.length > 0) {
      logger.info('⚠️  CRITICAL WARNINGS:');
      c.warnings.forEach((warning, index) => {
        logger.info(`  ${index + 1}. ${warning}`);
      });
      logger.info('');
    }
  }

  /**
   * Display recommendations
   */
  displayRecommendations() {
    const c = this.results.conclusions;
    
    logger.info('💡 RECOMMENDED IMPROVEMENTS');
    logger.info('-'.repeat(100));
    
    if (c.improvements.length > 0) {
      c.improvements.forEach((improvement, index) => {
        if (improvement.includes('CRITICAL')) {
          logger.info(`  ${index + 1}. ⚠️  ${improvement}`);
        } else {
          logger.info(`  ${index + 1}. ${improvement}`);
        }
      });
    }
    logger.info('');
  }

  /**
   * Display footer
   */
  displayFooter() {
    logger.info('='.repeat(100));
    logger.info('WHY THIS SYSTEM COULD SUCCEED:'.padStart(65));
    logger.info('-'.repeat(100));
    logger.info('  ✓ Sophisticated backward architecture optimized for execution');
    logger.info('  ✓ Twin Turbo Rust engines for high-performance scanning (135K+ ops/sec)');
    logger.info('  ✓ Dynamic flash loan sizing based on pool TVL');
    logger.info('  ✓ Multi-DEX support for better arbitrage opportunities');
    logger.info('  ✓ Real-time gas optimization and price aggregation');
    logger.info('');
    logger.info('WHY THIS SYSTEM COULD FAIL:'.padStart(65));
    logger.info('-'.repeat(100));
    logger.info('  ✗ High MEV bot competition on Polygon network');
    logger.info('  ✗ Flash loan fees and gas costs eat into profits');
    logger.info('  ✗ Slippage and price impact on smaller pools');
    logger.info('  ✗ Front-running risk from other sophisticated bots');
    logger.info('  ✗ Market conditions can change rapidly reducing opportunities');
    logger.info('  ✗ Requires significant capital to make meaningful profits');
    logger.info('  ✗ Smart contract risks and potential exploits');
    logger.info('');
    logger.info('HONEST VERDICT:'.padStart(55));
    logger.info('-'.repeat(100));
    this.displayHonestVerdict();
    logger.info('='.repeat(100));
    logger.info('');
  }

  /**
   * Display honest verdict based on results
   */
  displayHonestVerdict() {
    const roi = parseFloat(this.results.metrics.roi);
    const successRate = parseFloat(this.results.metrics.successRate);
    const winRate = parseFloat(this.results.riskAnalysis.winRate);
    const maxDrawdown = parseFloat(this.results.riskAnalysis.maxDrawdown);

    logger.info('');
    
    // Special case: High ROI but low success rate
    if (roi > 100 && successRate < 50 && winRate > 70) {
      logger.info('  ⚠️  This system shows HIGH ROI but CRITICAL execution issues:');
      logger.info(`      - ROI of ${roi.toFixed(2)}% suggests good profit potential`);
      logger.info(`      - BUT success rate of ${successRate}% is too low for reliability`);
      logger.info(`      - Win rate of ${winRate}% shows good day-to-day consistency`);
      logger.info('  ⚠️  ANALYSIS: The few successful trades are very profitable, but most trades fail.');
      logger.info('      This pattern suggests:');
      logger.info('      - Poor trade execution/validation logic');
      logger.info('      - High slippage or front-running on failed trades');
      logger.info('      - Opportunity identification is good, but execution needs work');
      logger.info('  💡 RECOMMENDATION: Fix execution logic FIRST, then re-test');
      logger.info('      Priority improvements:');
      logger.info('      1. Better slippage protection');
      logger.info('      2. MEV protection (Flashbots)');
      logger.info('      3. Improved gas price optimization');
      logger.info('      4. Pre-execution liquidity validation');
    } else if (roi > 50 && successRate > 50 && winRate > 60) {
      logger.info('  ✅ This system shows STRONG profit potential in simulated conditions.');
      logger.info('  ✅ With proper risk management, production deployment is recommended.');
      logger.info('  ⚠️  However, real market conditions include additional challenges:');
      logger.info('      - Real MEV competition is fierce and constantly evolving');
      logger.info('      - Actual slippage may be higher than simulated');
      logger.info('      - Gas prices can spike unpredictably');
      logger.info('  💡 RECOMMENDATION: Start with SMALL capital and monitor closely');
    } else if (roi > 20 && (successRate > 40 || winRate > 60)) {
      logger.info('  ⚠️  This system shows MODERATE profit potential in simulated conditions.');
      logger.info('  ⚠️  Consider the following before production deployment:');
      logger.info('      - Implement ALL suggested improvements');
      logger.info('      - Test with minimal capital first');
      logger.info('      - Set strict stop-loss limits');
      logger.info('      - Monitor performance daily');
      logger.info('  💡 RECOMMENDATION: OPTIMIZE FIRST, then test with minimal capital');
    } else if (roi > 0) {
      logger.info('  ❌ This system shows MARGINAL profitability in simulated conditions.');
      logger.info('  ❌ Real market conditions will likely make this UNPROFITABLE:');
      logger.info('      - Higher competition than simulated');
      logger.info('      - Additional fees and costs not fully modeled');
      logger.info('      - Price impact and slippage usually worse than expected');
      logger.info('  💡 RECOMMENDATION: DO NOT deploy without MAJOR improvements');
    } else {
      logger.info('  ❌ This system is NOT PROFITABLE even in simulated conditions.');
      logger.info('  ❌ DO NOT deploy to production under any circumstances.');
      logger.info('  💡 RECOMMENDATION: Complete redesign needed, or abandon this strategy');
    }
    
    logger.info('');
    logger.info('  📌 INTEGRITY NOTE: These results are based on REALISTIC simulations');
    logger.info('     accounting for gas costs, slippage, competition, and market conditions.');
    logger.info('     Real results may vary significantly based on actual market dynamics.');
    logger.info('');
  }

  /**
   * Save report to file
   */
  async saveReport(filename) {
    const reportPath = path.join(process.cwd(), filename);
    const reportContent = {
      timestamp: new Date().toISOString(),
      config: {
        simulationPeriod: `${this.config.simulationDays} days`,
        startingBalance: this.config.startingBalanceEth + ' ETH',
        minProfitBps: this.config.minProfitBps,
        maxGasPriceGwei: this.config.maxGasPriceGwei
      },
      results: this.results
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportContent, null, 2));
      logger.info(`Full report saved to: ${reportPath}`);
      return reportPath;
    } catch (error) {
      logger.error('Failed to save report', { error: error.message });
      throw error;
    }
  }

  /**
   * Save CSV export of daily results
   */
  async saveDailyCSV(filename) {
    const csvPath = path.join(process.cwd(), filename);
    
    const headers = ['Date', 'Opportunities', 'Trades', 'Profit (ETH)', 'Gas Costs (ETH)', 'Net Profit (ETH)', 'Balance (ETH)', 'Success Rate (%)'];
    const rows = this.results.dailyProfits.map(day => [
      day.date,
      day.opportunities,
      day.tradesExecuted,
      day.profit,
      day.gasCosts,
      day.netProfit,
      day.balance,
      day.successRate
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    try {
      fs.writeFileSync(csvPath, csvContent);
      logger.info(`Daily results CSV saved to: ${csvPath}`);
      return csvPath;
    } catch (error) {
      logger.error('Failed to save CSV', { error: error.message });
      throw error;
    }
  }
}

module.exports = ReportGenerator;
