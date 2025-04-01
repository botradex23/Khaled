import { Router, Request, Response } from 'express';
import { logger } from '../logger';

// Create router
const router = Router();

// Define interfaces for portfolio data
interface PortfolioHistoryItem {
  date: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
}

interface AssetBalance {
  symbol: string;
  quantity: number;
  price: number;
  value: number;
  change24h?: number;
  changePercent24h?: number;
}

// Generate 30 days of portfolio history data
function generatePortfolioHistory(initialValue: number = 100000): PortfolioHistoryItem[] {
  const history: PortfolioHistoryItem[] = [];
  let currentValue = initialValue;
  
  // Generate 30 days of data, with the most recent day at the end
  for (let i = 30; i >= 1; i--) {
    // Calculate date (days ago)
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Generate random daily change (-5% to +5%)
    const changePercent = (Math.random() * 10) - 5;
    const change = currentValue * (changePercent / 100);
    
    // Calculate new value
    const newValue = currentValue + change;
    
    // Add to history
    history.push({
      date: dateStr,
      totalValue: newValue,
      dailyChange: change,
      dailyChangePercent: changePercent
    });
    
    // Update current value for next iteration
    currentValue = newValue;
  }
  
  return history;
}

// Create demo balances data
function generateDemoBalances(): AssetBalance[] {
  // Use the OKX demo data as a base to ensure consistent values with the rest of the app
  return [
    {
      symbol: "BTC",
      quantity: 1.4,
      price: 69000.5,
      value: 96600.7,
      change24h: 1500,
      changePercent24h: 2.2
    },
    {
      symbol: "ETH",
      quantity: 12,
      price: 1915.12,
      value: 22981.44,
      change24h: -50,
      changePercent24h: -2.54
    },
    {
      symbol: "USDT",
      quantity: 15000,
      price: 1,
      value: 15000,
      change24h: 0,
      changePercent24h: 0
    }
  ];
}

// Get portfolio history - Demo endpoint
router.get('/demo/history', (req: Request, res: Response) => {
  try {
    // Generate demo portfolio history
    const history = generatePortfolioHistory(134582.14); // Match total value from demo balances
    
    res.json(history);
  } catch (error) {
    logger.error('Error generating demo portfolio history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving portfolio history data' 
    });
  }
});

// Get portfolio history - Authenticated endpoint
router.get('/history', (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // In a real implementation, this would fetch data from a database
    // or calculate based on real transaction history
    // For now, we'll generate a random history
    const history = generatePortfolioHistory(134582.14);
    
    res.json(history);
  } catch (error) {
    logger.error('Error retrieving portfolio history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving portfolio history data' 
    });
  }
});

// Get current balances - Demo endpoint
router.get('/demo/balances', (req: Request, res: Response) => {
  try {
    // Generate demo balances
    const balances = generateDemoBalances();
    
    res.json(balances);
  } catch (error) {
    logger.error('Error generating demo balances:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving balance data' 
    });
  }
});

// Get current balances - Authenticated endpoint
router.get('/balances', (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // In a real implementation, this would fetch data from exchange APIs
    // based on the user's API keys
    // For now, we'll use the same demo data
    const balances = generateDemoBalances();
    
    res.json(balances);
  } catch (error) {
    logger.error('Error retrieving balances:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving balance data' 
    });
  }
});

export default router;