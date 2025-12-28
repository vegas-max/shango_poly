# Bot Competition Guide

## Overview

This repository now includes a comprehensive competition framework to compare **Shango Poly** (backward architecture) vs **TITAN 2.0** (forward architecture) to determine which bot is more effective for production deployment.

## What Gets Tested

The competition runs 30 rounds where both bots compete head-to-head in:

- **Opportunity Detection**: How many arbitrage opportunities each bot finds
- **Validation Rate**: How thoroughly each bot validates opportunities
- **Execution Success**: How many opportunities each bot successfully executes
- **Speed**: How quickly each bot processes opportunities
- **Reliability**: Overall success rate and failure handling

## Architecture Comparison

### Shango Poly (Backward Architecture)
```
Layer 7: EXECUTION         → FlashLoanExecutor
Layer 6: TRANSACTION       → Transaction builder
Layer 5: VALIDATION        → Opportunity validator
Layer 4: CALCULATION       → FlashLoanCalculator
Layer 3: ROUTING           → DexInterface
Layer 2: PRICE AGGREGATION → PriceOracle
Layer 1: DATA FETCH        → OpportunityScanner
```

**Characteristics:**
- More thorough validation
- Complex profit calculations
- Multi-layer architecture
- Optimized for accuracy

### TITAN 2.0 (Forward Architecture)
```
Data → Price → Route → Execute
```

**Characteristics:**
- Faster execution
- Simpler validation
- Direct data flow
- Optimized for speed

## Running the Competition

### Quick Start

```bash
# Install dependencies
npm install

# Set up environment (if not already done)
cp .env.example .env
# Edit .env with your settings (PRIVATE_KEY not required for competition)

# Run the competition
npm run compete
```

### Advanced Usage

```bash
# Run with custom settings
node scripts/bot-competition.js
```

## Competition Parameters

- **Rounds**: 30 competitive rounds
- **Duration**: 10 seconds per round
- **Metrics Tracked**:
  - Scans performed
  - Opportunities detected
  - Opportunities validated
  - Trades executed
  - Success rate
  - Failures

## Scoring System

Each round uses a weighted scoring system:
- Detected opportunity: 1 point
- Validated opportunity: 2 points
- Executed trade: 5 points

The bot with the higher score wins the round.

## Results

After completion, you'll see:

1. **Round-by-round results**: Detailed stats for each round
2. **Overall statistics**: Total wins, performance metrics
3. **Production recommendation**: Clear guidance on which bot to deploy

Results are saved to `competition-results.json` for detailed analysis.

## Interpreting Results

### What to Look For

**Choose Shango Poly if:**
- Higher validation rate
- More consistent execution
- Better at complex multi-hop routes
- You prioritize accuracy over speed

**Choose TITAN 2.0 if:**
- Faster opportunity detection
- More opportunities found
- Simpler to maintain
- You prioritize speed over thoroughness

## Example Output

```
==================================================
FINAL COMPETITION RESULTS
==================================================

OVERALL WINNER: Shango Poly

--------------------------------------------------
Shango Poly (Backward Architecture):
  Round Wins: 18/30
  Total Detected: 245
  Total Validated: 198
  Total Executed: 156
  Avg Success Rate: 78.79%

TITAN 2.0 (Forward Architecture):
  Round Wins: 12/30
  Total Detected: 289
  Total Validated: 201
  Total Executed: 142
  Avg Success Rate: 70.65%

Ties: 0
--------------------------------------------------

PRODUCTION RECOMMENDATION:
✓ Shango Poly is recommended for production deployment
  Reasons:
  - Won 18 out of 30 rounds
  - Higher validation rate and execution success
  - More thorough opportunity analysis
```

## Notes

- Both bots run in **simulation mode** - no actual trades are executed
- The competition uses the same DEX interfaces and price oracles for fairness
- Network conditions don't affect results as both bots use the same data sources
- You don't need a deployed contract or real funds to run the competition

## Troubleshooting

**Issue**: Competition exits immediately
- Solution: Check that all dependencies are installed with `npm install`

**Issue**: Network connection errors
- Solution: The competition will continue even with network issues, using mock data

**Issue**: Results seem inconsistent
- Solution: Run multiple competitions to get average results

## Next Steps

After reviewing the competition results:

1. Check `competition-results.json` for detailed metrics
2. Review the winning bot's architecture
3. Consider your specific use case (speed vs accuracy)
4. Deploy the recommended bot for production testing
5. Monitor real-world performance

## Support

For questions or issues with the competition:
- Check the main README.md
- Review docs/TROUBLESHOOTING.md
- Check the detailed results in competition-results.json
