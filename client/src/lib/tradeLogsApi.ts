/**
 * Trade Logs API client
 * 
 * This module provides a direct way to interact with the trade logs API
 * even in development mode where Vite might intercept API requests
 */

// Instead of making direct fetch requests to API endpoints,
// we'll use a special approach to bypass Vite's middleware interception
import { storage } from '../../../server/storage';

// We'll provide both direct storage access and fetch-based API access
// Direct access works in development when importing from client code
// Fetch-based access is for production or when direct import isn't possible

// For production/deployment, get the base URL from the current window location
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/trade-logs`;
  }
  // Fallback for server-side or testing contexts
  return 'https://19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev/api/trade-logs';
};

const API_BASE_URL = getBaseUrl();

/**
 * Helper function to safely convert Date or null to string
 */
const formatDate = (date: any): string => {
  if (date instanceof Date) {
    return date.toISOString();
  } else if (!date) { // Handles null, undefined, and empty string
    return new Date().toISOString(); // Default to current time
  } else {
    return String(date); // Convert to string (even if already a string)
  }
};

export interface CreateTradeLogPayload {
  symbol: string;
  action: string;
  entry_price: string;
  quantity: string;
  trade_source: string;
  predicted_confidence?: string | null;
  status?: string;
  reason?: string | null;
  user_id?: number;
  position_id?: number;
  trade_id?: string;
}

export interface TradeLog {
  id: number;
  timestamp: string;
  symbol: string;
  action: string;
  entry_price: string;
  quantity: string;
  predicted_confidence: string | null;
  trade_source: string;
  status: string;
  reason: string | null;
  user_id?: number | null;
  position_id?: number | null;
  trade_id?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new trade log
 * This uses direct storage access in development and API fetch in production
 */
export async function createTradeLog(payload: CreateTradeLogPayload): Promise<TradeLog> {
  // For development mode, use direct storage access
  if (process.env.NODE_ENV === 'development') {
    try {
      // Set default values if not provided
      const data = {
        ...payload,
        status: payload.status || 'EXECUTED',
      };
      
      const result = await storage.createTradeLog(data);
      
      // Convert any Date objects to strings for compatibility with TradeLog interface
      
      return {
        ...result,
        timestamp: formatDate(result.timestamp),
        created_at: formatDate(result.created_at),
        updated_at: formatDate(result.updated_at || result.created_at), // Fallback to created_at if updated_at is missing
      };
    } catch (error) {
      console.error('Error creating trade log via direct storage:', error);
      throw new Error(`Failed to create trade log: ${(error as Error).message}`);
    }
  }
  
  // For production, use the API endpoint
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to create trade log: ${error.error || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error creating trade log via API:', error);
    throw error;
  }
}

/**
 * Get trade logs by symbol
 * This uses direct storage access in development and API fetch in production
 */
export async function getTradeLogsBySymbol(symbol: string, limit = 100): Promise<TradeLog[]> {
  // For development mode, use direct storage access
  if (process.env.NODE_ENV === 'development') {
    try {
      const logs = await storage.getTradeLogsBySymbol(symbol, limit);
      
      // Format dates for all logs
      return logs.map(log => ({
        ...log,
        timestamp: formatDate(log.timestamp),
        created_at: formatDate(log.created_at),
        updated_at: formatDate(log.updated_at || log.created_at),
      })) as TradeLog[];
    } catch (error) {
      console.error('Error getting trade logs via direct storage:', error);
      throw new Error(`Failed to get trade logs: ${(error as Error).message}`);
    }
  }
  
  // For production, use the API endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/symbol/${symbol}?limit=${limit}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get trade logs: ${error.error || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting trade logs via API:', error);
    throw error;
  }
}

/**
 * Get trade logs by source
 * This uses direct storage access in development and API fetch in production
 */
export async function getTradeLogsBySource(source: string, limit = 100): Promise<TradeLog[]> {
  // For development mode, use direct storage access
  if (process.env.NODE_ENV === 'development') {
    try {
      const logs = await storage.getTradeLogsBySource(source, limit);
      
      // Format dates for all logs
      return logs.map(log => ({
        ...log,
        timestamp: formatDate(log.timestamp),
        created_at: formatDate(log.created_at),
        updated_at: formatDate(log.updated_at || log.created_at),
      })) as TradeLog[];
    } catch (error) {
      console.error('Error getting trade logs via direct storage:', error);
      throw new Error(`Failed to get trade logs: ${(error as Error).message}`);
    }
  }
  
  // For production, use the API endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/source/${source}?limit=${limit}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get trade logs: ${error.error || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting trade logs via API:', error);
    throw error;
  }
}

/**
 * Search trade logs with filtering
 */
export interface TradeLogFilter {
  symbol?: string;
  action?: string;
  source?: string;
  status?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  onlyMine?: boolean;
  limit?: number;
}

export async function searchTradeLogs(filter: TradeLogFilter): Promise<TradeLog[]> {
  // For development mode, use direct storage access
  if (process.env.NODE_ENV === 'development') {
    try {
      // Convert filter to storage filter format
      const storageFilter: {
        symbol?: string;
        action?: string;
        source?: string;
        status?: string;
        fromDate?: Date;
        toDate?: Date;
        userId?: number;
      } = {};
      
      if (filter.symbol) storageFilter.symbol = filter.symbol;
      if (filter.action) storageFilter.action = filter.action;
      if (filter.source) storageFilter.source = filter.source;
      if (filter.status) storageFilter.status = filter.status;
      
      // Convert string dates to Date objects
      if (filter.fromDate) {
        storageFilter.fromDate = filter.fromDate instanceof Date 
          ? filter.fromDate 
          : new Date(filter.fromDate);
      }
      
      if (filter.toDate) {
        storageFilter.toDate = filter.toDate instanceof Date 
          ? filter.toDate 
          : new Date(filter.toDate);
      }
      
      const limit = filter.limit || 100;
      
      const logs = await storage.searchTradeLogs(storageFilter, limit);
      
      // Format dates for all logs
      return logs.map(log => ({
        ...log,
        timestamp: formatDate(log.timestamp),
        created_at: formatDate(log.created_at),
        updated_at: formatDate(log.updated_at || log.created_at),
      })) as TradeLog[];
    } catch (error) {
      console.error('Error searching trade logs via direct storage:', error);
      throw new Error(`Failed to search trade logs: ${(error as Error).message}`);
    }
  }
  
  // For production, use the API endpoint
  try {
    const searchParams = new URLSearchParams();
    
    if (filter.symbol) searchParams.append('symbol', filter.symbol);
    if (filter.action) searchParams.append('action', filter.action);
    if (filter.source) searchParams.append('source', filter.source);
    if (filter.status) searchParams.append('status', filter.status);
    if (filter.fromDate) searchParams.append('fromDate', filter.fromDate.toString());
    if (filter.toDate) searchParams.append('toDate', filter.toDate.toString());
    if (filter.onlyMine) searchParams.append('onlyMine', 'true');
    if (filter.limit) searchParams.append('limit', filter.limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/search?${searchParams.toString()}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to search trade logs: ${error.error || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error searching trade logs via API:', error);
    throw error;
  }
}

/**
 * Get a specific trade log by ID
 * This uses direct storage access in development and API fetch in production
 */
export async function getTradeLog(id: number): Promise<TradeLog> {
  // For development mode, use direct storage access
  if (process.env.NODE_ENV === 'development') {
    try {
      const log = await storage.getTradeLog(id);
      
      if (!log) {
        throw new Error(`Trade log with ID ${id} not found`);
      }
      
      return {
        ...log,
        timestamp: formatDate(log.timestamp),
        created_at: formatDate(log.created_at),
        updated_at: formatDate(log.updated_at || log.created_at),
      };
    } catch (error) {
      console.error('Error getting trade log via direct storage:', error);
      throw new Error(`Failed to get trade log: ${(error as Error).message}`);
    }
  }
  
  // For production, use the API endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get trade log: ${error.error || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting trade log via API:', error);
    throw error;
  }
}

/**
 * Update a trade log
 * This uses direct storage access in development and API fetch in production
 */
export async function updateTradeLog(id: number, updates: Partial<CreateTradeLogPayload>): Promise<TradeLog> {
  // For development mode, use direct storage access
  if (process.env.NODE_ENV === 'development') {
    try {
      const updatedLog = await storage.updateTradeLog(id, updates);
      
      if (!updatedLog) {
        throw new Error(`Trade log with ID ${id} not found`);
      }
      
      return {
        ...updatedLog,
        timestamp: formatDate(updatedLog.timestamp),
        created_at: formatDate(updatedLog.created_at),
        updated_at: formatDate(updatedLog.updated_at || updatedLog.created_at),
      };
    } catch (error) {
      console.error('Error updating trade log via direct storage:', error);
      throw new Error(`Failed to update trade log: ${(error as Error).message}`);
    }
  }
  
  // For production, use the API endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to update trade log: ${error.error || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error updating trade log via API:', error);
    throw error;
  }
}