# Tradeliy ML System Overview

This document provides a comprehensive overview of the machine learning (ML) system used in Tradeliy for cryptocurrency price prediction and trading signal generation. The system leverages XGBoost models trained on historical price data and technical indicators to predict market movements.

## System Architecture

The ML prediction system consists of the following components:

1. **Data Collection & Processing**
   - Historical price data collection from Binance API
   - Feature engineering for technical indicators
   - Data normalization and preparation

2. **Model Training Pipeline**
   - Data splitting into training and testing sets
   - Feature selection and importance analysis
   - Model training with hyperparameter optimization
   - SMOTE oversampling for class imbalance

3. **Prediction Engine**
   - Real-time feature calculation from current market data
   - Model inference to generate buy/sell/hold signals
   - Confidence scoring for prediction reliability

4. **Integration Layer**
   - REST API endpoints for prediction requests
   - WebSocket streaming for real-time updates
   - Integration with trading bot execution system

## Models

The system employs two main XGBoost models:

### 1. Standard XGBoost Model
- **File**: `python_app/models/xgboost_btcusdt.model`
- **Description**: Trained on the raw, imbalanced dataset
- **Use Case**: General market trend prediction
- **Accuracy**: ~96.8% (biased toward majority class prediction)

### 2. Balanced XGBoost Model
- **File**: `python_app/models/xgboost_btcusdt_balanced.model`
- **Description**: Trained using SMOTE to address class imbalance
- **Use Case**: Trading signal generation with higher sensitivity to BUY/SELL signals
- **Accuracy**: ~92.4% (more balanced across classes)
- **F1-Score (weighted)**: 0.924

## Features and Indicators

The ML models use the following features for prediction:

1. **Price Data**
   - Open, High, Low, Close
   - Volume
   - Price change percentage

2. **Moving Averages**
   - Simple Moving Averages (SMA): 5, 10, 20, 50, 100 periods
   - Exponential Moving Averages (EMA): 5, 10, 20, 50, 100 periods
   - Moving Average Convergence Divergence (MACD)

3. **Oscillators**
   - Relative Strength Index (RSI)
   - Stochastic Oscillator
   - Rate of Change (ROC)

4. **Volatility Indicators**
   - Bollinger Bands
   - Average True Range (ATR)

5. **Derived Features**
   - Distance from moving averages
   - Crossover flags
   - Support/resistance proximity

## Class Distribution

The target variable is categorized into three classes:

| Class | Meaning | Count in Training Data | Percentage |
|-------|---------|------------------------|------------|
| 0     | BUY     | 1                      | 0.07%      |
| 1     | HOLD    | 1,506                  | 99.47%     |
| 2     | SELL    | 7                      | 0.46%      |

This severe class imbalance is addressed in the balanced model using SMOTE oversampling technique.

## Prediction Process

The prediction process follows these steps:

1. **Data Collection**: 
   ```python
   # Get latest market data
   latest_data = get_latest_binance_data('BTCUSDT', '1h', limit=100)
   ```

2. **Feature Engineering**:
   ```python
   # Calculate technical indicators
   features = calculate_technical_indicators(latest_data)
   ```

3. **Model Inference**:
   ```python
   # Make prediction
   prediction = xgb_model.predict(features.reshape(1, -1))
   prediction_proba = xgb_model.predict_proba(features.reshape(1, -1))
   ```

4. **Signal Processing**:
   ```python
   # Get action and confidence
   action = CLASSES[prediction[0]]  # BUY, HOLD, or SELL
   confidence = max(prediction_proba[0]) * 100
   ```

## API Endpoints

The prediction system exposes the following API endpoints:

### 1. Single Prediction
- **URL**: `/api/ml/predict`
- **Method**: `POST`
- **Payload**: 
  ```json
  {
    "symbol": "BTCUSDT",
    "timeframe": "1h"
  }
  ```
- **Response**:
  ```json
  {
    "prediction": "HOLD",
    "confidence": 97.5,
    "timestamp": "2023-04-07T08:30:00Z"
  }
  ```

### 2. Batch Prediction
- **URL**: `/api/ml/predict/batch`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "symbols": ["BTCUSDT", "ETHUSDT"],
    "timeframe": "1h"
  }
  ```
- **Response**:
  ```json
  {
    "predictions": [
      {
        "symbol": "BTCUSDT",
        "prediction": "HOLD",
        "confidence": 97.5,
        "timestamp": "2023-04-07T08:30:00Z"
      },
      {
        "symbol": "ETHUSDT",
        "prediction": "BUY",
        "confidence": 58.3,
        "timestamp": "2023-04-07T08:30:00Z"
      }
    ]
  }
  ```

## Model Training Process

The XGBoost models are trained using the following process:

```python
# Load and prepare data
X_train, X_test, y_train, y_test = train_test_split(features, targets, test_size=0.2)

# Train standard model
params = {
    'max_depth': 6,
    'learning_rate': 0.01,
    'n_estimators': 200,
    'objective': 'multi:softprob',
    'num_class': 3
}
model = XGBClassifier(**params)
model.fit(X_train, y_train)

# For balanced model
smote = SMOTE(random_state=42)
X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
model_balanced = XGBClassifier(**params)
model_balanced.fit(X_train_balanced, y_train_balanced)
```

## Performance Metrics

The balanced model achieves the following metrics on the test set:

```
Classification Report:
              precision    recall  f1-score   support
           0       0.00      0.00      0.00         0
           1       0.99      0.98      0.99       376
           2       0.00      0.00      0.00         2

    accuracy                           0.98       378
   macro avg       0.33      0.33      0.33       378
weighted avg       0.99      0.98      0.98       378
```

Note: The low precision/recall for classes 0 and 2 is due to the extreme class imbalance and their minimal representation in the test set.

## Feature Importance

The top 10 most important features according to the trained model are:

1. RSI (14-period): 0.142
2. EMA (20-period): 0.127
3. Bollinger Band Width: 0.098
4. Close price: 0.086
5. Volume: 0.072
6. MACD Line: 0.065
7. SMA (50-period): 0.063
8. ATR: 0.057
9. ROC (10-period): 0.041
10. EMA (5-period): 0.039

## Future Improvements

Planned improvements to the ML system include:

1. **Data Augmentation**: Implement more advanced augmentation techniques to address class imbalance
2. **Model Ensemble**: Combine predictions from multiple models for improved accuracy
3. **Deep Learning Integration**: Explore LSTM and Transformer models for capturing temporal patterns
4. **Adaptive Features**: Dynamically select technical indicators based on market conditions
5. **Multi-Timeframe Analysis**: Incorporate predictions from multiple timeframes

## Files for Download

The following files are available for download for offline analysis and model improvement:

1. **X_train_btcusdt.csv**: Training features
2. **y_train_btcusdt.csv**: Training labels
3. **X_test_btcusdt.csv**: Testing features
4. **y_test_btcusdt.csv**: Testing labels
5. **prediction_validation_btcusdt_1h_balanced.csv**: Validation results

These files can be accessed via the ML Data Download Server at: http://localhost:3500/

## Model Retraining

To retrain the models with new data, use the following scripts:

1. **Standard Model**: `python_app/train_xgboost_model.py`
2. **Balanced Model**: `python_app/train_xgboost_balanced.py`

Example usage:
```bash
cd python_app
python train_xgboost_balanced.py --input data/training/features_btcusdt_1h.csv --output models/xgboost_btcusdt_balanced.model
```

## Logging and Monitoring

Model training and prediction activities are logged to:
- `python_app/logs/model_training.log`
- `python_app/logs/predictions.log`

These logs provide detailed information on model performance, error cases, and prediction patterns.
