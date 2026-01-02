# Backtesting Simulation Guide

## Overview

The Shango Poly backtesting simulation provides a comprehensive, **honest assessment** of the arbitrage system's profitability using **REAL historical on-chain data from the Polygon network** over periods ranging from 90 days to 6 months.

## What the Simulation Does

### 1. Real On-Chain Data Integration (NEW!)

The simulation now uses **actual historical data** from the Polygon blockchain:

- **Real Gas Prices**: Fetches actual gas prices from historical Polygon blocks
- **Real DEX Prices**: Queries historical prices from QuickSwap and SushiSwap routers
- **Real Arbitrage Opportunities**: Calculates actual price differences that existed between DEXes
- **Real Market Conditions**: Derives volatility, liquidity, and competition from on-chain data
- **Historical Block Data**: Uses actual block timestamps and network conditions

**Data Sources:**
- Polygon RPC for historical block data
- DEX router contracts for historical price quotes
- On-chain liquidity and volume indicators

### 2. Market Condition Analysis

The simulation analyzes real market phases based on on-chain data:
- **Volatility**: Calculated from actual price movements
- **Liquidity**: Derived from DEX reserves and trading activity
- **Competition**: Estimated from volatility and volume patterns
- **Gas Prices**: Real historical gas costs from Polygon blocks
- **Market Phase**: Automatically classified (Bull/Bear/Consolidation/Crisis/Recovery/Low Activity)

### 3. Realistic Cost Modeling
- **Gas Costs**: Uses real historical gas prices from Polygon
- **Slippage**: Models price impact based on actual volatility (10-40% profit erosion)
- **MEV Competition**: Accounts for competition from other bots
- **Execution Failure**: Realistic success rates based on real market conditions

### 4. Comprehensive Analysis
- **Daily Profitability Tracking**: Every day's performance with real data
- **Weekly Aggregation**: 7-day performance summaries
- **Monthly Aggregation**: 30-day performance summaries
- **Risk Metrics**: Volatility, drawdown, losing streaks
- **Success Rates**: Trade execution and validation success

## Running the Simulation

### Quick Start

```bash
# Run 90-day simulation with REAL on-chain data (default)
npm run simulate

# Or directly:
node scripts/run-simulation.js
```

### Custom Configuration

```bash
# 180-day simulation (6 months) with real data
SIMULATION_DAYS=180 npm run simulate

# 120-day simulation with 20 ETH starting balance
SIMULATION_DAYS=120 STARTING_BALANCE_ETH=20 npm run simulate

# Use synthetic data for comparison (old behavior)
USE_REAL_DATA=false npm run simulate

# Custom profit threshold and gas limit
MIN_PROFIT_BPS=100 MAX_GAS_PRICE_GWEI=200 npm run simulate
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMULATION_DAYS` | 90 | Number of days to simulate |
| `STARTING_BALANCE_ETH` | 10 | Starting capital in ETH |
| `USE_REAL_DATA` | true | Use real on-chain historical data |
| `MIN_PROFIT_BPS` | 50 | Minimum profit threshold (0.5%) |
| `MAX_GAS_PRICE_GWEI` | 150 | Maximum acceptable gas price |

## Understanding the Results

### Viability Ratings

1. **HIGHLY VIABLE**
   - ROI > 50%
   - Win rate > 60%
   - Max drawdown < 30%
   - Trade success > 50%
   - **Recommendation**: Deploy with proper risk management

2. **MODERATELY VIABLE**
   - ROI > 20%
   - Win rate > 50%
   - Max drawdown < 50%
   - **Recommendation**: Optimize first, then test with small capital

3. **MARGINALLY VIABLE**
   - ROI > 0%
   - Win rate > 40%
   - **Recommendation**: Major improvements needed

4. **NOT VIABLE**
   - ROI ≤ 0%
   - **Recommendation**: Do not deploy

### Key Metrics Explained

**Performance Metrics:**
- **ROI (Return on Investment)**: Total percentage return over the period
- **Total Profit/Loss**: Absolute profit in ETH
- **Success Rate**: Percentage of executed trades that were profitable
- **Avg Daily Profit**: Consistency indicator

**Risk Metrics:**
- **Volatility**: Daily profit standard deviation (higher = more risk)
- **Max Drawdown**: Largest peak-to-trough decline (capital at risk)
- **Max Losing Streak**: Longest consecutive losing period
- **Win Rate**: Percentage of profitable days
- **Risk-Adjusted Return**: Profit relative to volatility (Sharpe-like ratio)

### Output Files

After simulation, you'll get:

1. **simulation-results.json**
   - Complete simulation data
   - All trades and daily results
   - Full metrics and analysis
   - Conclusions and recommendations

2. **simulation-daily-results.csv**
   - Daily performance data
   - Import into Excel/Google Sheets
   - Create custom charts and analysis

## Honest Assessment Framework

The simulation provides brutally honest conclusions based on:

### Why the System Could Succeed ✓
- Sophisticated backward architecture
- High-performance Rust engines (135K+ ops/sec)
- Dynamic flash loan sizing
- Multi-DEX arbitrage opportunities
- Real-time optimization

### Why the System Could Fail ✗
- Intense MEV bot competition
- Flash loan and gas fees
- Slippage on smaller pools
- Front-running risks
- Rapid market condition changes
- Requires significant capital
- Smart contract vulnerabilities

### Critical Warnings

The simulation identifies:
- High capital risk (drawdown > 40%)
- Poor win rates (< 50%)
- Low execution success (< 40%)
- Extended losing streaks (> 7 days)

### Recommended Improvements

Based on results, you'll get specific suggestions:
- Dynamic profit thresholds
- MEV protection (Flashbots)
- Gas optimization strategies
- Better validation logic
- Liquidity depth analysis
- Multi-pool routing
- Stop-loss mechanisms

## Real-World Considerations

### Simulation vs Reality

**What the Simulation Models (with Real Data):**
✓ **REAL historical gas prices** from Polygon blocks
✓ **REAL DEX prices** from QuickSwap and SushiSwap
✓ **REAL arbitrage opportunities** that existed historically
✓ Real market volatility from on-chain data
✓ Real competition effects based on historical patterns
✓ Slippage and price impact modeling
✓ Execution failures based on real conditions

**What's Still Different in Live Trading:**
⚠️ MEV competition has evolved (new bots since historical data)
⚠️ Network conditions can change unexpectedly
⚠️ Smart contract risks exist (bugs, exploits)
⚠️ Future market conditions differ from historical
⚠️ Regulatory considerations
⚠️ Black swan events not in historical data

**Accuracy Improvements with Real Data:**
- Gas cost predictions are now based on actual historical prices
- Opportunity identification uses real price differences that existed
- Market phase classification is data-driven, not synthetic
- Results are more representative of actual trading conditions

### Production Deployment Checklist

Before deploying based on simulation results:

1. **✓ Simulation shows profitability** (ROI > 20%)
2. **✓ Risk metrics are acceptable** (drawdown < 40%)
3. **✓ All improvements implemented**
4. **✓ Smart contracts audited**
5. **✓ Start with minimal capital**
6. **✓ Set strict stop-loss limits**
7. **✓ Monitor daily performance**
8. **✓ Have exit strategy defined**

## Example Scenarios

### Scenario 1: Highly Profitable System
```
ROI: 75%
Win Rate: 65%
Success Rate: 55%
Max Drawdown: 25%

Verdict: HIGHLY VIABLE
Recommendation: Deploy with 5-10 ETH, monitor for 2 weeks
```

### Scenario 2: Marginally Profitable
```
ROI: 8%
Win Rate: 45%
Success Rate: 38%
Max Drawdown: 48%

Verdict: MARGINALLY VIABLE
Recommendation: Improve validation and execution logic
```

### Scenario 3: Not Profitable
```
ROI: -15%
Win Rate: 35%
Success Rate: 30%
Max Drawdown: 65%

Verdict: NOT VIABLE
Recommendation: Major redesign or abandon strategy
```

## Frequently Asked Questions

### Q: How accurate is the simulation?
A: The simulation models realistic conditions but cannot predict actual results. Real markets include additional complexities and risks.

### Q: What starting balance should I use?
A: Start with at least 10 ETH for the simulation. For production, begin with the minimum you're willing to lose completely.

### Q: How long should I simulate?
A: Minimum 90 days to see various market conditions. 180 days (6 months) provides better statistical significance.

### Q: What if results are unprofitable?
A: The simulation is designed to be honest. If unprofitable, either implement improvements and re-test, or do not deploy.

### Q: Can I trust the recommendations?
A: Yes. The system provides honest, data-driven recommendations. Your financial safety is prioritized over optimistic projections.

## Support and Next Steps

After running the simulation:

1. **Review all output carefully**
2. **Understand each metric**
3. **Implement critical improvements**
4. **Re-run simulation to verify**
5. **If viable, test with minimal capital**
6. **Monitor and adjust continuously**

**Remember**: This is high-risk trading. Never invest more than you can afford to lose completely.
