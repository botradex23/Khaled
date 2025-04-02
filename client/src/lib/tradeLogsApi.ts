/**
 * Trade Logs API client
 * 
 * This module provides a way to interact with the trade logs API
 * with handling for various environments
 */

// Determine which API endpoint to use
// During development, use the direct API to bypass Vite middleware issues
// In production, use the regular API endpoint
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || 
                       window.location.hostname.includes('replit.dev');

// Fallback to direct API if we're in development mode
const API_BASE_URL = IS_DEVELOPMENT 
  ? '/direct-api/trade-logs'  // Using our direct API that bypasses Vite middleware
  : '/api/trade-logs';        // Regular API path for production

console.log(`Using Trade Logs API endpoint: ${API_BASE_URL} (development mode: ${IS_DEVELOPMENT})`);

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
 */
export async function createTradeLog(payload: CreateTradeLogPayload): Promise<TradeLog> {
  try {
    // Ensure status is set if not provided
    const dataToSend = {
      ...payload,
      status: payload.status || 'EXECUTED',
    };
    
    console.log(`Using API endpoint for trade log creation: ${API_BASE_URL}`);
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    });

    // Check if the response is HTML instead of JSON (indicates routing issues)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates a routing issue with the API endpoint.');
      throw new Error('API endpoint returned HTML instead of JSON. The API server might not be properly configured.');
    }

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
 */
export async function getTradeLogsBySymbol(symbol: string, limit = 100): Promise<TradeLog[]> {
  try {
    console.log(`Using API endpoint to get trade logs by symbol: ${API_BASE_URL}/symbol/${symbol}`);
    const response = await fetch(`${API_BASE_URL}/symbol/${symbol}?limit=${limit}`);
    
    // Check if the response is HTML instead of JSON (indicates routing issues)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates a routing issue with the API endpoint.');
      throw new Error('API endpoint returned HTML instead of JSON. The API server might not be properly configured.');
    }

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
 */
export async function getTradeLogsBySource(source: string, limit = 100): Promise<TradeLog[]> {
  try {
    console.log(`Using API endpoint to get trade logs by source: ${API_BASE_URL}/source/${source}`);
    const response = await fetch(`${API_BASE_URL}/source/${source}?limit=${limit}`);
    
    // Check if the response is HTML instead of JSON (indicates routing issues)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates a routing issue with the API endpoint.');
      throw new Error('API endpoint returned HTML instead of JSON. The API server might not be properly configured.');
    }

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
  try {
    const searchParams = new URLSearchParams();
    
    if (filter.symbol) searchParams.append('symbol', filter.symbol);
    if (filter.action) searchParams.append('action', filter.action);
    if (filter.source) searchParams.append('source', filter.source);
    if (filter.status) searchParams.append('status', filter.status);
    
    // Handle date formatting
    if (filter.fromDate) {
      const formattedFromDate = filter.fromDate instanceof Date 
        ? filter.fromDate.toISOString() 
        : new Date(filter.fromDate).toISOString();
      searchParams.append('fromDate', formattedFromDate);
    }
    
    if (filter.toDate) {
      const formattedToDate = filter.toDate instanceof Date 
        ? filter.toDate.toISOString() 
        : new Date(filter.toDate).toISOString();
      searchParams.append('toDate', formattedToDate);
    }
    
    if (filter.onlyMine) searchParams.append('onlyMine', 'true');
    if (filter.limit) searchParams.append('limit', filter.limit.toString());
    
    console.log(`Using API endpoint to search trade logs: ${API_BASE_URL}/search`);
    const response = await fetch(`${API_BASE_URL}/search?${searchParams.toString()}`);
    
    // Check if the response is HTML instead of JSON (indicates routing issues)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates a routing issue with the API endpoint.');
      throw new Error('API endpoint returned HTML instead of JSON. The API server might not be properly configured.');
    }

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
 */
export async function getTradeLog(id: number): Promise<TradeLog> {
  try {
    console.log(`Using API endpoint to get trade log by ID: ${API_BASE_URL}/${id}`);
    const response = await fetch(`${API_BASE_URL}/${id}`);
    
    // Check if the response is HTML instead of JSON (indicates routing issues)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates a routing issue with the API endpoint.');
      throw new Error('API endpoint returned HTML instead of JSON. The API server might not be properly configured.');
    }

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
 */
export async function updateTradeLog(id: number, updates: Partial<CreateTradeLogPayload>): Promise<TradeLog> {
  try {
    console.log(`Using API endpoint to update trade log: ${API_BASE_URL}/${id}`);
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    // Check if the response is HTML instead of JSON (indicates routing issues)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates a routing issue with the API endpoint.');
      throw new Error('API endpoint returned HTML instead of JSON. The API server might not be properly configured.');
    }

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