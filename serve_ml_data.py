#!/usr/bin/env python3
"""
ML Data Download Server

This script serves the ML data files via a simple HTTP server.
"""

import os
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs

# HTML template for the download page
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tradeliy ML Data Download</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f7f9fc;
        }
        
        h1, h2, h3 {
            color: #0066cc;
        }
        
        h1 {
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .data-card {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            background-color: #f9f9f9;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .data-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
        }
        
        .data-card h3 {
            margin-top: 0;
            color: #333;
        }
        
        .data-card p {
            color: #666;
            font-size: 0.9em;
        }
        
        .download-btn {
            display: inline-block;
            background-color: #0066cc;
            color: white;
            padding: 8px 15px;
            border-radius: 4px;
            text-decoration: none;
            margin-top: 10px;
            transition: background-color 0.2s;
        }
        
        .download-btn:hover {
            background-color: #0052a3;
        }
        
        .all-files-btn {
            display: block;
            background-color: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            text-decoration: none;
            text-align: center;
            margin: 30px auto;
            max-width: 300px;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        
        .all-files-btn:hover {
            background-color: #218838;
        }
        
        .data-info {
            background-color: #e9f7fe;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 20px 0;
        }
        
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        table, th, td {
            border: 1px solid #ddd;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
        }
        
        th {
            background-color: #f2f2f2;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        code {
            background-color: #f1f1f1;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: Consolas, Monaco, 'Andale Mono', monospace;
            font-size: 0.9em;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>Tradeliy ML Data Download Center</h1>
    
    <div class="container">
        <h2>Download ML Training and Testing Data</h2>
        <p>This page provides access to the machine learning datasets used in the Tradeliy trading platform. These files contain the training and testing datasets for the XGBoost prediction models.</p>
        
        <div class="data-info">
            <strong>Note:</strong> These files contain real training and validation data used by the production ML models. They are provided for offline analysis and model improvement purposes.
        </div>
        
        <a href="/ml_data_files.zip" class="all-files-btn">Download Complete Dataset (ZIP)</a>
        
        <h3>Individual Files</h3>
        <div class="data-grid">
            <div class="data-card">
                <h3>Training Features</h3>
                <p>Contains all the feature vectors used for training the model, including technical indicators and price data.</p>
                <p><strong>File:</strong> X_train_btcusdt.csv</p>
                <a href="/ml_extract/X_train_btcusdt.csv" class="download-btn">Download</a>
            </div>
            
            <div class="data-card">
                <h3>Training Labels</h3>
                <p>Contains the target labels (0=BUY, 1=HOLD, 2=SELL) for the training dataset.</p>
                <p><strong>File:</strong> y_train_btcusdt.csv</p>
                <a href="/ml_extract/y_train_btcusdt.csv" class="download-btn">Download</a>
            </div>
            
            <div class="data-card">
                <h3>Testing Features</h3>
                <p>Contains all the feature vectors used for testing and validating the model.</p>
                <p><strong>File:</strong> X_test_btcusdt.csv</p>
                <a href="/ml_extract/X_test_btcusdt.csv" class="download-btn">Download</a>
            </div>
            
            <div class="data-card">
                <h3>Testing Labels</h3>
                <p>Contains the target labels for the testing dataset.</p>
                <p><strong>File:</strong> y_test_btcusdt.csv</p>
                <a href="/ml_extract/y_test_btcusdt.csv" class="download-btn">Download</a>
            </div>
            
            <div class="data-card">
                <h3>Model Validation Results</h3>
                <p>Contains the predictions, actual results, and accuracy metrics for the balanced model.</p>
                <p><strong>File:</strong> prediction_validation_btcusdt_1h_balanced.csv</p>
                <a href="/ml_extract/prediction_validation_btcusdt_1h_balanced.csv" class="download-btn">Download</a>
            </div>
        </div>
    </div>
    
    <div class="container">
        <h2>Dataset Information</h2>
        
        <h3>Data Structure</h3>
        <p>The dataset contains the following types of features:</p>
        <ul>
            <li>Price data: open, high, low, close, volume</li>
            <li>Technical indicators: SMA (5,10,20,50,100), EMA (5,10,20,50,100)</li>
            <li>Momentum indicators: RSI, MACD, ROC</li>
            <li>Volatility indicators: Bollinger Bands, ATR</li>
            <li>Other: Stochastic oscillator, future_price, price_change_pct</li>
        </ul>
        
        <h3>Target Values</h3>
        <p>The target values use the following class mapping:</p>
        <table>
            <tr>
                <th>Class</th>
                <th>Meaning</th>
                <th>Count in Training Data</th>
                <th>Percentage</th>
            </tr>
            <tr>
                <td>0</td>
                <td>BUY</td>
                <td>1</td>
                <td>0.07%</td>
            </tr>
            <tr>
                <td>1</td>
                <td>HOLD</td>
                <td>1,506</td>
                <td>99.47%</td>
            </tr>
            <tr>
                <td>2</td>
                <td>SELL</td>
                <td>7</td>
                <td>0.46%</td>
            </tr>
        </table>
        
        <div class="warning">
            <strong>Class Imbalance Warning:</strong> As shown in the table above, there is a severe class imbalance in the training data. The current model addresses this using SMOTE oversampling and class weighting.
        </div>
    </div>
    
    <div class="footer">
        <p>Tradeliy ML Data Download Center | Data extracted from the production ML pipeline</p>
    </div>
</body>
</html>
"""

class MLDataHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler for serving ML data files"""
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        if path == '/' or path == '':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode())
            return
        
        # Handle file downloads
        file_path = path[1:]  # Remove leading slash
        
        if not os.path.exists(file_path):
            self.send_error(404, f"File not found: {file_path}")
            return
        
        # Get file size and MIME type
        file_size = os.path.getsize(file_path)
        
        # Determine content type
        content_type = "application/octet-stream"
        if file_path.endswith('.csv'):
            content_type = "text/csv"
        elif file_path.endswith('.zip'):
            content_type = "application/zip"
        
        # Send headers
        self.send_response(200)
        self.send_header('Content-type', content_type)
        self.send_header('Content-length', file_size)
        
        # For file downloads, add Content-Disposition header
        filename = os.path.basename(file_path)
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        
        self.end_headers()
        
        # Send file content
        with open(file_path, 'rb') as file:
            self.wfile.write(file.read())


def run_server(port=3500):
    """Run the HTTP server"""
    handler = MLDataHandler
    
    with socketserver.TCPServer(("0.0.0.0", port), handler) as httpd:
        print(f"ML Data Download Server started at http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    run_server()