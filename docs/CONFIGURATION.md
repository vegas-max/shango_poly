# Configuration Guide

## Environment Variables

### Required

- `POLYGON_RPC_URL`: Your Polygon RPC endpoint
- `PRIVATE_KEY`: Wallet private key (without 0x prefix)
- `CONTRACT_ADDRESS`: Deployed FlashLoanArbitrage contract address

### Optional

- `POLYGON_RPC_URL_BACKUP`: Backup RPC endpoint
- `MIN_PROFIT_BPS`: Minimum profit in basis points (default: 50 = 0.5%)
- `MAX_GAS_PRICE_GWEI`: Maximum gas price in Gwei (default: 150)
- `SCAN_INTERVAL_MS`: How often to scan for opportunities (default: 5000ms)
- `LOG_LEVEL`: Logging level (default: info)

## Trading Parameters

Edit `config/index.js` to customize:

### Base Tokens

Tokens used as start/end of arbitrage cycles:

```javascript
baseTokens: [
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
  // Add more...
]
```

### Intermediate Tokens

Tokens used in multi-hop routes:

```javascript
intermediateTokens: [
  '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC
  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI
  // Add more...
]
```

## DEX Configuration

Configure DEXes in `config/dexes.js`:

```javascript
quickswap: {
  name: 'QuickSwap',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
  fee: 30
}
```

## Security Settings

```javascript
security: {
  maxSlippageBps: 300,      // 3% max slippage
  maxPriceImpactBps: 500    // 5% max price impact
}
```

## Advanced Configuration

### Gas Optimization

Adjust gas settings based on network conditions:

- Higher `MAX_GAS_PRICE_GWEI` = more likely to execute but higher costs
- Lower `MIN_PROFIT_BPS` = more opportunities but smaller profits

### Scan Interval

- Lower interval = faster detection but more RPC calls
- Higher interval = fewer RPC calls but slower detection

Recommended: 3000-5000ms for mainnet

### Token Selection

Choose tokens with:
- High liquidity
- Active trading volume
- Multiple DEX listings
- Low volatility (for stable profits)

## Performance Tuning

1. **RPC Provider**: Use a premium RPC for faster responses
2. **Network**: Use dedicated server with low latency
3. **Gas Strategy**: Balance speed vs cost
4. **Token Pairs**: Focus on most liquid pairs
