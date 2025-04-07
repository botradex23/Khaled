/**
 * Multi-Broker System Entry Point
 * 
 * This file exports the broker interfaces, factory, and service
 * for use throughout the application.
 */

// Export interfaces
export * from './interfaces';

// Export factory
export { BrokerFactory } from './brokerFactory';

// Export service
export { MultiBrokerService } from './multiBrokerService';

// Create and export singleton instance of broker service
import { BrokerType, IMultiBrokerService } from './interfaces';
import { MultiBrokerService } from './multiBrokerService';

// Create service instance with Binance as primary and OKX as fallback
const brokerService = new MultiBrokerService(BrokerType.BINANCE, BrokerType.OKX);

// Export singleton instance
export { brokerService };