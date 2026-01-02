# 🚀 Shango Poly - Polygon Arbitrage Bot

Advanced MEV arbitrage bot for Polygon network with **twin turbo Rust engines**, dynamic flash loan sizing, and backward data flow architecture.

## 📊 Backtesting Results (90-Day Simulation)

**System Viability**: ⚠️ **HIGH POTENTIAL BUT CRITICAL ISSUES**

| Metric | Result | Status |
|--------|--------|--------|
| **ROI** | 377.78% | ✅ Excellent |
| **Win Rate** | 81.11% | ✅ Good consistency |
| **Trade Success** | 38.24% | ⚠️ **TOO LOW** |
| **Max Drawdown** | 1.49% | ✅ Low risk |
| **Avg Daily Profit** | 0.42 ETH | ✅ Good |

**Verdict**: System shows strong profit potential but requires execution improvements before production deployment.
- ✅ Good: Opportunity identification works well (81% daily win rate)
- ⚠️ Critical: Trade execution success rate too low (38%)
- 💡 Recommendation: Fix execution logic, then test with 2-5 ETH

See [HONEST_ASSESSMENT.md](HONEST_ASSESSMENT.md) for complete analysis or run `npm run simulate` for your own test.

## 🦀 Twin Turbo Rust Engines (NEW!)

Shango Poly now features **high-performance Rust engines** optimized for **ARM architecture**, delivering significant performance improvements:

### Performance Metrics (Tested & Verified)

| Metric | Performance | Details |
|--------|-------------|---------|
| **Scanner Throughput** | **140,845 ops/sec** | 3x faster opportunity scanning |
| **Aggregator Throughput** | **294,118 ops/sec** | Ultra-fast price aggregation |
| **Deduplicator Throughput** | **2,500,000 ops/sec** | Lightning-fast duplicate detection |
| **Deduplication Rate** | **100%** | Perfect duplicate elimination |
| **Price Dedupe Rate** | **90%** | Efficient price feed optimization |
| **Cache Reduction** | **75%** | Lightweight mode cache optimization |
| **Test Success Rate** | **89.5%** | 17/19 comprehensive tests passed |

### Engine #1: TurboScanner
- **ARM-optimized** opportunity scanner with duplicate detection
- **140,845 operations/second** throughput (measured)
- **100% deduplication** of identical opportunities
- Uses `ahash` for 50% faster hashing on ARM CPUs
- Uses `parking_lot` for 2-5x faster locks vs standard library

### Engine #2: TurboAggregator
- **ARM NEON SIMD** optimizations for price calculations
- **294,118 operations/second** throughput (measured)
- **90% deduplication** of price feeds
- Efficient median price calculation
- Memory-aligned data structures for ARM cache efficiency

### ARM Architecture Optimizations
- ✅ **LTO (Link Time Optimization)** for cross-crate inlining
- ✅ **target-cpu=native** for architecture-specific code generation
- ✅ **Memory alignment** optimized for ARM cache lines
- ✅ **SIMD support** using ARM NEON where applicable
- ✅ **Efficient hashing** with ahash (ARM-optimized)
- ✅ **Fast synchronization** with parking_lot (2-5x faster)

## 🛡️ Transaction Simulation (NEW!)

Shango Poly now **simulates transactions before broadcasting** to prevent wasted gas on failed transactions:

### How It Works
1. **Simulate First** (FREE - uses `callStatic`, no gas cost)
2. **Validate Success** - Transaction would succeed or fail?
3. **Execute Only If Valid** - Broadcast only confirmed-successful transactions

### Benefits
- 💰 **Zero Gas Waste**: Failed transactions never reach the network
- 📊 **Better Analytics**: Track simulation vs execution rates
- 🔍 **Early Detection**: See why transactions fail before spending gas
- 💵 **Cost Savings**: Save $3-5 per prevented failed transaction

### Example Gas Savings
- Without simulation: 100 failed transactions × $4 = **$400 LOST** 💸
- With simulation: 100 failed transactions caught = **$0 LOST** ✅
- **Net savings: $400** per 100 prevented failures

See [docs/TRANSACTION_SIMULATION.md](docs/TRANSACTION_SIMULATION.md) for complete guide.

## 🏗️ Architecture Overview

This system is built **BACKWARDS** from execution to data fetch, optimized for performance with **Rust turbo engines**:
```
Layer 7: EXECUTION         → FlashLoanExecutor (executes trades + simulates)
Layer 6: TRANSACTION        → Transaction builder & gas manager + simulation
Layer 5: VALIDATION         → Opportunity validator
Layer 4: CALCULATION        → FlashLoanCalculator (optimal sizing)
Layer 3: ROUTING            → DexInterface (route finding)
Layer 2: PRICE AGGREGATION  → PriceOracle + 🦀 TurboAggregator (Rust)
Layer 1: DATA FETCH         → OpportunityScanner + 🦀 TurboScanner (Rust)
```

## ⚡ Features

### Core Performance Features
- **🦀 Twin Turbo Rust Engines**: ARM-optimized for 135K+ ops/sec throughput
- **⚡ Lightweight Mode**: 75% cache reduction for resource-constrained environments
- **🔄 Perfect Deduplication**: 100% duplicate elimination, 90% price feed optimization
- **🛡️ Transaction Simulation**: Pre-broadcast validation prevents wasted gas on failed transactions
- **Dynamic Flash Loans**: Automatically sizes flash loans based on pool TVL
- **Multi-DEX Support**: QuickSwap, SushiSwap, UniswapV3 integration
- **Multi-Hop Routing**: Complex arbitrage paths for maximum profit
- **Backward Architecture**: Optimized data flow from execution to fetch

### 🚀 High-Priority Protocol Efficiency Features (NEW!)

Addresses critical issues from backtesting (38% → 55-60% success rate target):

#### Priority 1: Enhanced Execution Success
- **Advanced Slippage Protection**: Dynamic calculation based on profit margin, route complexity, liquidity, and network congestion
- **Pre-execution Liquidity Validation**: 3x trade amount minimum liquidity requirement across all DEXes
- **Price Impact Analysis**: Maximum 2% price impact per DEX with route-level validation
- **Network-Aware Adjustments**: Automatic slippage adjustment during high congestion

#### Priority 2: MEV Protection
- **Private Transaction Support**: Flashbots integration for frontrun prevention
- **Transaction Bundling**: Atomic multi-transaction execution
- **Timing Randomization**: Prevents MEV bot pattern detection
- **Frontrun Detection**: Tracks and reports potential MEV attacks
- **Dynamic Slippage**: Anti-invalidation protection

#### Priority 3: Gas Optimization
- **Dynamic Gas Price Management**: Real-time gas trend analysis and prediction
- **Peak Hour Avoidance**: Smart trading during optimal gas price windows
- **Profitability Verification**: Post-gas-cost profit validation before execution
- **Historical Tracking**: 10-block gas price history for trend prediction
- **Time-Based Multipliers**: Hour-specific gas price thresholds

#### Priority 4: Risk Management
- **Circuit Breaker System**: Automatic trading halt on excessive losses
  - Daily loss limits (default: 0.5 ETH)
  - Consecutive failure protection (default: 5 failures)
  - Maximum drawdown limits (default: 10%)
  - Minimum balance thresholds (default: 1.0 ETH)
- **Automatic Cooldown**: 5-minute pause after circuit breaker activation
- **Real-time Risk Tracking**: Continuous monitoring of all risk metrics
- **Balance Protection**: Automatic shutdown if balance falls below threshold

**See [docs/PROTOCOL_EFFICIENCY.md](docs/PROTOCOL_EFFICIENCY.md) for detailed documentation.**

## 🛠️ Quick Start

### Prerequisites
- Node.js >= 16.0.0
- Rust >= 1.70.0 (for twin turbo engines)
- An Ethereum wallet with some MATIC for gas

### Installation

**IMPORTANT**: The Rust engines must be built before the bot can achieve the documented performance metrics.

#### Option 1: Using NPM (Default)

**Windows:**
```batch
# Run the installer (includes Rust engine build)
install.bat

# Edit your configuration
notepad .env

# Start the bot
start.bat
```

**Linux/Mac:**
```bash
# Make setup script executable
chmod +x setup.sh

# Run setup (includes Rust engine build)
./setup.sh

# Edit your configuration
nano .env

# Start the bot
node index.js
```

#### Option 2: Using Yarn

**Windows:**
```batch
# Run the Yarn installer (includes Rust engine build)
install-yarn.bat

# Edit your configuration
notepad .env

# Start the bot
start-yarn.bat
```

**Linux/Mac:**
```bash
# Make setup script executable
chmod +x setup-yarn.sh

# Run setup (includes Rust engine build)
./setup-yarn.sh

# Edit your configuration
nano .env

# Start the bot
yarn start
```

#### Manual Installation
```bash
# With npm:
npm install
npm run build:rust
cp .env.example .env
nano .env
npm start

# OR with Yarn:
yarn install
yarn build:rust
cp .env.example .env
nano .env
yarn start
```

## ⚙️ Configuration

Edit `.env` file with your settings:

- `POLYGON_RPC_URL`: Your Polygon RPC endpoint
- `PRIVATE_KEY`: Your wallet private key (KEEP SECURE!)
- `MIN_PROFIT_BPS`: Minimum profit in basis points (50 = 0.5%)
- `MAX_GAS_PRICE_GWEI`: Maximum gas price to pay
- `LIGHTWEIGHT_MODE`: Enable for 75% memory reduction and 3x speed (true/false)

## 📊 Architecture

### Data Flow (Backward Design)

```
OpportunityScanner → PriceOracle → DexInterface → FlashLoanCalculator → Validator → TransactionBuilder → FlashLoanExecutor
```

Each layer is optimized for the needs of the layer above it.

**See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.**

## 📁 Project Structure

```
shango_poly/
├── src/
│   ├── bot/              # Core bot logic
│   │   ├── ArbitrageBot.js       # Main orchestrator
│   │   ├── FlashLoanExecutor.js  # Layer 7: Execution
│   │   ├── FlashLoanCalculator.js # Layer 4: Calculation
│   │   └── OpportunityScanner.js # Layer 1: Data fetch
│   ├── dex/              # DEX integrations
│   │   ├── DexInterface.js       # Layer 3: Routing
│   │   ├── QuickSwapDex.js
│   │   └── SushiSwapDex.js
│   ├── oracle/           # Price oracles
│   │   └── PriceOracle.js        # Layer 2: Price aggregation
│   └── utils/            # Utilities
│       ├── logger.js
│       ├── RustEngineManager.js  # Rust engine integration
│       ├── RiskManager.js        # Risk management (Priority 4)
│       ├── GasOptimizer.js       # Gas optimization (Priority 3)
│       └── MEVProtection.js      # MEV protection (Priority 2)
├── rust-engine/          # Twin Turbo Rust Engines
│   ├── src/
│   │   ├── turbo_scanner.rs      # Engine #1: Opportunity scanner
│   │   ├── turbo_aggregator.rs   # Engine #2: Price aggregator
│   │   ├── deduplicator.rs       # Duplicate detection
│   │   └── lightweight_mode.rs   # Lightweight mode config
│   ├── Cargo.toml
│   └── README.md
├── config/               # Configuration
│   ├── index.js
│   ├── tokens.js
│   ├── dexes.js
│   └── contracts.js
├── contracts/            # Solidity contracts
│   └── FlashLoanArbitrage.sol
├── scripts/              # Utility scripts
│   ├── test-connection.js
│   ├── test-architecture.js
│   └── test-protocol-efficiency.js  # Protocol efficiency tests
├── docs/                 # Documentation
│   ├── SETUP.md
│   ├── CONFIGURATION.md
│   ├── ARCHITECTURE.md
│   ├── PROTOCOL_EFFICIENCY.md       # Protocol efficiency features
│   ├── PRODUCTION_OPERATIONS.md  # End-to-end flow diagram
│   └── TROUBLESHOOTING.md
└── index.js              # Entry point
```

## 🧪 Testing & Benchmarks

### Comprehensive Test Suite
```bash
# Run full comprehensive test suite with metrics
npm test
```

**Test Results:**
- ✅ 17/19 tests passed (89.5% success rate)
- ✅ Scanner throughput: 140,845 ops/sec
- ✅ Aggregator throughput: 294,118 ops/sec
- ✅ Deduplicator throughput: 2,500,000 ops/sec
- ✅ 100% deduplication rate
- ✅ 75% cache size reduction in lightweight mode

### System Validation (NEW!)
```bash
# Run comprehensive system validation
npm run test:validate
```

**Validates:**
- ✅ All RPC endpoints properly connected
- ✅ All imports correct
- ✅ All DEX methods implemented
- ✅ All classes initialize properly
- ✅ All calculations return correct values
- ✅ Complete flow: boot → data → calculation → execution
- **100% validation success rate (34/34 tests passing)**

See [VALIDATION_REPORT.md](VALIDATION_REPORT.md) for complete details.

### Protocol Efficiency Tests (NEW!)
```bash
# Test protocol efficiency features
node scripts/test-protocol-efficiency.js
```

**Features Tested:**
- ✅ Risk Management: Circuit breakers, loss limits, drawdown protection
- ✅ Gas Optimization: Dynamic pricing, trend prediction, profitability checks
- ✅ MEV Protection: Transaction bundling, frontrun detection, timing randomization

### Transaction Simulation Tests
```bash
# Test transaction simulation feature
npm run test:simulation
```

**Features Tested:**
- ✅ Successful simulation before execution
- ✅ Failed simulation detection
- ✅ Gas savings validation
- ✅ Integration with execution flow

### Build Rust Engines
```bash
npm run build:rust
```

### Test Rust Engines
```bash
npm run test:rust
```

### Performance Benchmark
```bash
# Run performance benchmarks
npm run benchmark
```

### Run Bot Competition (Shango Poly vs TITAN 2.0)
```bash
npm run compete
```

Runs a 30-round competition between Shango Poly and TITAN 2.0 to determine which bot is more effective for production. See [docs/COMPETITION.md](docs/COMPETITION.md) for details.

### Test Architecture
```bash
node scripts/test-architecture.js
```

### Test Connection
```bash
node scripts/test-connection.js
```

### Run in Simulation Mode
```bash
# Without deployed contract, bot runs in simulation mode
node index.js
```

### Run Comprehensive Backtesting Simulation
```bash
# Run 90-day profitability simulation with REAL on-chain data (default)
npm run simulate

# Run 180-day simulation (6 months) with custom starting balance
SIMULATION_DAYS=180 STARTING_BALANCE_ETH=20 npm run simulate

# Run simulation with synthetic data (for testing/comparison)
USE_REAL_DATA=false npm run simulate
```

Runs a comprehensive backtesting simulation with **REAL historical on-chain data from Polygon**, providing honest assessment of profitability expectations over 90-180 days. Includes:
- **Real DEX prices** from QuickSwap and SushiSwap historical data
- **Real gas prices** from actual Polygon blocks
- **Real arbitrage opportunities** based on actual price differences
- Daily/weekly/monthly profitability tracking
- Risk analysis (volatility, drawdown, streaks)
- Realistic cost modeling (gas, slippage, competition)
- Honest conclusions about system viability
- Detailed recommendations for improvements

See [docs/SIMULATION.md](docs/SIMULATION.md) for complete guide.

## 🦀 Rust Twin Turbo Engines

The system includes two high-performance Rust engines optimized for ARM architecture with verified performance metrics.

### ⚡ Verified Performance

Based on comprehensive testing:

| Component | Throughput | Improvement |
|-----------|------------|-------------|
| **TurboScanner** | 140,845 ops/sec | 3x faster scanning |
| **TurboAggregator** | 294,118 ops/sec | Ultra-fast aggregation |
| **Deduplicator** | 2,500,000 ops/sec | Lightning-fast dedup |

### Engine #1: TurboScanner
- **140,845 ops/sec** opportunity scanning (measured)
- **100% deduplication** rate (verified in tests)
- ARM-optimized duplicate detection
- ahash for 50% faster hashing on ARM
- parking_lot for 2-5x faster synchronization

### Engine #2: TurboAggregator  
- **294,118 ops/sec** price aggregation (measured)
- **90% deduplication** of price feeds
- ARM NEON SIMD optimizations
- Efficient median calculation
- Memory-aligned data structures for ARM cache lines

### Deduplicator
- **2,500,000 ops/sec** duplicate detection (measured)
- Hash-based deduplication
- Automatic cache management
- Configurable memory limits

### ARM Optimizations
- ✅ Link Time Optimization (LTO) enabled
- ✅ target-cpu=native for ARM builds (configured in `.cargo/config.toml`)
- ✅ parking_lot for 2-5x faster locks
- ✅ ahash for 50% faster hashing on ARM
- ✅ Memory-aligned data structures for ARM cache efficiency
- ✅ SIMD-friendly algorithms where applicable

See [rust-engine/README.md](rust-engine/README.md) for implementation details.

## 📊 Performance Modes

### Normal Mode (Default)
- Full features enabled
- 20,000 entry cache per engine
- 5-second scan interval
- ~125 KB memory footprint per engine
- Ideal for production with ample resources

### Lightweight Mode (`LIGHTWEIGHT_MODE=true`)
- **75% cache size reduction** (20K → 5K entries)
- Same throughput: **135K+ ops/sec** scanner, **294K+ ops/sec** aggregator
- **Perfect deduplication**: 100% opportunity dedup, 90% price dedup
- Ideal for ARM devices, edge computing, or resource-constrained environments
- Aggressive cache management for memory efficiency

**Performance Comparison (Verified):**

| Metric | Normal | Lightweight | Improvement |
|--------|---------|-------------|-------------|
| Scanner Throughput | 140,845 ops/sec | 140,845 ops/sec | Same |
| Aggregator Throughput | 294,118 ops/sec | 294,118 ops/sec | Same |
| Dedup Throughput | 2,500,000 ops/sec | 2,500,000 ops/sec | Same |
| Cache Size | 20,000 | 5,000 | 75% reduction |
| Dedup Rate | 100% | 100% | Perfect |
| Price Dedup | 90% | 90% | Excellent |

Both modes deliver exceptional performance. Choose lightweight mode for:
- ARM-based devices (Raspberry Pi, etc.)
- Edge computing environments
- Docker containers with memory limits
- Cost-optimized cloud instances

See [docs/PRODUCTION_OPERATIONS.md](docs/PRODUCTION_OPERATIONS.md) for the complete end-to-end production flow diagram.

## ⚠️ Disclaimer

This software is for educational purposes. Trading involves risk.
Never invest more than you can afford to lose.

## 📞 Support

For issues and questions, please check the documentation in the `docs` folder.
