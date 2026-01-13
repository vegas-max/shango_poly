# 🚀 Welcome to Shango Poly in GitHub Codespaces!

Thank you for using GitHub Codespaces to contribute to Shango Poly! Your development environment has been automatically configured with everything you need.

## ✅ What's Already Set Up

Your Codespace includes:
- ✅ Node.js 20 (LTS)
- ✅ Rust (latest stable)
- ✅ All npm dependencies installed
- ✅ Rust Twin Turbo Engines built
- ✅ VS Code extensions for JavaScript and Rust development
- ✅ `.env` configuration file created

## 🎯 Quick Start Guide

### 1. Configure Your Environment

Edit the `.env` file with your settings:

```bash
code .env
```

**Required settings:**
- `POLYGON_RPC_URL`: Your Polygon RPC endpoint
- `PRIVATE_KEY`: Your wallet private key (keep secure!)

**Optional settings:**
- `MIN_PROFIT_BPS`: Minimum profit threshold (default: 50 = 0.5%)
- `MAX_GAS_PRICE_GWEI`: Maximum gas price (default: 150)
- `LIGHTWEIGHT_MODE`: Enable for 75% memory reduction (default: false)

### 2. Verify Everything Works

Run the comprehensive test suite:

```bash
npm test
```

Expected results with Rust engines:
- ✅ 17/19 tests passing (89.5% success rate)
- ✅ Scanner throughput: 140K+ ops/sec
- ✅ Aggregator throughput: 294K+ ops/sec

### 3. Run a Simulation

Test the bot with a 90-day backtesting simulation:

```bash
npm run simulate
```

This runs a comprehensive simulation using real historical data from Polygon.

### 4. Start the Bot

Run the bot in simulation mode (no contract deployment needed):

```bash
npm start
```

## 📚 Helpful Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run comprehensive test suite |
| `npm run simulate` | 90-day backtesting simulation |
| `npm run benchmark` | Performance benchmarks |
| `npm run test:validate` | System validation |
| `npm run compete` | Bot competition (vs TITAN 2.0) |
| `npm run build:rust` | Rebuild Rust engines |

## 📁 Project Structure

```
shango_poly/
├── src/                  # Core bot logic
│   ├── bot/             # Main bot components
│   ├── dex/             # DEX integrations
│   ├── oracle/          # Price oracles
│   └── utils/           # Utilities
├── rust-engine/         # High-performance Rust engines
├── config/              # Configuration files
├── contracts/           # Solidity contracts
├── scripts/             # Utility scripts
├── docs/                # Documentation
└── .devcontainer/       # Codespaces configuration
```

## 📖 Documentation

- [README.md](../README.md) - Main documentation
- [docs/SETUP.md](../docs/SETUP.md) - Detailed setup guide
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
- [docs/PROTOCOL_EFFICIENCY.md](../docs/PROTOCOL_EFFICIENCY.md) - Advanced features
- [.devcontainer/README.md](../.devcontainer/README.md) - Codespaces details

## 🏗️ Architecture Overview

The system is built backwards from execution to data fetch:

```
Layer 7: EXECUTION         → FlashLoanExecutor
Layer 6: TRANSACTION       → Transaction builder & gas manager
Layer 5: VALIDATION        → Opportunity validator
Layer 4: CALCULATION       → FlashLoanCalculator (optimal sizing)
Layer 3: ROUTING           → DexInterface (route finding)
Layer 2: PRICE AGGREGATION → PriceOracle + 🦀 TurboAggregator (Rust)
Layer 1: DATA FETCH        → OpportunityScanner + 🦀 TurboScanner (Rust)
```

## 🦀 Rust Twin Turbo Engines

The project includes two high-performance Rust engines:

1. **TurboScanner**: 140K+ ops/sec opportunity scanning
2. **TurboAggregator**: 294K+ ops/sec price aggregation

These are automatically built during Codespace creation.

## 🔧 Troubleshooting

### Port 8080 Not Accessible

If you need to access port 8080:
1. Check the **Ports** panel in VS Code (View → Ports)
2. The port should be automatically forwarded
3. Click the local address to open in browser

### Rust Engines Not Working

If you see warnings about Rust engines:
```bash
npm run build:rust
```

### Need to Reinstall Dependencies

```bash
npm install
```

### Reset Environment Configuration

```bash
cp .env.example .env
code .env
```

## 💡 Tips for Development

1. **Use the integrated terminal**: Multiple terminals available (Ctrl+\`)
2. **Git is pre-configured**: Commit and push directly from VS Code
3. **Extensions are installed**: ESLint, Prettier, Rust Analyzer ready to use
4. **Auto-save enabled**: Your work is automatically saved
5. **Codespace persists**: Your environment is saved when you close it

## 🔒 Security Best Practices

- ✅ Never commit your `.env` file (already in `.gitignore`)
- ✅ Use GitHub Secrets for CI/CD workflows
- ✅ Keep your `PRIVATE_KEY` secure
- ✅ Use testnet (Mumbai) for development
- ✅ Start with small amounts on mainnet

## 🆘 Need Help?

- Check [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)
- Review [.devcontainer/README.md](../.devcontainer/README.md)
- Open an issue on GitHub

## 🌟 Contributing

Thank you for contributing! Your Codespace environment is ready for development:

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Commit and push
5. Open a pull request

---

**Happy coding! 🚀**
