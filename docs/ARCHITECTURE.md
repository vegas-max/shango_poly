# Backward Data Flow Architecture

## Overview

Shango Poly is built using a **BACKWARD** architecture, where the system is designed from the execution endpoint backwards to the data fetch layer. This approach optimizes for execution efficiency and ensures each layer serves the exact needs of the layer above it.

## Architecture Layers

### Layer 7: EXECUTION
**Component**: `FlashLoanExecutor.js`

**Purpose**: Execute flash loan arbitrage trades on-chain

**Responsibilities**:
- Submit transactions to blockchain
- Handle gas estimation and pricing
- Manage transaction confirmation
- Report execution results

**Input**: Validated opportunity with execution parameters
**Output**: Transaction receipt and success status

---

### Layer 6: TRANSACTION
**Component**: `ArbitrageBot.js` (transaction building)

**Purpose**: Build and prepare transactions for execution

**Responsibilities**:
- Calculate optimal gas price
- Estimate gas limits
- Build transaction parameters
- Handle transaction retries

**Input**: Validated opportunity and calculated loan details
**Output**: Complete transaction parameters ready for execution

---

### Layer 5: VALIDATION
**Component**: `OpportunityScanner.js` (validateOpportunity)

**Purpose**: Validate opportunities before execution

**Responsibilities**:
- Verify opportunity still exists
- Check profitability after fees
- Validate price hasn't changed significantly
- Apply tolerance thresholds

**Input**: Potential arbitrage opportunity
**Output**: Validated opportunity or rejection

---

### Layer 4: CALCULATION
**Component**: `FlashLoanCalculator.js`

**Purpose**: Calculate optimal flash loan sizes and expected profits

**Responsibilities**:
- Query available liquidity from Aave
- Calculate maximum flash loan amount (15% of pool)
- Optimize loan size for best profit/risk ratio
- Calculate profit after all fees

**Input**: Trading route and asset information
**Output**: Optimal loan amount and profit calculations

---

### Layer 3: ROUTING
**Component**: `DexInterface.js`

**Purpose**: Find best trading routes across DEXes

**Responsibilities**:
- Query all registered DEXes for quotes
- Compare prices across DEXes
- Find multi-hop arbitrage routes
- Identify best execution path

**Input**: Token pair and amount
**Output**: Best route with DEX selections and expected output

---

### Layer 2: PRICE AGGREGATION
**Component**: `PriceOracle.js`

**Purpose**: Aggregate and validate price data

**Responsibilities**:
- Fetch prices from multiple sources
- Cache price data efficiently
- Detect price discrepancies
- Provide reliable price feeds

**Input**: Token pair
**Output**: Aggregated price with confidence level

---

### Layer 1: DATA FETCH
**Component**: `OpportunityScanner.js`

**Purpose**: Scan for arbitrage opportunities

**Responsibilities**:
- Continuously monitor token pairs
- Identify price differences
- Filter by minimum profit threshold
- Trigger opportunity processing

**Input**: Configuration (tokens, thresholds)
**Output**: Stream of potential opportunities

---

## Data Flow Example

Here's how data flows BACKWARD through the system when an arbitrage opportunity is found:

```
1. DATA FETCH (Layer 1)
   ↓
   OpportunityScanner detects: USDC price difference between QuickSwap and SushiSwap
   
2. PRICE AGGREGATION (Layer 2)
   ↓
   PriceOracle validates prices are accurate and fresh
   
3. ROUTING (Layer 3)
   ↓
   DexInterface finds best route: USDC → WMATIC → USDC
   
4. CALCULATION (Layer 4)
   ↓
   FlashLoanCalculator determines: Borrow $100k USDC, expect $1.2k profit
   
5. VALIDATION (Layer 5)
   ↓
   Validator confirms opportunity still exists with acceptable slippage
   
6. TRANSACTION (Layer 6)
   ↓
   Transaction builder creates execution params with optimal gas
   
7. EXECUTION (Layer 7)
   ↓
   FlashLoanExecutor submits transaction to blockchain
```

## Benefits of Backward Architecture

### 1. **Execution-First Optimization**
Each layer is designed to serve the execution layer's exact needs, eliminating unnecessary data processing.

### 2. **Efficient Data Flow**
Only profitable opportunities flow through all layers, saving computation time.

### 3. **Clear Separation of Concerns**
Each layer has a single, well-defined responsibility.

### 4. **Easy Testing**
Layers can be tested independently by mocking the layer below.

### 5. **Scalability**
New DEXes or price sources can be added without affecting execution logic.

### 6. **Performance**
Critical path (execution) is optimized first, with supporting layers built around it.

## Key Design Principles

1. **Top-Down Design**: Start from what needs to execute, work backwards to what data is needed
2. **Lazy Evaluation**: Don't fetch or calculate data until it's needed by a higher layer
3. **Fail Fast**: Validate and filter at each layer to avoid wasting computation
4. **Cache Wisely**: Cache at the appropriate layer (prices at Layer 2, routes at Layer 3)
5. **Optimize Critical Path**: Execution layers get priority in optimization

## Implementation Notes

- Each layer is a separate module/class
- Layers communicate through well-defined interfaces
- Higher layers depend on lower layers, never the reverse
- Configuration flows down, data flows up
- Errors propagate up with context from each layer

---

This backward architecture ensures that Shango Poly is optimized for its primary goal: **executing profitable arbitrage trades as quickly and efficiently as possible**.
