/**
 * Main JavaScript for Crypto Trading Platform
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize app
  initApp();
});

// Initialize application
function initApp() {
  console.log('Crypto Trading Platform initialized');
  
  // Load market data if on homepage
  if (document.querySelector('.market-table')) {
    loadMarketData();
  }
  
  // Load prediction data if prediction section exists
  if (document.querySelector('.ml-predictions')) {
    loadPredictionData();
  }
  
  // Setup event listeners
  setupEventListeners();
}

// Setup event listeners for interactive elements
function setupEventListeners() {
  // Toggle mobile menu
  const menuButton = document.querySelector('.mobile-menu-button');
  if (menuButton) {
    menuButton.addEventListener('click', function() {
      const navMenu = document.querySelector('.nav-menu');
      navMenu.classList.toggle('active');
    });
  }
  
  // Close mobile menu when clicking on a nav link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      const navMenu = document.querySelector('.nav-menu');
      if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
      }
    });
  });
  
  // Symbol search input
  const symbolSearch = document.querySelector('#symbol-search');
  if (symbolSearch) {
    symbolSearch.addEventListener('input', function(e) {
      const value = e.target.value.toUpperCase();
      filterMarketTable(value);
    });
  }
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', function(e) {
    const navMenu = document.querySelector('.nav-menu');
    const menuButton = document.querySelector('.mobile-menu-button');
    
    if (navMenu && navMenu.classList.contains('active') && 
        !navMenu.contains(e.target) && 
        !menuButton.contains(e.target)) {
      navMenu.classList.remove('active');
    }
  });
}

// Load market data from API
async function loadMarketData() {
  const tableBody = document.querySelector('.market-table tbody');
  if (!tableBody) return;
  
  try {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading market data...</td></tr>';
    
    // Fetch top cryptocurrency data
    const response = await fetch('/api/tickers');
    if (!response.ok) throw new Error('Failed to fetch market data');
    
    const data = await response.json();
    
    // Take only top 10 cryptocurrencies by volume (simplified for demo)
    const topCoins = data.slice(0, 10);
    
    // Clear loading message
    tableBody.innerHTML = '';
    
    // Populate table with market data
    topCoins.forEach(coin => {
      const row = document.createElement('tr');
      
      // Generate random 24h change for demo
      const change24h = (Math.random() * 10 - 5).toFixed(2);
      const changeClass = change24h >= 0 ? 'price-up' : 'price-down';
      const changeSign = change24h >= 0 ? '+' : '';
      
      row.innerHTML = `
        <td>${coin.symbol}</td>
        <td>$${parseFloat(coin.price).toFixed(2)}</td>
        <td class="${changeClass}">${changeSign}${change24h}%</td>
        <td>$${(Math.random() * 10000000000).toFixed(0)}</td>
        <td>
          <button class="btn btn-sm" onclick="showCoinDetails('${coin.symbol}')">Details</button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading market data:', error);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500">Error loading market data: ${error.message}</td></tr>`;
  }
}

// Filter market table based on search input
function filterMarketTable(searchTerm) {
  const rows = document.querySelectorAll('.market-table tbody tr');
  
  rows.forEach(row => {
    const symbol = row.cells[0].textContent;
    if (symbol.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Load ML prediction data
async function loadPredictionData() {
  const predictionContainers = document.querySelectorAll('.prediction-container');
  if (predictionContainers.length === 0) return;
  
  // Default symbols to load predictions for
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  
  try {
    // Load predictions for each symbol
    for (const symbol of symbols) {
      const container = document.querySelector(`#prediction-${symbol.toLowerCase()}`);
      if (!container) continue;
      
      container.innerHTML = '<div class="loading-indicator"><span class="loading"></span> Loading prediction...</div>';
      
      // Fetch prediction data
      const response = await fetch(`/api/ml/predict/${symbol}`);
      if (!response.ok) throw new Error(`Failed to fetch prediction for ${symbol}`);
      
      const data = await response.json();
      
      // Format recommendation class
      let recommendationClass = 'hold';
      if (data.recommendation === 'BUY') recommendationClass = 'buy';
      if (data.recommendation === 'SELL') recommendationClass = 'sell';
      
      // Calculate predicted change
      const currentPrice = data.current_price;
      const predictedPrice = data.price_prediction_24h;
      const predictedChange = ((predictedPrice - currentPrice) / currentPrice * 100).toFixed(2);
      const changeSign = predictedChange >= 0 ? '+' : '';
      const changeClass = predictedChange >= 0 ? 'price-up' : 'price-down';
      
      // Update container with prediction data
      container.innerHTML = `
        <div class="prediction-card">
          <div class="prediction-header">
            <h3 class="prediction-title">Prediction for <span class="prediction-symbol">${symbol}</span></h3>
            <span class="recommendation ${recommendationClass.toLowerCase()}">${data.recommendation}</span>
          </div>
          
          <div class="prediction-details">
            <div class="prediction-item">
              <div class="prediction-label">Current Price</div>
              <div class="prediction-value">$${currentPrice.toFixed(2)}</div>
            </div>
            
            <div class="prediction-item">
              <div class="prediction-label">Predicted Price (24h)</div>
              <div class="prediction-value">$${predictedPrice.toFixed(2)}</div>
            </div>
            
            <div class="prediction-item">
              <div class="prediction-label">Predicted Change</div>
              <div class="prediction-value ${changeClass}">${changeSign}${predictedChange}%</div>
            </div>
            
            <div class="prediction-item">
              <div class="prediction-label">Confidence</div>
              <div class="prediction-value">${(data.confidence * 100).toFixed(1)}%</div>
            </div>
          </div>
          
          <div class="prediction-signals">
            <h4>Market Signals</h4>
            <div class="prediction-details">
              <div class="prediction-item">
                <div class="prediction-label">Trend</div>
                <div class="prediction-value">${data.signals.trend}</div>
              </div>
              
              <div class="prediction-item">
                <div class="prediction-label">Momentum</div>
                <div class="prediction-value">${data.signals.momentum.toFixed(2)}</div>
              </div>
              
              <div class="prediction-item">
                <div class="prediction-label">Volatility</div>
                <div class="prediction-value">${(data.signals.volatility * 100).toFixed(1)}%</div>
              </div>
              
              <div class="prediction-item">
                <div class="prediction-label">Volume</div>
                <div class="prediction-value">${data.signals.volume}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading prediction data:', error);
    predictionContainers.forEach(container => {
      container.innerHTML = `<div class="error-message">Error loading prediction: ${error.message}</div>`;
    });
  }
}

// Show coin details (placeholder function)
function showCoinDetails(symbol) {
  alert(`Showing details for ${symbol} - This feature is under development`);
}

// Format number as currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

// Format percentage
function formatPercentage(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}