import { Request, Response } from 'express';
import { storage } from '../../storage';
import { TradeLog } from '@shared/schema';

export const getTradeLogsSummary = async (req: Request, res: Response) => {
  try {
    console.log('GET /api/trade-logs/summary endpoint hit');
    
    // Get all trade logs (we'll calculate statistics from them)
    const tradeLogs = await storage.getAllTradeLogs(1000); // Get up to 1000 logs to calculate stats
    
    // Initialize statistics
    const summary = {
      totalTrades: tradeLogs.length,
      executedTrades: 0,
      failedTrades: 0,
      pendingTrades: 0,
      canceledTrades: 0,
      rejectedTrades: 0,
      buyTrades: 0,
      sellTrades: 0,
      successRate: 0,
      symbolCounts: {} as Record<string, number>,
      sourceCounts: {} as Record<string, number>,
      statusCounts: {} as Record<string, number>,
      recentActivity: [] as TradeLog[], // Most recent 5 trades
    };
    
    // Calculate statistics
    tradeLogs.forEach(log => {
      // Count by status
      if (log.status.toUpperCase() === 'EXECUTED') {
        summary.executedTrades++;
      } else if (log.status.toUpperCase() === 'FAILED') {
        summary.failedTrades++;
      } else if (log.status.toUpperCase() === 'QUEUED' || log.status.toUpperCase() === 'PROCESSING') {
        summary.pendingTrades++;
      } else if (log.status.toUpperCase() === 'CANCELED') {
        summary.canceledTrades++;
      } else if (log.status.toUpperCase() === 'REJECTED') {
        summary.rejectedTrades++;
      }
      
      // Count by action
      if (log.action.toUpperCase() === 'BUY') {
        summary.buyTrades++;
      } else if (log.action.toUpperCase() === 'SELL') {
        summary.sellTrades++;
      }
      
      // Count by symbol
      if (!summary.symbolCounts[log.symbol]) {
        summary.symbolCounts[log.symbol] = 0;
      }
      summary.symbolCounts[log.symbol]++;
      
      // Count by source
      if (!summary.sourceCounts[log.trade_source]) {
        summary.sourceCounts[log.trade_source] = 0;
      }
      summary.sourceCounts[log.trade_source]++;
      
      // Count by status
      if (!summary.statusCounts[log.status]) {
        summary.statusCounts[log.status] = 0;
      }
      summary.statusCounts[log.status]++;
    });
    
    // Calculate success rate
    if (summary.totalTrades > 0) {
      summary.successRate = (summary.executedTrades / summary.totalTrades) * 100;
    }
    
    // Get recent activity (5 most recent trades)
    summary.recentActivity = tradeLogs
      .sort((a, b) => {
        // Safely handle different timestamp formats
        const getTimestamp = (item: any) => {
          if (!item || !item.timestamp) return 0;
          if (item.timestamp instanceof Date) return item.timestamp.getTime();
          try {
            return new Date(item.timestamp).getTime();
          } catch (e) {
            return 0;
          }
        };
        
        return getTimestamp(b) - getTimestamp(a);
      })
      .slice(0, 5);
    
    // Return the summary
    return res.json(summary);
  } catch (error) {
    console.error('Error generating trade logs summary:', error);
    return res.status(500).json({
      error: 'Failed to generate trade logs summary',
      details: String(error)
    });
  }
};