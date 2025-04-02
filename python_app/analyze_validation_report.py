#!/usr/bin/env python3
"""
Analyze Validation Report

This script analyzes and visualizes the results from historical prediction validation,
generating charts and statistics to evaluate model performance.

Usage:
    python analyze_validation_report.py --report=path/to/report.csv

Arguments:
    --report: Path to the validation report CSV file (required)
    --output: Output directory for charts and analysis (default: same directory as report)
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Add parent directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

def load_report(report_path: str) -> pd.DataFrame:
    """
    Load the validation report from a CSV file.
    
    Args:
        report_path: Path to the CSV report file
        
    Returns:
        DataFrame containing the report data
    """
    if not os.path.exists(report_path):
        print(f"Error: Report file '{report_path}' not found")
        return pd.DataFrame()
    
    try:
        df = pd.read_csv(report_path)
        # Convert timestamp to datetime
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        print(f"Loaded report with {len(df)} records")
        return df
    except Exception as e:
        print(f"Error loading report: {e}")
        return pd.DataFrame()

def create_basic_stats(df: pd.DataFrame) -> Dict:
    """
    Create basic statistics from the validation report.
    
    Args:
        df: DataFrame containing validation data
        
    Returns:
        Dictionary with basic statistics
    """
    if df.empty:
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
    
    # Time range
    if 'timestamp' in df.columns:
        stats['start_time'] = df['timestamp'].min()
        stats['end_time'] = df['timestamp'].max()
    
    return stats

def plot_prediction_accuracy(df: pd.DataFrame, output_dir: str) -> None:
    """
    Plot prediction accuracy by prediction type.
    
    Args:
        df: DataFrame containing validation data
        output_dir: Directory to save the plot
    """
    if df.empty:
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

def plot_cumulative_accuracy(df: pd.DataFrame, output_dir: str) -> None:
    """
    Plot cumulative prediction accuracy over time.
    
    Args:
        df: DataFrame containing validation data
        output_dir: Directory to save the plot
    """
    if df.empty or 'cumulative_accuracy' not in df.columns or 'timestamp' not in df.columns:
        return
    
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

def plot_confidence_vs_accuracy(df: pd.DataFrame, output_dir: str) -> None:
    """
    Plot relationship between prediction confidence and accuracy.
    
    Args:
        df: DataFrame containing validation data
        output_dir: Directory to save the plot
    """
    if df.empty:
        return
    
    # Create confidence bins
    bins = [0, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 1.0]
    bin_labels = ['0-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-0.95', '0.95-0.98', '0.98-1.0']
    
    df['confidence_bin'] = pd.cut(df['confidence'], bins=bins, labels=bin_labels, right=True)
    
    # Calculate accuracy by confidence bin
    accuracy_by_bin = df.groupby('confidence_bin').agg(
        total=('was_correct', 'count'),
        correct=('was_correct', 'sum'),
        accuracy=('was_correct', lambda x: x.mean() * 100)
    ).reset_index()
    
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

def plot_indicators_vs_predictions(df: pd.DataFrame, output_dir: str) -> None:
    """
    Plot key technical indicators and predictions.
    
    Args:
        df: DataFrame containing validation data
        output_dir: Directory to save the plot
    """
    if df.empty or 'rsi_14' not in df.columns or 'timestamp' not in df.columns:
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
    if not correct_buys.empty:
        axs[0].scatter(correct_buys['timestamp'], correct_buys['current_price'], color='green', marker='^', s=100, label='Correct BUY')
    if not incorrect_buys.empty:
        axs[0].scatter(incorrect_buys['timestamp'], incorrect_buys['current_price'], color='lightgreen', marker='^', s=60, alpha=0.6, label='Incorrect BUY')
    if not correct_sells.empty:
        axs[0].scatter(correct_sells['timestamp'], correct_sells['current_price'], color='red', marker='v', s=100, label='Correct SELL')
    if not incorrect_sells.empty:
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

def create_html_report(df: pd.DataFrame, stats: Dict, output_dir: str) -> None:
    """
    Create a comprehensive HTML report with all analysis.
    
    Args:
        df: DataFrame containing validation data
        stats: Dictionary with statistics
        output_dir: Directory to save the HTML report
    """
    if df.empty:
        return
    
    # Create an HTML template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prediction Validation Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
            h1, h2, h3 {{ color: #333; }}
            .container {{ max-width: 1200px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }}
            .stats {{ display: flex; flex-wrap: wrap; margin-bottom: 20px; }}
            .stat-card {{ background-color: #f8f9fa; border-radius: 5px; padding: 15px; margin: 10px; min-width: 200px; flex: 1; }}
            .chart-container {{ margin: 30px 0; text-align: center; }}
            .chart {{ max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; }}
            table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f2f2f2; }}
            tr:nth-child(even) {{ background-color: #f9f9f9; }}
            .metric-name {{ font-weight: bold; }}
            .good {{ color: green; }}
            .average {{ color: orange; }}
            .poor {{ color: red; }}
            .footer {{ margin-top: 30px; text-align: center; color: #777; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>ML Prediction Validation Report</h1>
            <p>Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            
            <h2>Overall Statistics</h2>
            <div class="stats">
                <div class="stat-card">
                    <h3>General</h3>
                    <p><span class="metric-name">Symbol:</span> {df['symbol'].iloc[0]}</p>
                    <p><span class="metric-name">Interval:</span> {df['interval'].iloc[0]}</p>
                    <p><span class="metric-name">Model Type:</span> {df['model_type'].iloc[0]}</p>
                    <p><span class="metric-name">Date Range:</span> {stats.get('start_time', 'N/A')} to {stats.get('end_time', 'N/A')}</p>
                </div>
                
                <div class="stat-card">
                    <h3>Accuracy</h3>
                    <p><span class="metric-name">Total Predictions:</span> {stats.get('total_predictions', 0)}</p>
                    <p><span class="metric-name">Correct Predictions:</span> {stats.get('correct_predictions', 0)}</p>
                    <p><span class="metric-name">Overall Accuracy:</span> 
                        <span class="{
                            'good' if stats.get('accuracy', 0) >= 70 else 
                            'average' if stats.get('accuracy', 0) >= 50 else 
                            'poor'
                        }">{stats.get('accuracy', 0):.2f}%</span>
                    </p>
                </div>
                
                <div class="stat-card">
                    <h3>Confidence</h3>
                    <p><span class="metric-name">Average Confidence:</span> {stats.get('avg_confidence', 0):.4f}</p>
                    <p><span class="metric-name">High Confidence Predictions:</span> {stats.get('high_conf_predictions', 0)}</p>
                    <p><span class="metric-name">High Confidence Accuracy:</span> 
                        <span class="{
                            'good' if stats.get('high_conf_accuracy', 0) >= 70 else 
                            'average' if stats.get('high_conf_accuracy', 0) >= 50 else 
                            'poor'
                        }">{stats.get('high_conf_accuracy', 0):.2f}%</span>
                    </p>
                </div>
            </div>
            
            <h2>Prediction Type Breakdown</h2>
            <div class="stats">
                <div class="stat-card">
                    <h3>BUY Predictions</h3>
                    <p><span class="metric-name">Total:</span> {stats.get('buy_predictions', 0)}</p>
                    <p><span class="metric-name">Correct:</span> {stats.get('buy_correct', 0)}</p>
                    <p><span class="metric-name">Accuracy:</span> 
                        <span class="{
                            'good' if stats.get('buy_accuracy', 0) >= 70 else 
                            'average' if stats.get('buy_accuracy', 0) >= 50 else 
                            'poor'
                        }">{stats.get('buy_accuracy', 0):.2f}%</span>
                    </p>
                </div>
                
                <div class="stat-card">
                    <h3>HOLD Predictions</h3>
                    <p><span class="metric-name">Total:</span> {stats.get('hold_predictions', 0)}</p>
                    <p><span class="metric-name">Correct:</span> {stats.get('hold_correct', 0)}</p>
                    <p><span class="metric-name">Accuracy:</span> 
                        <span class="{
                            'good' if stats.get('hold_accuracy', 0) >= 70 else 
                            'average' if stats.get('hold_accuracy', 0) >= 50 else 
                            'poor'
                        }">{stats.get('hold_accuracy', 0):.2f}%</span>
                    </p>
                </div>
                
                <div class="stat-card">
                    <h3>SELL Predictions</h3>
                    <p><span class="metric-name">Total:</span> {stats.get('sell_predictions', 0)}</p>
                    <p><span class="metric-name">Correct:</span> {stats.get('sell_correct', 0)}</p>
                    <p><span class="metric-name">Accuracy:</span> 
                        <span class="{
                            'good' if stats.get('sell_accuracy', 0) >= 70 else 
                            'average' if stats.get('sell_accuracy', 0) >= 50 else 
                            'poor'
                        }">{stats.get('sell_accuracy', 0):.2f}%</span>
                    </p>
                </div>
            </div>
            
            <h2>Charts and Visualizations</h2>
            
            <div class="chart-container">
                <h3>Prediction Accuracy by Type</h3>
                <img src="prediction_accuracy.png" alt="Prediction Accuracy by Type" class="chart">
            </div>
            
            <div class="chart-container">
                <h3>Cumulative Accuracy Over Time</h3>
                <img src="cumulative_accuracy.png" alt="Cumulative Accuracy Over Time" class="chart">
            </div>
            
            <div class="chart-container">
                <h3>Confidence vs. Accuracy</h3>
                <img src="confidence_vs_accuracy.png" alt="Confidence vs. Accuracy" class="chart">
            </div>
            
            <div class="chart-container">
                <h3>Price Chart with Indicators and Predictions</h3>
                <img src="indicators_and_predictions.png" alt="Price Chart with Indicators and Predictions" class="chart">
            </div>
            
            <h2>Conclusion and Recommendations</h2>
            <p>
                Based on the analysis of {stats.get('total_predictions', 0)} predictions for {df['symbol'].iloc[0]} on the {df['interval'].iloc[0]} timeframe,
                the {df['model_type'].iloc[0]} model achieved an overall accuracy of {stats.get('accuracy', 0):.2f}%.
            </p>
            <p>
                {
                    "The model performs well with an accuracy above 70%, indicating good predictive performance." 
                    if stats.get('accuracy', 0) >= 70 else 
                    "The model shows moderate performance with an accuracy between 50-70%. Further optimization may be beneficial." 
                    if stats.get('accuracy', 0) >= 50 else 
                    "The model's accuracy is below 50%, suggesting that it requires significant improvement or retraining with different parameters."
                }
            </p>
            
            <p id="confidence-analysis">
            </p>
            <script>
                // Fill in the confidence analysis using JavaScript
                document.addEventListener('DOMContentLoaded', function() {
                    const avgConfidence = {stats.get('avg_confidence', 0)};
                    const highConfAccuracy = {stats.get('high_conf_accuracy', 0)};
                    
                    let confidenceText = "";
                    if (avgConfidence > 0.8 && highConfAccuracy > 70) {{
                        confidenceText = `The model has high confidence in its predictions (average ${avgConfidence.toFixed(4)}), and these high confidence predictions have good accuracy (${highConfAccuracy.toFixed(2)}%).`;
                    }} else if (avgConfidence > 0.8) {{
                        confidenceText = `While the model expresses high confidence (${avgConfidence.toFixed(4)}), the accuracy of high-confidence predictions (${highConfAccuracy.toFixed(2)}%) suggests potential overconfidence.`;
                    }} else {{
                        confidenceText = `The model shows moderate confidence in its predictions (${avgConfidence.toFixed(4)}), which aligns with its accuracy levels.`;
                    }}
                    
                    document.getElementById('confidence-analysis').textContent = confidenceText;
                });
            </script>
            
            <p>
                Recommendations:
                <ul>
                    {
                        "<li>Continue using the model as is, with particular attention to high-confidence predictions above 0.8.</li>"
                        if stats.get('high_conf_accuracy', 0) > 70 else ""
                    }
                    {
                        "<li>Consider using a higher confidence threshold (0.8+) for trading decisions to improve accuracy.</li>"
                        if stats.get('high_conf_accuracy', 0) > stats.get('accuracy', 0) + 10 else ""
                    }
                    {
                        "<li>The model may benefit from retraining with different features or parameters to improve its accuracy.</li>"
                        if stats.get('accuracy', 0) < 60 else ""
                    }
                    <li id="best-signal-type"></li>
                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            const buyAccuracy = {stats.get('buy_accuracy', 0)};
                            const sellAccuracy = {stats.get('sell_accuracy', 0)};
                            const holdAccuracy = {stats.get('hold_accuracy', 0)};
                            
                            let bestSignal = "";
                            if (buyAccuracy > sellAccuracy && buyAccuracy > holdAccuracy) {{
                                bestSignal = "BUY";
                            }} else if (sellAccuracy > buyAccuracy && sellAccuracy > holdAccuracy) {{
                                bestSignal = "SELL";
                            }} else {{
                                bestSignal = "HOLD";
                            }}
                            
                            document.getElementById('best-signal-type').textContent = 
                                `The model performs particularly well on ${bestSignal} signals, which could be leveraged in the trading strategy.`;
                        });
                    </script>
                    <li>Regular revalidation should be performed as market conditions change to ensure continued model effectiveness.</li>
                </ul>
            </p>
            
            <div class="footer">
                <p>Generated by Historical Prediction Validator | Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Save the HTML file
    html_path = os.path.join(output_dir, 'validation_report.html')
    with open(html_path, 'w') as f:
        f.write(html_content)
    
    print(f"Saved comprehensive HTML report to: {html_path}")

def main():
    """Main function to run the validation report analysis"""
    parser = argparse.ArgumentParser(description='Analyze ML prediction validation report')
    parser.add_argument('--report', type=str, required=True,
                        help='Path to the validation report CSV file')
    parser.add_argument('--output', type=str, default=None,
                        help='Output directory for charts and analysis (default: same directory as report)')
    
    args = parser.parse_args()
    
    # Load the report
    df = load_report(args.report)
    if df.empty:
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
    
    # Create visualizations
    print("\nGenerating charts...")
    plot_prediction_accuracy(df, output_dir)
    plot_cumulative_accuracy(df, output_dir)
    plot_confidence_vs_accuracy(df, output_dir)
    plot_indicators_vs_predictions(df, output_dir)
    
    # Create HTML report
    print("\nGenerating HTML report...")
    create_html_report(df, stats, output_dir)
    
    print("\nAnalysis complete!")
    print(f"Summary statistics:")
    print(f"- Total predictions: {stats.get('total_predictions', 0)}")
    print(f"- Overall accuracy: {stats.get('accuracy', 0):.2f}%")
    print(f"- BUY signals: {stats.get('buy_predictions', 0)} predictions, {stats.get('buy_accuracy', 0):.2f}% accuracy")
    print(f"- SELL signals: {stats.get('sell_predictions', 0)} predictions, {stats.get('sell_accuracy', 0):.2f}% accuracy")
    print(f"- HOLD signals: {stats.get('hold_predictions', 0)} predictions, {stats.get('hold_accuracy', 0):.2f}% accuracy")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())