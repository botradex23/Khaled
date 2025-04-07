# ML Training Data Files

This directory contains the machine learning training and testing data files for the Tradeliy trading prediction models.

## Available Files

1. **X_train_btcusdt.csv**: Training features containing technical indicators and price data
2. **y_train_btcusdt.csv**: Training labels with target values (0=BUY, 1=HOLD, 2=SELL)
3. **X_test_btcusdt.csv**: Testing features
4. **y_test_btcusdt.csv**: Testing labels
5. **prediction_validation_btcusdt_1h_balanced.csv**: Validation results from the balanced model

## Class Distribution

The dataset has the following class distribution:

| Class | Meaning | Count | Percentage |
|-------|---------|-------|------------|
| 0     | BUY     | 1     | 0.07%      |
| 1     | HOLD    | 1,506 | 99.47%     |
| 2     | SELL    | 7     | 0.46%      |

This severe class imbalance requires special handling during model training.

## For more information

See the full ML system documentation in `ML_SYSTEM_OVERVIEW.md`.
