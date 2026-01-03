# Machine Learning Integration Guide

This document outlines the ML model integration approach for the Shango Poly arbitrage bot.

## Overview

The bot can optionally use machine learning models to predict arbitrage opportunity profitability and improve execution success rates.

## Current Status

**ML models are DISABLED by default** and optional. The system works fully without ML.

## ML Model Options

### Option A: Train Custom Models (20-30 hours)

Train ML models on historical arbitrage data to predict:
- Opportunity success probability
- Expected profit after slippage
- Optimal execution timing
- Gas price predictions

### Option B: Disable ML Features (Current Default)

Run without ML models using:
- Rule-based opportunity detection
- Historical statistics
- Real-time market data
- Heuristic-based validation

## Configuration

### Disable ML (Default)

```bash
# In .env
ENABLE_ML_PREDICTIONS=false
```

### Enable ML (After Training)

```bash
# In .env
ENABLE_ML_PREDICTIONS=true
ML_MODEL_PATH=./models/arbitrage_predictor.json
```

## Training ML Models (If Desired)

### Step 1: Collect Training Data

Run the bot in simulation mode to collect data:

```bash
# Run for at least 30 days to collect sufficient data
ENABLE_ML_PREDICTIONS=false npm run simulate
```

This will generate training data including:
- Opportunities detected
- Execution outcomes
- Gas prices
- Slippage amounts
- Market conditions

### Step 2: Prepare Training Dataset

Create a dataset with features:

**Input Features:**
- Token pair
- DEX combination
- Expected profit (BPS)
- Pool liquidity
- Gas price
- Time of day
- Market volatility
- Historical success rate

**Output Labels:**
- Actual profit (BPS)
- Success (1) or Failure (0)
- Execution time

### Step 3: Train Models

Recommended approaches:

#### Approach 1: Gradient Boosting (XGBoost/LightGBM)

```python
import xgboost as xgb
import pandas as pd

# Load training data
df = pd.read_csv('arbitrage_data.csv')

# Features
X = df[['expected_profit', 'liquidity', 'gas_price', 'volatility', ...]]
y_success = df['success']
y_profit = df['actual_profit']

# Train success predictor
success_model = xgb.XGBClassifier()
success_model.fit(X, y_success)

# Train profit predictor
profit_model = xgb.XGBRegressor()
profit_model.fit(X, y_profit)

# Save models
success_model.save_model('models/success_predictor.json')
profit_model.save_model('models/profit_predictor.json')
```

#### Approach 2: Neural Network (TensorFlow)

```python
import tensorflow as tf

# Define model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(64, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

# Compile
model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)

# Train
model.fit(X_train, y_train, epochs=50, validation_split=0.2)

# Save
model.save('models/neural_predictor.h5')
```

### Step 4: Integrate Models

Create a predictor wrapper:

```javascript
// src/ml/MLPredictor.js
const tf = require('@tensorflow/tfjs-node');
const logger = require('../utils/logger');

class MLPredictor {
  constructor(modelPath) {
    this.modelPath = modelPath;
    this.model = null;
  }

  async initialize() {
    try {
      this.model = await tf.loadLayersModel(`file://${this.modelPath}`);
      logger.info('ML model loaded successfully');
    } catch (error) {
      logger.error('Failed to load ML model', { error: error.message });
      throw error;
    }
  }

  async predictSuccess(features) {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const tensor = tf.tensor2d([features]);
    const prediction = await this.model.predict(tensor);
    const probability = await prediction.data();
    
    tensor.dispose();
    prediction.dispose();
    
    return probability[0];
  }
}

module.exports = MLPredictor;
```

### Step 5: Test Models

```bash
# Test ML predictions
node scripts/test-ml-predictions.js
```

## Model Features

### Recommended Features

1. **Opportunity Features:**
   - Expected profit (BPS)
   - Number of hops
   - Token pair volatility
   - Route complexity

2. **Liquidity Features:**
   - Total pool liquidity
   - Minimum pool liquidity
   - Liquidity ratio between pools
   - Recent volume

3. **Market Features:**
   - Current gas price
   - Gas price trend
   - Network congestion
   - Time of day
   - Day of week

4. **Historical Features:**
   - Success rate for token pair
   - Success rate for DEX combination
   - Average profit for similar opportunities
   - Recent failure count

## Model Performance Targets

### Success Predictor

- **Accuracy**: > 75%
- **Precision**: > 70% (avoid false positives)
- **Recall**: > 60% (catch most good opportunities)
- **F1 Score**: > 0.65

### Profit Predictor

- **MAE**: < 0.1% (mean absolute error)
- **RMSE**: < 0.2% (root mean square error)
- **R²**: > 0.6 (coefficient of determination)

## Integration Points

### In Opportunity Validation

```javascript
// src/bot/ArbitrageBot.js
async validateOpportunity(opportunity) {
  // ... existing validation ...
  
  // ML enhancement (if enabled)
  if (this.mlPredictor) {
    const features = this.extractFeatures(opportunity);
    const successProb = await this.mlPredictor.predictSuccess(features);
    
    if (successProb < 0.6) {
      logger.info('ML model predicts low success probability', {
        probability: successProb
      });
      return false; // Skip opportunity
    }
  }
  
  return true;
}
```

### In Profit Estimation

```javascript
// src/bot/FlashLoanCalculator.js
async estimateProfit(opportunity) {
  // ... existing estimation ...
  
  // ML enhancement (if enabled)
  if (this.mlPredictor) {
    const features = this.extractFeatures(opportunity);
    const predictedProfit = await this.mlPredictor.predictProfit(features);
    
    // Adjust expected profit based on ML prediction
    return predictedProfit;
  }
  
  return estimatedProfit;
}
```

## Monitoring ML Performance

Track these metrics:

```javascript
{
  mlPredictions: 0,
  mlCorrectPredictions: 0,
  mlFalsePositives: 0,
  mlFalseNegatives: 0,
  mlAccuracy: 0,
  mlPrecision: 0
}
```

## Model Retraining

Retrain models regularly:

1. **Weekly**: Update with new data
2. **Monthly**: Full retraining with expanded dataset
3. **After Major Changes**: Retrain if market conditions change significantly

## Dependencies

If using ML:

```bash
# For TensorFlow.js
npm install @tensorflow/tfjs-node

# For Python training pipeline
pip install tensorflow scikit-learn xgboost pandas numpy
```

## Alternatives to Custom ML

Instead of training custom models, consider:

1. **Statistical Models**: Moving averages, ARIMA for time series
2. **Rule-Based Systems**: Complex heuristics based on historical data
3. **Ensemble Methods**: Combine multiple simple predictors
4. **Third-Party APIs**: Use existing market prediction services

## Recommendation

**For Initial Deployment**: Run without ML (current setup)
- Simpler to maintain
- No training overhead
- Good baseline performance
- Can add ML later if needed

**For Advanced Optimization**: Add ML after 1-2 months
- Collect real production data
- Train on actual outcomes
- Gradually integrate predictions
- Monitor impact on profitability

## References

- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [TensorFlow.js Guide](https://www.tensorflow.org/js)
- [Scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- [Trading Bot ML Strategies](https://www.kaggle.com/competitions)

---

**Current Status**: ML is DISABLED by default. The bot works fully without it.
