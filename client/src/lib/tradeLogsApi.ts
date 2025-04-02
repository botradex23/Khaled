/**
 * Trade Logs API client
 * 
 * This module provides a way to interact with the trade logs API
 * with special handling for development vs production environments
 */

// We'll use API access with special handling for development vs production environments
// In development, we need to work around Vite's middleware interception
// In production, standard API calls work as expected

// For production/deployment, get the base URL from the current window location
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In Replit environment, we need to use the /api prefix and let Express handle the routing
    // The special /api prefix is set up to bypass Vite's middleware in development
    
    // Always use the same origin to avoid CORS issues
    const origin = window.location.origin;
    
    // For all environments (dev and prod), use the standard API endpoint
    // This should work in Replit as the server should be configured to handle these endpoints
    return `${origin}/api/trade-logs`;
  }
  
  // Fallback for server-side or testing contexts
  return 'http://localhost:3000/api/trade-logs';
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
 * This uses an API approach that accommodates the Vite middleware in development
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

    // Check if the response is HTML instead of JSON (indicates Vite middleware interception)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates the Vite middleware intercepted the API request.');
      
      // If in development, suggest using port 5000 directly
      if (process.env.NODE_ENV === 'development') {
        const directUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000/api/trade-logs'
          : `${window.location.protocol}//${window.location.hostname}:5000/api/trade-logs`;
          
        throw new Error(`API endpoint returned HTML instead of JSON. Try accessing the API directly at ${directUrl}`);
      } else {
        throw new Error('API endpoint returned HTML instead of JSON. This is likely a server configuration issue.');
      }
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
 * This uses an API approach that accommodates the Vite middleware in development
 */
export async function getTradeLogsBySymbol(symbol: string, limit = 100): Promise<TradeLog[]> {
  try {
    console.log(`Using API endpoint to get trade logs by symbol: ${API_BASE_URL}/symbol/${symbol}`);
    const response = await fetch(`${API_BASE_URL}/symbol/${symbol}?limit=${limit}`);
    
    // Check if the response is HTML instead of JSON (indicates Vite middleware interception)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates the Vite middleware intercepted the API request.');
      
      // If in development, suggest using port 5000 directly
      if (process.env.NODE_ENV === 'development') {
        const directUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000/api/trade-logs'
          : `${window.location.protocol}//${window.location.hostname}:5000/api/trade-logs`;
          
        throw new Error(`API endpoint returned HTML instead of JSON. Try accessing the API directly at ${directUrl}`);
      } else {
        throw new Error('API endpoint returned HTML instead of JSON. This is likely a server configuration issue.');
      }
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
 * This uses an API approach that accommodates the Vite middleware in development
 */
export async function getTradeLogsBySource(source: string, limit = 100): Promise<TradeLog[]> {
  try {
    console.log(`Using API endpoint to get trade logs by source: ${API_BASE_URL}/source/${source}`);
    const response = await fetch(`${API_BASE_URL}/source/${source}?limit=${limit}`);
    
    // Check if the response is HTML instead of JSON (indicates Vite middleware interception)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates the Vite middleware intercepted the API request.');
      
      // If in development, suggest using port 5000 directly
      if (process.env.NODE_ENV === 'development') {
        const directUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000/api/trade-logs'
          : `${window.location.protocol}//${window.location.hostname}:5000/api/trade-logs`;
          
        throw new Error(`API endpoint returned HTML instead of JSON. Try accessing the API directly at ${directUrl}`);
      } else {
        throw new Error('API endpoint returned HTML instead of JSON. This is likely a server configuration issue.');
      }
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
    
    // Check if the response is HTML instead of JSON (indicates Vite middleware interception)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates the Vite middleware intercepted the API request.');
      
      // If in development, suggest using port 5000 directly
      if (process.env.NODE_ENV === 'development') {
        const directUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000/api/trade-logs'
          : `${window.location.protocol}//${window.location.hostname}:5000/api/trade-logs`;
          
        throw new Error(`API endpoint returned HTML instead of JSON. Try accessing the API directly at ${directUrl}`);
      } else {
        throw new Error('API endpoint returned HTML instead of JSON. This is likely a server configuration issue.');
      }
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
 * This uses an API approach that accommodates the Vite middleware in development
 */
export async function getTradeLog(id: number): Promise<TradeLog> {
  try {
    console.log(`Using API endpoint to get trade log by ID: ${API_BASE_URL}/${id}`);
    const response = await fetch(`${API_BASE_URL}/${id}`);
    
    // Check if the response is HTML instead of JSON (indicates Vite middleware interception)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates the Vite middleware intercepted the API request.');
      
      // If in development, suggest using port 5000 directly
      if (process.env.NODE_ENV === 'development') {
        const directUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000/api/trade-logs'
          : `${window.location.protocol}//${window.location.hostname}:5000/api/trade-logs`;
          
        throw new Error(`API endpoint returned HTML instead of JSON. Try accessing the API directly at ${directUrl}`);
      } else {
        throw new Error('API endpoint returned HTML instead of JSON. This is likely a server configuration issue.');
      }
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
 * This uses an API approach that accommodates the Vite middleware in development
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
    
    // Check if the response is HTML instead of JSON (indicates Vite middleware interception)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML response instead of JSON. This indicates the Vite middleware intercepted the API request.');
      
      // If in development, suggest using port 5000 directly
      if (process.env.NODE_ENV === 'development') {
        const directUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000/api/trade-logs'
          : `${window.location.protocol}//${window.location.hostname}:5000/api/trade-logs`;
          
        throw new Error(`API endpoint returned HTML instead of JSON. Try accessing the API directly at ${directUrl}`);
      } else {
        throw new Error('API endpoint returned HTML instead of JSON. This is likely a server configuration issue.');
      }
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