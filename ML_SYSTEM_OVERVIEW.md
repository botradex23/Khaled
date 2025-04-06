# Machine Learning System Overview

## Introduction

Tradeliy integrates advanced machine learning techniques, specifically XGBoost models, to predict cryptocurrency price movements and generate trading signals. This document provides an overview of the ML system components, how they integrate with the trading platform, and how to maintain them.

## Components

### 1. Prediction Models

#### XGBoost Models

The primary prediction engine uses XGBoost, a powerful gradient boosting framework optimized for speed and performance:

- `xgboost_btcusdt.model`: Standard XGBoost model for BTC/USDT price prediction
- `xgboost_btcusdt_balanced.model`: Balanced XGBoost model with improved class balance for more conservative predictions
- `model_btcusdt.pkl`: Serialized model including preprocessing pipeline
- `model_ethusdt.pkl`: Serialized model for ETH/USDT predictions

### 2. Prediction Engine

The prediction engine is responsible for loading models, preprocessing data, making predictions, and generating trading signals:

- `ml_prediction_engine.py`: Core prediction engine that loads models and generates predictions
- `predict_xgboost.py`: Specialized module for XGBoost model predictions
- `live_prediction.py`: Real-time prediction service for market data streams

### 3. Training Pipeline

The system includes scripts for data preparation, model training, and evaluation:

- `prepare_training_data.py`: Prepares raw market data for training
- `split_train_test.py`: Splits dataset into training and test sets
- `train_crypto_models.py`: Main training script for all cryptocurrency models
- `train_xgboost_model.py`: Specialized training for XGBoost models
- `train_xgboost_balanced.py`: Training for balanced XGBoost models

### 4. API Integration

ML predictions are exposed through Flask API endpoints:

- `routes/ml_prediction_routes.py`: Endpoints for requesting predictions
- `routes/live_prediction_routes.py`: Real-time prediction streaming
- `routes/ml_routes.py`: General ML system management endpoints

### 5. Logging and Monitoring

The system maintains detailed logs to track performance and debugging:

- `logs/xgboost_prediction.log`: Detailed prediction logs
- `logs/xgboost_training.log`: Model training logs
- `logs/ml_system.log`: General ML system logs
- `logs/ml_trades.log`: ML-generated trade logs
- `logs/live_prediction.log`: Real-time prediction logs
- `logs/prediction_engine.log`: Prediction engine performance metrics

## Integration with Trading Platform

### How Predictions are Used

1. **Signal Generation**: The ML models generate buy/sell signals based on predicted price movements
2. **Risk Management**: Predictions are combined with risk settings to determine position sizes
3. **Automated Trading**: ML signals can trigger automated trades through the Binance API
4. **User Dashboard**: Predictions are displayed in the user dashboard with confidence levels

### Data Flow

1. Market data is collected from Binance API
2. Data is preprocessed and fed into the ML prediction engine
3. Predictions are stored in MongoDB and exposed via API
4. Frontend components visualize predictions and trading signals
5. Trading bots can execute trades based on high-confidence signals

## Maintenance and Updating

### Model Retraining

Models should be retrained periodically to adapt to changing market conditions:

1. Run `prepare_training_data.py` with updated market data
2. Execute `train_xgboost_model.py` to train a new model
3. Evaluate the model with `historical_prediction_validator.py`
4. Deploy the new model by replacing the existing model files

### Performance Monitoring

The ML system includes monitoring tools to track prediction accuracy:

- `ml_prediction_test.py`: Tests prediction accuracy on historical data
- `test_live_prediction.py`: Tests the real-time prediction service
- `historical_prediction_validator.py`: Validates models against historical data

## Troubleshooting

Common issues and solutions:

1. **Prediction Service Not Responding**: Check `logs/prediction_engine.log` for errors
2. **Inaccurate Predictions**: Verify market data quality and consider retraining models
3. **High Latency**: Check system resources and optimize prediction pipeline
4. **Missing Features**: Ensure all required market data features are available

## Future Enhancements

Planned improvements for the ML system:

1. **Deep Learning Models**: Integration of LSTM networks for sequence prediction
2. **Sentiment Analysis**: Incorporating market sentiment from news and social media
3. **Ensemble Methods**: Combining multiple models for higher accuracy
4. **Reinforcement Learning**: Trading agents that learn from market interactions

---

This document provides a high-level overview of the machine learning system. For detailed implementation details, refer to the source code and comments within each module.