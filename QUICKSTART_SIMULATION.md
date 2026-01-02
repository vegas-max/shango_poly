# Quick Start - Backtesting Simulation

This guide will help you run your first backtesting simulation in under 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Run Your First Simulation

### Default 90-Day Simulation
```bash
npm run simulate
```

This will:
- Simulate 90 days of trading
- Start with 10 ETH balance
- Use your configured min profit and gas settings
- Take about 30-60 seconds to complete

### Custom Simulations

#### 30-Day Quick Test
```bash
SIMULATION_DAYS=30 npm run simulate
```

#### 180-Day Full Test (6 months)
```bash
SIMULATION_DAYS=180 npm run simulate
```

#### Custom Starting Balance
```bash
STARTING_BALANCE_ETH=20 npm run simulate
```

#### All Custom Parameters
```bash
SIMULATION_DAYS=120 STARTING_BALANCE_ETH=15 MIN_PROFIT_BPS=75 npm run simulate
```

## Step 3: Review Results

After simulation completes, you'll see:

### 1. Console Output
- Performance metrics (ROI, win rate, success rate)
- Risk analysis (drawdown, volatility)
- Weekly and monthly summaries
- **Honest verdict** - most important section!

### 2. Generated Files

**simulation-results.json**
- Complete simulation data
- All trades and metrics
- Detailed conclusions

**simulation-daily-results.csv**
- Daily performance data
- Import into Excel/Sheets for charts

## Step 4: Understand Your Results

### Key Metrics to Watch

| Metric | Good | Concerning | Bad |
|--------|------|------------|-----|
| **ROI** | >50% | 20-50% | <20% |
| **Win Rate** | >60% | 50-60% | <50% |
| **Success Rate** | >50% | 40-50% | <40% |
| **Max Drawdown** | <20% | 20-40% | >40% |

### What the Verdict Means

**✅ HIGHLY VIABLE**
- Deploy with proper risk management
- Start with small capital
- Monitor closely

**⚠️ MODERATELY VIABLE**
- Implement improvements first
- Test with minimal capital
- High risk/reward

**❌ NOT VIABLE**
- Do NOT deploy
- Major changes needed
- High probability of loss

## Step 5: Next Actions

### If Results Are Good (ROI > 50%, Success Rate > 50%)
1. Review HONEST_ASSESSMENT.md
2. Implement recommended improvements
3. Re-run simulation to verify
4. Paper trade with live data for 2 weeks
5. Deploy with 2-5 ETH test capital

### If Results Are Marginal (ROI 20-50%, Success Rate 40-50%)
1. Review critical warnings
2. Implement ALL priority improvements
3. Re-run simulation
4. Only deploy if significantly improved
5. Start with <2 ETH

### If Results Are Poor (ROI <20% or Success Rate <40%)
1. Do NOT deploy
2. Review what went wrong
3. Major redesign needed
4. Consider alternative strategies

## Common Questions

### Q: Why does my success rate look low?
A: This is realistic! Real MEV trading has 30-60% success rates due to competition, slippage, and front-running.

### Q: Is the ROI too high to be real?
A: The simulation shows what's POSSIBLE. Real results will likely be 30-50% lower due to factors not fully modeled.

### Q: Should I trust these results?
A: The simulation is realistic but optimistic. Real trading is harder. Use results as a best-case scenario.

### Q: What if I get different results each run?
A: Normal! Market conditions are randomized. Run 3-5 times and average the results.

### Q: Can I trust a "HIGHLY VIABLE" verdict?
A: It means the system has potential, but you must still:
- Implement improvements
- Test with small capital
- Monitor closely
- Be ready to shut down if unprofitable

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SIMULATION_DAYS | 90 | Days to simulate |
| STARTING_BALANCE_ETH | 10 | Starting capital |
| MIN_PROFIT_BPS | 50 | From .env (0.5%) |
| MAX_GAS_PRICE_GWEI | 150 | From .env |

## Example Outputs

### Good System
```
ROI: 275%
Win Rate: 72%
Success Rate: 58%
Max Drawdown: 15%
Verdict: ✅ HIGHLY VIABLE
```

### Marginal System
```
ROI: 45%
Win Rate: 58%
Success Rate: 42%
Max Drawdown: 35%
Verdict: ⚠️ MODERATELY VIABLE
```

### Poor System
```
ROI: -8%
Win Rate: 42%
Success Rate: 28%
Max Drawdown: 55%
Verdict: ❌ NOT VIABLE
```

## Tips for Better Results

1. **Run Multiple Simulations**: Results vary due to randomization
2. **Try Different Timeframes**: 30-day vs 90-day vs 180-day
3. **Adjust Parameters**: Test different min profit thresholds
4. **Read the Full Report**: Don't just look at ROI
5. **Be Honest**: If results are marginal, don't rationalize deployment

## Warning Signs to Watch

🚨 **DO NOT DEPLOY if you see**:
- Success rate < 35%
- Max drawdown > 50%
- Losing streaks > 10 days
- More losing days than profitable days
- Net profit despite low success rate (luck, not skill)

## Need Help?

1. Read SIMULATION.md for detailed guide
2. Read HONEST_ASSESSMENT.md for interpretation
3. Check docs/TROUBLESHOOTING.md for issues
4. Review the generated JSON file for details

## Remember

> "The simulation shows what's POSSIBLE, not what's PROBABLE."

Real trading is harder than simulation. Always:
- Start small
- Monitor daily
- Be ready to shut down
- Never invest more than you can lose
- Integrity over optimism

---

**Ready to start?**

```bash
npm run simulate
```

Then read your results carefully and make an informed decision.
