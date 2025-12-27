# Troubleshooting Guide

## Common Issues

### 1. "Cannot connect to network"

**Symptoms**: Bot fails to start with RPC connection error

**Solutions**:
- Check `POLYGON_RPC_URL` in `.env`
- Verify RPC endpoint is working
- Try backup RPC endpoint
- Check internet connection
- Verify API key if using paid RPC

### 2. "Private key invalid"

**Symptoms**: Authentication errors

**Solutions**:
- Ensure `PRIVATE_KEY` is set correctly
- Remove '0x' prefix from private key
- Check for extra spaces or quotes
- Verify key corresponds to correct wallet

### 3. "Insufficient funds for gas"

**Symptoms**: Transactions fail with gas errors

**Solutions**:
- Add MATIC to wallet for gas fees
- Lower `MAX_GAS_PRICE_GWEI`
- Wait for lower gas prices
- Check wallet balance: `ethers.utils.formatEther(balance)`

### 4. "No opportunities found"

**Symptoms**: Scanner runs but finds no arbitrage

**Solutions**:
- Lower `MIN_PROFIT_BPS` (try 20-30)
- Add more token pairs
- Check DEX liquidity
- Verify DEX configurations
- Markets may be efficient (normal)

### 5. "Contract not deployed"

**Symptoms**: Warning about missing contract address

**Solutions**:
- Deploy `contracts/FlashLoanArbitrage.sol`
- Update `CONTRACT_ADDRESS` in `.env`
- Verify contract on Polygonscan
- Check deployment network matches RPC

### 6. "Flash loan execution failed"

**Symptoms**: Transactions revert

**Possible Causes**:
- Insufficient profit after fees
- Price changed (MEV competition)
- Slippage too high
- Gas estimation too low

**Solutions**:
- Increase profit threshold
- Optimize execution speed
- Adjust slippage tolerance
- Monitor gas limits

### 7. "RPC rate limit exceeded"

**Symptoms**: Too many requests error

**Solutions**:
- Increase `SCAN_INTERVAL_MS`
- Use paid RPC with higher limits
- Implement request caching
- Use multiple RPC endpoints

## Debugging

### Enable Debug Logging

```env
LOG_LEVEL=debug
```

### Check Logs

```bash
# View error log
cat logs/error.log

# View all logs
cat logs/combined.log

# Follow logs in real-time
tail -f logs/combined.log
```

### Test Connection

```bash
node -e "
const ethers = require('ethers');
const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
provider.getBlockNumber().then(console.log).catch(console.error);
"
```

### Verify Contract Deployment

```bash
# Check if contract exists
node -e "
const ethers = require('ethers');
const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
provider.getCode(process.env.CONTRACT_ADDRESS).then(code => {
  console.log(code === '0x' ? 'No contract' : 'Contract deployed');
});
"
```

## Performance Issues

### Slow Execution

1. Check RPC latency
2. Use local/nearby RPC node
3. Optimize gas price strategy
4. Reduce scan interval if overloaded

### High Gas Costs

1. Monitor Polygon gas prices
2. Adjust `MAX_GAS_PRICE_GWEI`
3. Execute only high-profit opportunities
4. Optimize contract gas usage

### Memory Leaks

1. Monitor Node.js memory usage
2. Restart bot periodically
3. Clear price cache regularly
4. Check for unclosed connections

## Getting Help

1. Check logs for specific errors
2. Review configuration settings
3. Test with simulation mode first
4. Verify all prerequisites met

## Best Practices

- Always test on testnet first
- Start with small amounts
- Monitor continuously
- Keep dependencies updated
- Regular backups of configuration
- Use dedicated wallet for bot
