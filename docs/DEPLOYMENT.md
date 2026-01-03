# Deployment Guide

This guide covers deploying the FlashLoanArbitrage smart contract and configuring the bot for production use.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Testnet Deployment](#testnet-deployment)
3. [Mainnet Deployment](#mainnet-deployment)
4. [Contract Verification](#contract-verification)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Emergency Procedures](#emergency-procedures)

## Prerequisites

Before deploying, ensure you have:

- [ ] Wallet with MATIC for gas fees (testnet or mainnet)
- [ ] RPC endpoint configured in `.env`
- [ ] Private key configured in `.env` (KEEP SECURE!)
- [ ] Contract compiled and ready to deploy
- [ ] Sufficient balance for gas fees

**Gas Cost Estimates:**
- Testnet (Mumbai): ~0.01 MATIC
- Mainnet: ~0.5-2 MATIC (varies with gas prices)

## Testnet Deployment

### Step 1: Configure for Testnet

Update your `.env` file:

```bash
# Set network to testnet
NETWORK=testnet

# Configure Mumbai RPC
POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Add your private key (get test MATIC from faucet)
PRIVATE_KEY=your_private_key_here
```

### Step 2: Get Test MATIC

Visit a Mumbai faucet to get test MATIC:
- https://faucet.polygon.technology/
- https://mumbaifaucet.com/

### Step 3: Deploy Contract

Using Hardhat (recommended):

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

Using Foundry:

```bash
forge create --rpc-url $POLYGON_MUMBAI_RPC_URL \
  --private-key $PRIVATE_KEY \
  contracts/FlashLoanArbitrage.sol:FlashLoanArbitrage
```

### Step 4: Update Configuration

After deployment, update `.env`:

```bash
CONTRACT_ADDRESS_TESTNET=0x... # Your deployed contract address
```

### Step 5: Test the Bot

```bash
# Run in simulation mode first
node index.js

# Monitor logs for:
# - Contract initialization
# - Opportunity scanning
# - Transaction simulation
```

## Mainnet Deployment

⚠️ **WARNING**: Mainnet deployment uses real funds. Proceed with caution.

### Step 1: Configure for Mainnet

Update your `.env` file:

```bash
# Set network to mainnet
NETWORK=mainnet

# Configure Polygon mainnet RPC
POLYGON_RPC_URL=https://polygon-rpc.com

# Add your private key (KEEP SECURE!)
PRIVATE_KEY=your_private_key_here
```

### Step 2: Security Checklist

- [ ] Private key is stored securely (use hardware wallet if possible)
- [ ] RPC endpoint is reliable (consider paid provider like Alchemy/Infura)
- [ ] Contract has been audited or thoroughly tested
- [ ] Emergency stop is configured
- [ ] Risk management limits are set
- [ ] You have sufficient MATIC for gas fees

### Step 3: Deploy Contract

Run the deployment helper:

```bash
./scripts/deploy-contract.sh
```

Or deploy manually using Hardhat:

```bash
npx hardhat run scripts/deploy.js --network polygon
```

Or using Foundry:

```bash
forge create --rpc-url $POLYGON_RPC_URL \
  --private-key $PRIVATE_KEY \
  contracts/FlashLoanArbitrage.sol:FlashLoanArbitrage \
  --verify
```

### Step 4: Update Configuration

After deployment, update `.env`:

```bash
CONTRACT_ADDRESS=0x... # Your deployed contract address
```

### Step 5: Start in Conservative Mode

For initial deployment, enable conservative mode:

```bash
# In .env
CONSERVATIVE_MODE=true
MAX_POSITION_SIZE_ETH=5
ENABLE_EMERGENCY_STOP=true
```

## Contract Verification

Verify your contract on PolygonScan for transparency:

### Using Hardhat

```bash
npx hardhat verify --network polygon <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Using Foundry

```bash
forge verify-contract <CONTRACT_ADDRESS> \
  contracts/FlashLoanArbitrage.sol:FlashLoanArbitrage \
  --chain-id 137 \
  --etherscan-api-key <YOUR_POLYGONSCAN_API_KEY>
```

## Configuration

### Production Settings

```bash
# Network
NETWORK=mainnet

# RPC (use reliable provider)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_WS_URL=wss://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Contract
CONTRACT_ADDRESS=0x...

# Trading Parameters
MIN_PROFIT_BPS=50          # 0.5% minimum profit
MAX_GAS_PRICE_GWEI=150     # Don't trade if gas > 150 gwei
SCAN_INTERVAL_MS=5000      # Scan every 5 seconds

# Real Data
USE_REAL_DATA=true
USE_WEBSOCKET=true
POOL_UPDATE_INTERVAL_MS=10000

# Risk Management
DAILY_LOSS_LIMIT_ETH=0.5
MAX_CONSECUTIVE_FAILURES=5
MAX_DRAWDOWN_PERCENT=10
MIN_BALANCE_ETH=1.0

# Gas Optimization
TARGET_GAS_PRICE_GWEI=100
PEAK_HOUR_GAS_MULTIPLIER=1.5

# MEV Protection
USE_PRIVATE_TRANSACTIONS=false
BUNDLE_TRANSACTIONS=false
MIN_TIME_BETWEEN_TRADES=30000

# Production Safety
ENABLE_EMERGENCY_STOP=true
CONSERVATIVE_MODE=true
MAX_POSITION_SIZE_ETH=5
```

### Gradual Scaling

Start conservative and scale gradually:

**Week 1**: 
- `CONSERVATIVE_MODE=true`
- `MAX_POSITION_SIZE_ETH=2`
- Monitor 24/7

**Week 2-4**: If stable
- `MAX_POSITION_SIZE_ETH=5`
- Continue monitoring

**Month 2+**: If profitable
- `CONSERVATIVE_MODE=false`
- `MAX_POSITION_SIZE_ETH=10`
- Enable advanced features

## Testing

### Pre-Production Checklist

Before going live, test:

- [ ] Contract deployment on testnet
- [ ] Opportunity scanning works
- [ ] Transaction simulation works
- [ ] Real data fetching works
- [ ] WebSocket connections stable
- [ ] Emergency stop triggers correctly
- [ ] Risk management limits enforced
- [ ] Gas optimization works
- [ ] MEV protection (if enabled) works

### Test Commands

```bash
# Test connection
node scripts/test-connection.js

# Test architecture
node scripts/test-architecture.js

# Test transaction simulation
npm run test:simulation

# Run comprehensive tests
npm test
```

## Emergency Procedures

### Emergency Stop

If something goes wrong:

1. **Automatic Stop**: Bot stops automatically if:
   - Daily loss limit exceeded
   - Too many consecutive failures
   - Maximum drawdown exceeded
   - Balance below minimum

2. **Manual Stop**: 
   - Press `Ctrl+C` to stop the bot
   - Or send SIGTERM/SIGINT signal

### Recovery Steps

1. **Stop the bot** (if not already stopped)
2. **Review logs** in `logs/` directory
3. **Check on-chain state** on PolygonScan
4. **Identify issue** (contract, network, config, etc.)
5. **Fix issue** before restarting
6. **Test on testnet** if code changes needed
7. **Restart carefully** with increased monitoring

### Emergency Contacts

Configure emergency webhook for critical notifications:

```bash
EMERGENCY_WEBHOOK_URL=https://your-monitoring-service.com/webhook
```

## Monitoring

### Recommended Monitoring

- **Logs**: Monitor `logs/` directory for errors
- **Balance**: Check wallet balance regularly
- **Gas Prices**: Monitor network gas prices
- **Profitability**: Track daily P&L
- **System Health**: Monitor CPU, memory, network

### Key Metrics

Watch these metrics:
- Win rate (should be > 60%)
- Trade success rate (should be > 40%)
- Average profit per trade
- Gas costs as % of profit
- System uptime

## Support

For issues or questions:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. Check system logs in `logs/`
4. Test on testnet first

## Security Best Practices

- ✅ Never commit `.env` file to version control
- ✅ Use hardware wallet for mainnet private key
- ✅ Keep RPC endpoints private
- ✅ Monitor for unusual activity
- ✅ Start with small position sizes
- ✅ Enable emergency stop
- ✅ Use reliable RPC providers
- ✅ Keep software updated

---

**Remember**: Start small, monitor closely, scale gradually.
