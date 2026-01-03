# Go-Live Checklist

Use this checklist before deploying to production mainnet.

## Pre-Deployment (Do First)

### Environment Setup
- [ ] `.env` file created from `.env.example`
- [ ] `NETWORK=testnet` for initial testing
- [ ] `POLYGON_MUMBAI_RPC_URL` configured with reliable endpoint
- [ ] `PRIVATE_KEY` set (wallet with test MATIC)
- [ ] Test wallet funded with Mumbai MATIC from faucet

### Code Preparation
- [ ] All dependencies installed: `npm install`
- [ ] Rust engines built: `npm run build:rust`
- [ ] No uncommitted changes in repository
- [ ] Latest code from main branch

### Testing on Testnet
- [ ] Connection test passed: `node scripts/test-connection.js`
- [ ] Architecture test passed: `node scripts/test-architecture.js`
- [ ] Real data test passed: `npm run test:realdata`
- [ ] Transaction simulation test passed: `npm run test:simulation`
- [ ] Full validation passed: `npm run test:validate`
- [ ] Bot runs without errors for 1+ hour in testnet mode
- [ ] Emergency stop triggers correctly when tested
- [ ] Risk management limits enforced

### Contract Deployment (Testnet)
- [ ] FlashLoanArbitrage.sol compiled successfully
- [ ] Contract deployed to Mumbai testnet
- [ ] Contract verified on Mumbai PolygonScan
- [ ] `CONTRACT_ADDRESS_TESTNET` updated in `.env`
- [ ] Contract tested with small transactions
- [ ] Contract owner verified
- [ ] Contract permissions checked

### Performance Validation
- [ ] Opportunity detection working (seeing opportunities)
- [ ] Price quotes from all DEXes (QuickSwap, SushiSwap, UniswapV3)
- [ ] Real pool reserves fetching correctly
- [ ] Transaction simulation preventing bad trades
- [ ] Gas optimization working
- [ ] MEV protection configured (if enabled)

## Mainnet Preparation (Do Before Production)

### Security Review
- [ ] Private key stored securely (consider hardware wallet)
- [ ] `.env` file NOT committed to git
- [ ] RPC endpoints are reliable and paid (not public)
- [ ] WebSocket endpoint configured (if using)
- [ ] Emergency webhook configured (if using)
- [ ] No test data in configuration
- [ ] All sensitive data encrypted/protected

### Configuration Review
- [ ] `NETWORK=mainnet` in `.env`
- [ ] `POLYGON_RPC_URL` set to reliable mainnet endpoint
- [ ] `POLYGON_WS_URL` set (optional but recommended)
- [ ] `CONTRACT_ADDRESS` will be set after deployment
- [ ] `CONSERVATIVE_MODE=true` for initial deployment
- [ ] `MAX_POSITION_SIZE_ETH=2` (start small)
- [ ] `ENABLE_EMERGENCY_STOP=true`
- [ ] `USE_REAL_DATA=true`
- [ ] Risk management limits set appropriately:
  - `DAILY_LOSS_LIMIT_ETH=0.5`
  - `MAX_CONSECUTIVE_FAILURES=5`
  - `MAX_DRAWDOWN_PERCENT=10`
  - `MIN_BALANCE_ETH=1.0`
- [ ] Gas optimization configured:
  - `MAX_GAS_PRICE_GWEI=150`
  - `TARGET_GAS_PRICE_GWEI=100`
  - `PEAK_HOUR_GAS_MULTIPLIER=1.5`

### Wallet Preparation
- [ ] Mainnet wallet funded with sufficient MATIC
  - Minimum: 5 MATIC for gas fees
  - Recommended: 10+ MATIC
- [ ] Wallet has no unnecessary permissions
- [ ] Wallet address verified correct
- [ ] Balance checked and logged

### Contract Deployment (Mainnet)
- [ ] Contract code reviewed one final time
- [ ] Contract deployed to Polygon mainnet
- [ ] Contract verified on PolygonScan
- [ ] `CONTRACT_ADDRESS` updated in `.env`
- [ ] Deployment transaction confirmed
- [ ] Contract ownership verified
- [ ] Test transaction executed successfully

### Final Testing
- [ ] Connection to mainnet verified
- [ ] Real pool data fetching from mainnet
- [ ] Emergency stop tested (manual trigger)
- [ ] All tests pass on mainnet configuration
- [ ] Bot starts without errors
- [ ] Logs showing correct network (Mainnet)

## Go-Live (Production Start)

### Pre-Start Checks
- [ ] All checklist items above completed
- [ ] Monitoring system ready
- [ ] Team available for initial monitoring period
- [ ] Backup plan ready if issues occur
- [ ] Documentation reviewed

### Initial Start (Conservative)
- [ ] Start bot with `CONSERVATIVE_MODE=true`
- [ ] Monitor logs continuously for first hour
- [ ] Watch for:
  - Opportunities detected
  - Successful simulations
  - Any errors or warnings
  - Gas price trends
  - Balance changes
- [ ] No critical errors in first hour

### First 24 Hours
- [ ] Monitor every 2-4 hours
- [ ] Check profitability
- [ ] Verify gas costs reasonable
- [ ] Confirm no emergency stops
- [ ] Review success rate (target >40%)
- [ ] Log any issues

### First Week
- [ ] Daily monitoring
- [ ] Track key metrics:
  - Total trades
  - Success rate
  - Profit/loss
  - Gas costs
  - Drawdown
- [ ] Adjust parameters if needed
- [ ] Keep `CONSERVATIVE_MODE=true`
- [ ] Keep `MAX_POSITION_SIZE_ETH=2`

## Scaling Up (After Stable Week)

### Week 2-4
- [ ] If Week 1 profitable and stable:
  - Increase `MAX_POSITION_SIZE_ETH=5`
  - Continue monitoring
- [ ] If Week 1 had issues:
  - Fix issues first
  - Reset and restart Week 1

### Month 2+
- [ ] If consistently profitable:
  - Consider `CONSERVATIVE_MODE=false`
  - Increase `MAX_POSITION_SIZE_ETH=10`
  - Enable advanced features:
    - WebSocket (if not already)
    - MEV protection
    - Transaction bundling
- [ ] Continue monitoring
- [ ] Optimize parameters based on data

## Emergency Procedures

### If Emergency Stop Triggers
1. [ ] Don't panic
2. [ ] Review logs in `logs/` directory
3. [ ] Check reason for stop
4. [ ] Verify wallet balance
5. [ ] Check recent transactions on PolygonScan
6. [ ] Fix underlying issue
7. [ ] Reset emergency stop only after fixing
8. [ ] Monitor closely after restart

### If Losing Money
1. [ ] Stop bot immediately (Ctrl+C)
2. [ ] Review all recent trades
3. [ ] Identify cause:
   - High gas prices?
   - Poor opportunities?
   - Slippage too high?
   - MEV competition?
4. [ ] Fix configuration
5. [ ] Test on testnet again
6. [ ] Restart with more conservative settings

### If Contract Issues
1. [ ] Stop bot
2. [ ] Check contract on PolygonScan
3. [ ] Verify no unauthorized access
4. [ ] Check contract balance
5. [ ] If compromised:
   - Withdraw funds if possible
   - Deploy new contract
   - Update configuration

## Monitoring Tools

### Essential Monitoring
- [ ] Log files in `logs/` directory
- [ ] PolygonScan for transactions
- [ ] Wallet balance tracking
- [ ] System resource usage (CPU, memory)

### Recommended Monitoring
- [ ] Custom monitoring dashboard
- [ ] Alert system for critical events
- [ ] Profit/loss tracking spreadsheet
- [ ] Gas price monitoring
- [ ] Network status monitoring

## Success Criteria

### Week 1 Success Criteria
- ✅ No critical errors
- ✅ Emergency stop not triggered
- ✅ Trade success rate >35%
- ✅ Positive P&L (after gas)
- ✅ Gas costs <30% of profits
- ✅ No security incidents

### Month 1 Success Criteria
- ✅ Trade success rate >40%
- ✅ Consistent daily profits
- ✅ ROI >5% for the month
- ✅ System uptime >95%
- ✅ No major incidents

## Support Resources

- [ ] `docs/DEPLOYMENT.md` - Deployment guide
- [ ] `docs/TROUBLESHOOTING.md` - Common issues
- [ ] `docs/ARCHITECTURE.md` - System architecture
- [ ] `docs/ML_INTEGRATION.md` - ML features (optional)
- [ ] `README.md` - General overview

## Notes

Use this space for notes during deployment:

```
Date: __________
Deployed By: __________
Testnet Contract: __________
Mainnet Contract: __________
Initial Balance: __________
Issues Encountered: __________
```

---

**Remember**: Start conservative, monitor closely, scale gradually.

**The most important rule**: If anything seems wrong, STOP THE BOT and investigate before continuing.
