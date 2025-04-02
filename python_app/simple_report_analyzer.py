#!/usr/bin/env python3
"""
Simple Validation Report Analyzer

A simplified version of the report analyzer that focuses on generating 
visualizations without complex HTML templates.

Usage:
    python simple_report_analyzer.py --report=path/to/report.csv
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict

# Add parent directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

def load_report(report_path):
    """Load the validation report from CSV file"""
    if not os.path.exists(report_path):
        print(f"Error: Report file '{report_path}' not found")
        return None
    
    try:
        df = pd.read_csv(report_path)
        # Convert timestamp to datetime
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        print(f"Loaded report with {len(df)} records")
        return df
    except Exception as e:
        print(f"Error loading report: {e}")
        return None

def create_basic_stats(df):
    """Create basic statistics from the validation report"""
    if df is None or df.empty:
        return {}
    
    stats = {}
    
    # Overall accuracy
    stats['total_predictions'] = len(df)
    stats['correct_predictions'] = df['was_correct'].sum()
    stats['accuracy'] = (stats['correct_predictions'] / stats['total_predictions']) * 100 if stats['total_predictions'] > 0 else 0
    
    # Predictions by type
    for pred_type in ['BUY', 'HOLD', 'SELL']:
        type_df = df[df['prediction'] == pred_type]
        stats[f'{pred_type.lower()}_predictions'] = len(type_df)
        stats[f'{pred_type.lower()}_correct'] = type_df['was_correct'].sum() if not type_df.empty else 0
        stats[f'{pred_type.lower()}_accuracy'] = (stats[f'{pred_type.lower()}_correct'] / stats[f'{pred_type.lower()}_predictions']) * 100 if stats[f'{pred_type.lower()}_predictions'] > 0 else 0
    
    # Average confidence
    stats['avg_confidence'] = df['confidence'].mean()
    
    # High confidence stats (>0.8)
    high_conf_df = df[df['confidence'] > 0.8]
    stats['high_conf_predictions'] = len(high_conf_df)
    stats['high_conf_correct'] = high_conf_df['was_correct'].sum() if not high_conf_df.empty else 0
    stats['high_conf_accuracy'] = (stats['high_conf_correct'] / stats['high_conf_predictions']) * 100 if stats['high_conf_predictions'] > 0 else 0
    
    return stats

def plot_prediction_accuracy(df, output_dir):
    """Plot prediction accuracy by prediction type"""
    if df is None or df.empty:
        return
    
    # Create data for the plot
    pred_types = ['BUY', 'HOLD', 'SELL']
    counts = []
    correct_counts = []
    
    for pred_type in pred_types:
        type_df = df[df['prediction'] == pred_type]
        counts.append(len(type_df))
        correct_counts.append(type_df['was_correct'].sum() if not type_df.empty else 0)
    
    # Create the figure
    plt.figure(figsize=(10, 6))
    
    # Set position of bars on X axis
    r1 = np.arange(len(pred_types))
    r2 = [x + 0.25 for x in r1]
    
    # Create bars
    plt.bar(r1, counts, color='skyblue', width=0.25, label='Total Predictions')
    plt.bar(r2, correct_counts, color='lightgreen', width=0.25, label='Correct Predictions')
    
    # Add accuracy percentages
    for i, (count, correct) in enumerate(zip(counts, correct_counts)):
        if count > 0:
            accuracy = (correct / count) * 100
            plt.text(r1[i], count + 0.5, f'{count}', ha='center')
            plt.text(r2[i], correct + 0.5, f'{correct}\n({accuracy:.1f}%)', ha='center')
        else:
            plt.text(r1[i], 0.5, '0', ha='center')
            plt.text(r2[i], 0.5, '0\n(0%)', ha='center')
    
    # Add labels and title
    plt.xlabel('Prediction Type')
    plt.ylabel('Count')
    plt.title('Prediction Accuracy by Type')
    plt.xticks([r + 0.125 for r in range(len(pred_types))], pred_types)
    plt.legend()
    
    # Add grid lines
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Save the plot
    plt.tight_layout()
    output_path = os.path.join(output_dir, 'prediction_accuracy.png')
    plt.savefig(output_path)
    plt.close()
    print(f"Saved prediction accuracy chart to: {output_path}")

def plot_cumulative_accuracy(df, output_dir):
    """Plot cumulative prediction accuracy over time"""
    if df is None or df.empty or 'timestamp' not in df.columns:
        return
    
    # Calculate cumulative accuracy
    df = df.sort_values('timestamp')
    df['correct_cumsum'] = df['was_correct'].cumsum()
    df['total_cumsum'] = np.arange(1, len(df) + 1)
    df['cumulative_accuracy'] = (df['correct_cumsum'] / df['total_cumsum']) * 100
    
    plt.figure(figsize=(12, 6))
    
    # Plot cumulative accuracy
    plt.plot(df['timestamp'], df['cumulative_accuracy'], color='blue', marker='', linestyle='-', linewidth=2)
    
    # Add a horizontal line at 50% accuracy
    plt.axhline(y=50, color='red', linestyle='--', alpha=0.7, label='50% Accuracy')
    
    # Add labels and title
    plt.xlabel('Time')
    plt.ylabel('Cumulative Accuracy (%)')
    plt.title('Cumulative Prediction Accuracy Over Time')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend()
    
    # Format x-axis to show dates nicely
    plt.gcf().autofmt_xdate()
    
    # Save the plot
    plt.tight_layout()
    output_path = os.path.join(output_dir, 'cumulative_accuracy.png')
    plt.savefig(output_path)
    plt.close()
    print(f"Saved cumulative accuracy chart to: {output_path}")

def plot_confidence_vs_accuracy(df, output_dir):
    """Plot relationship between prediction confidence and accuracy"""
    if df is None or df.empty:
        return
    
    # Create confidence bins
    bins = [0, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0]
    bin_labels = ['0-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-0.95', '0.95-0.98', '0.98-1.0']
    
    df['confidence_bin'] = pd.cut(df['confidence'], bins=bins, labels=bin_labels, right=True)
    
    # Calculate accuracy by confidence bin
    accuracy_by_bin = df.groupby('confidence_bin').agg(
        total=('was_correct', 'count'),
        correct=('was_correct', 'sum')
    ).reset_index()
    
    accuracy_by_bin['accuracy'] = accuracy_by_bin['correct'] / accuracy_by_bin['total'] * 100
    
    # Create the plot
    plt.figure(figsize=(12, 6))
    
    # Create bars with different colors based on accuracy
    bar_colors = []
    for acc in accuracy_by_bin['accuracy']:
        if acc < 50:
            bar_colors.append('lightcoral')
        elif acc < 70:
            bar_colors.append('gold')
        else:
            bar_colors.append('lightgreen')
    
    # Plot bars
    bars = plt.bar(accuracy_by_bin['confidence_bin'], accuracy_by_bin['accuracy'], color=bar_colors)
    
    # Add count labels
    for i, bar in enumerate(bars):
        total = accuracy_by_bin.iloc[i]['total']
        correct = accuracy_by_bin.iloc[i]['correct']
        plt.text(bar.get_x() + bar.get_width()/2, 5, 
                 f'n={total}\n{correct} correct', 
                 ha='center', va='bottom', rotation=0, fontsize=9)
    
    # Add labels and title
    plt.xlabel('Confidence Range')
    plt.ylabel('Accuracy (%)')
    plt.title('Prediction Accuracy by Confidence Level')
    plt.grid(True, axis='y', linestyle='--', alpha=0.7)
    
    # Add a horizontal line at 50% accuracy
    plt.axhline(y=50, color='red', linestyle='--', alpha=0.5, label='50% Accuracy')
    
    # Rotate x labels for better readability
    plt.xticks(rotation=45)
    
    # Save the plot
    plt.tight_layout()
    output_path = os.path.join(output_dir, 'confidence_vs_accuracy.png')
    plt.savefig(output_path)
    plt.close()
    print(f"Saved confidence vs accuracy chart to: {output_path}")

def plot_indicators_vs_predictions(df, output_dir):
    """Plot key technical indicators and predictions"""
    if df is None or df.empty or 'timestamp' not in df.columns:
        return
    
    # Create figure with two subplots (price and indicators)
    fig, axs = plt.subplots(3, 1, figsize=(14, 12), sharex=True, gridspec_kw={'height_ratios': [3, 1, 1]})
    
    # Plot price data with predictions
    axs[0].plot(df['timestamp'], df['current_price'], color='blue', label='Price')
    
    # Add markers for predictions
    buy_points = df[df['prediction'] == 'BUY']
    sell_points = df[df['prediction'] == 'SELL']
    
    # Mark correct and incorrect predictions
    correct_buys = buy_points[buy_points['was_correct']]
    incorrect_buys = buy_points[~buy_points['was_correct']]
    correct_sells = sell_points[sell_points['was_correct']]
    incorrect_sells = sell_points[~sell_points['was_correct']]
    
    # Plot markers for different prediction outcomes
    if len(correct_buys) > 0:
        axs[0].scatter(correct_buys['timestamp'], correct_buys['current_price'], color='green', marker='^', s=100, label='Correct BUY')
    if len(incorrect_buys) > 0:
        axs[0].scatter(incorrect_buys['timestamp'], incorrect_buys['current_price'], color='lightgreen', marker='^', s=60, alpha=0.6, label='Incorrect BUY')
    if len(correct_sells) > 0:
        axs[0].scatter(correct_sells['timestamp'], correct_sells['current_price'], color='red', marker='v', s=100, label='Correct SELL')
    if len(incorrect_sells) > 0:
        axs[0].scatter(incorrect_sells['timestamp'], incorrect_sells['current_price'], color='lightcoral', marker='v', s=60, alpha=0.6, label='Incorrect SELL')
    
    # Add Bollinger Bands if available
    if 'bb_upper' in df.columns and 'bb_lower' in df.columns:
        axs[0].plot(df['timestamp'], df['bb_upper'], color='purple', linestyle='--', alpha=0.7, label='BB Upper')
        axs[0].plot(df['timestamp'], df['bb_lower'], color='purple', linestyle='--', alpha=0.7, label='BB Lower')
        # Fill between Bollinger Bands
        axs[0].fill_between(df['timestamp'], df['bb_lower'], df['bb_upper'], color='purple', alpha=0.1)
    
    # Add EMA if available
    if 'ema_20' in df.columns:
        axs[0].plot(df['timestamp'], df['ema_20'], color='orange', linestyle='-', label='EMA 20')
    
    axs[0].set_ylabel('Price')
    axs[0].set_title('Price Chart with Predictions')
    axs[0].grid(True, linestyle='--', alpha=0.7)
    axs[0].legend(loc='upper left')
    
    # Plot RSI
    if 'rsi_14' in df.columns:
        axs[1].plot(df['timestamp'], df['rsi_14'], color='green', label='RSI (14)')
        axs[1].axhline(y=70, color='red', linestyle='--', alpha=0.7)
        axs[1].axhline(y=30, color='green', linestyle='--', alpha=0.7)
        axs[1].set_ylabel('RSI')
        axs[1].set_ylim(0, 100)
        axs[1].grid(True, linestyle='--', alpha=0.7)
        axs[1].legend(loc='upper left')
    
    # Plot MACD
    if 'macd' in df.columns:
        axs[2].plot(df['timestamp'], df['macd'], color='blue', label='MACD')
        axs[2].axhline(y=0, color='red', linestyle='-', alpha=0.3)
        axs[2].set_ylabel('MACD')
        axs[2].grid(True, linestyle='--', alpha=0.7)
        axs[2].legend(loc='upper left')
    
    # Format x-axis to show dates nicely
    fig.autofmt_xdate()
    
    # Save the plot
    plt.tight_layout()
    output_path = os.path.join(output_dir, 'indicators_and_predictions.png')
    plt.savefig(output_path)
    plt.close()
    print(f"Saved indicators chart to: {output_path}")

def print_summary_text(df, stats, output_dir):
    """Print and save a text summary of the analysis"""
    if df is None or df.empty or not stats:
        return
    
    summary_text = [
        "======================================================",
        "          HISTORICAL PREDICTION VALIDATION            ",
        "======================================================",
        f"",
        f"Symbol: {df['symbol'].iloc[0]}",
        f"Interval: {df['interval'].iloc[0]}",
        f"Model type: {df['model_type'].iloc[0]}",
        f"",
        f"OVERALL STATISTICS:",
        f"------------------",
        f"Total predictions: {stats['total_predictions']}",
        f"Correct predictions: {stats['correct_predictions']} ({stats['accuracy']:.2f}%)",
        f"Average confidence: {stats['avg_confidence']:.4f}",
        f"",
        f"PREDICTION TYPE BREAKDOWN:",
        f"-------------------------",
        f"BUY signals: {stats['buy_predictions']} predictions, {stats['buy_correct']} correct ({stats['buy_accuracy']:.2f}%)",
        f"SELL signals: {stats['sell_predictions']} predictions, {stats['sell_correct']} correct ({stats['sell_accuracy']:.2f}%)",
        f"HOLD signals: {stats['hold_predictions']} predictions, {stats['hold_correct']} correct ({stats['hold_accuracy']:.2f}%)",
        f"",
        f"CONFIDENCE ANALYSIS:",
        f"-------------------",
        f"High confidence predictions (>0.8): {stats['high_conf_predictions']}",
        f"High confidence accuracy: {stats['high_conf_accuracy']:.2f}%",
        f"",
        f"RECOMMENDATIONS:",
        f"---------------"
    ]
    
    # Add recommendations based on statistics
    recommendations = []
    
    if stats['accuracy'] >= 70:
        recommendations.append("- The model performs well with an accuracy above 70%, indicating good predictive performance.")
    elif stats['accuracy'] >= 50:
        recommendations.append("- The model shows moderate performance with accuracy between 50-70%. Further optimization may be beneficial.")
    else:
        recommendations.append("- The model's accuracy is below 50%, suggesting it requires significant improvement or retraining.")
    
    if stats['high_conf_accuracy'] > 70:
        recommendations.append("- Continue using the model as is, with particular attention to high-confidence predictions (>0.8).")
    
    if stats['high_conf_accuracy'] > stats['accuracy'] + 10:
        recommendations.append("- Consider using a higher confidence threshold (0.8+) for trading decisions to improve accuracy.")
    
    if stats['accuracy'] < 60:
        recommendations.append("- The model may benefit from retraining with different features or parameters to improve its accuracy.")
    
    # Determine which signal type has the best accuracy
    best_accuracy = max(stats['buy_accuracy'], stats['sell_accuracy'], stats['hold_accuracy'])
    if best_accuracy == stats['buy_accuracy']:
        best_signal = "BUY"
    elif best_accuracy == stats['sell_accuracy']:
        best_signal = "SELL"
    else:
        best_signal = "HOLD"
    
    recommendations.append(f"- The model performs particularly well on {best_signal} signals ({best_accuracy:.2f}% accuracy), which could be leveraged in trading strategies.")
    recommendations.append("- Regular revalidation should be performed as market conditions change to ensure continued model effectiveness.")
    
    # Add recommendations to summary
    summary_text.extend(recommendations)
    summary_text.append("\n======================================================")
    
    # Print to console
    for line in summary_text:
        print(line)
    
    # Save to file
    output_path = os.path.join(output_dir, 'validation_summary.txt')
    with open(output_path, 'w') as f:
        f.write('\n'.join(summary_text))
    
    print(f"\nSaved text summary to: {output_path}")

def main():
    """Main function for simple report analysis"""
    parser = argparse.ArgumentParser(description='Analyze ML prediction validation report')
    parser.add_argument('--report', type=str, required=True,
                        help='Path to the validation report CSV file')
    parser.add_argument('--output', type=str, default=None,
                        help='Output directory for charts and analysis (default: same directory as report)')
    
    args = parser.parse_args()
    
    # Load the report
    df = load_report(args.report)
    if df is None:
        print("Error: Failed to load report data")
        return 1
    
    # Set output directory
    if args.output:
        output_dir = args.output
    else:
        output_dir = os.path.dirname(os.path.abspath(args.report))
    
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory: {output_dir}")
    
    # Create statistics
    stats = create_basic_stats(df)
    
    # Generate visualizations
    print("\nGenerating charts...")
    plot_prediction_accuracy(df, output_dir)
    plot_cumulative_accuracy(df, output_dir)
    plot_confidence_vs_accuracy(df, output_dir)
    plot_indicators_vs_predictions(df, output_dir)
    
    # Generate text summary
    print("\nGenerating summary...")
    print_summary_text(df, stats, output_dir)
    
    print("\nAnalysis complete!")
    return 0

if __name__ == "__main__":
    sys.exit(main())