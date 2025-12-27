# 🚀 Shango Poly - Polygon Arbitrage Bot

Advanced MEV arbitrage bot for Polygon network with dynamic flash loan sizing and backward data flow architecture.

## 🏗️ Architecture Overview

This system is built **BACKWARDS** from execution to data fetch, optimizing for performance:
```
Layer 7: EXECUTION         → FlashLoanExecutor (executes trades)
Layer 6: TRANSACTION        → Transaction builder & gas manager  
Layer 5: VALIDATION         → Opportunity validator
Layer 4: CALCULATION        → FlashLoanCalculator (optimal sizing)
Layer 3: ROUTING            → DexInterface (route finding)
Layer 2: PRICE AGGREGATION  → PriceOracle (price aggregation)
Layer 1: DATA FETCH         → OpportunityScanner (price scanning)
```

## ⚡ Features

- **Dynamic Flash Loans**: Automatically sizes flash loans based on pool TVL
- **Multi-DEX Support**: QuickSwap, SushiSwap, UniswapV3 integration
- **Multi-Hop Routing**: Complex arbitrage paths for maximum profit
- **Gas Optimization**: Smart gas price management
- **Real-time Monitoring**: 24/7 opportunity scanning
- **Backward Architecture**: Optimized data flow from execution to fetch

## 🛠️ Quick Start

### Prerequisites
- Node.js >= 16.0.0
- An Ethereum wallet with some MATIC for gas

### Installation

#### Windows
```batch
# Run the installer
install.bat

# Edit your configuration
notepad .env

# Start the bot
start.bat
```

#### Linux/Mac
```bash
# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh

# Edit your configuration
nano .env

# Start the bot
node index.js
```

## ⚙️ Configuration

Edit `.env` file with your settings:

- `POLYGON_RPC_URL`: Your Polygon RPC endpoint
- `PRIVATE_KEY`: Your wallet private key (KEEP SECURE!)
- `MIN_PROFIT_BPS`: Minimum profit in basis points (50 = 0.5%)
- `MAX_GAS_PRICE_GWEI`: Maximum gas price to pay

## 📊 Architecture

### Data Flow (Backward Design)

```
OpportunityScanner → PriceOracle → DexInterface → FlashLoanCalculator → Validator → TransactionBuilder → FlashLoanExecutor
```

Each layer is optimized for the needs of the layer above it.

## ⚠️ Disclaimer

This software is for educational purposes. Trading involves risk.
Never invest more than you can afford to lose.

## 📞 Support

For issues and questions, please check the documentation in the `docs` folder.
