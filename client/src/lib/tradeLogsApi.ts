/**
 * Trade Logs API client
 * 
 * This module provides a direct way to interact with the trade logs API
 * by ensuring requests go to the correct port for the Express server
 */

const API_BASE_URL = 'http://localhost:5000/api/trade-logs';

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

export interface TradeLog extends CreateTradeLogPayload {
  id: number;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new trade log
 */
export async function createTradeLog(payload: CreateTradeLogPayload): Promise<TradeLog> {
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
}

/**
 * Get trade logs by symbol
 */
export async function getTradeLogsBySymbol(symbol: string, limit = 100): Promise<TradeLog[]> {
  const response = await fetch(`${API_BASE_URL}/symbol/${symbol}?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to get trade logs: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Get trade logs by source
 */
export async function getTradeLogsBySource(source: string, limit = 100): Promise<TradeLog[]> {
  const response = await fetch(`${API_BASE_URL}/source/${source}?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to get trade logs: ${error.error || response.statusText}`);
  }

  return response.json();
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
}

/**
 * Get a specific trade log by ID
 */
export async function getTradeLog(id: number): Promise<TradeLog> {
  const response = await fetch(`${API_BASE_URL}/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to get trade log: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Update a trade log
 */
export async function updateTradeLog(id: number, updates: Partial<CreateTradeLogPayload>): Promise<TradeLog> {
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
}