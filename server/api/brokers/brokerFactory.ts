/**
 * Broker Factory
 * 
 * This factory creates instances of different brokers based on the specified type.
 * It encapsulates broker initialization logic and configuration.
 */

import { BrokerType, IBroker, IBrokerFactory } from './interfaces';
import { OkxBroker } from '../okx/okxBroker';
import { BinanceBroker } from '../binance/binanceBroker';
import { SimulatedBroker } from '../simulated/simulatedBroker';

/**
 * Broker Factory Implementation
 * Creates and configures broker instances based on the specified type
 */
export class BrokerFactory implements IBrokerFactory {
  // Cache for broker instances
  private brokers: Map<BrokerType, IBroker> = new Map();
  
  /**
   * Create a broker instance of the specified type
   * @param type The type of broker to create
   * @param config Optional configuration for the broker
   * @returns An instance of the requested broker
   */
  createBroker(type: BrokerType, config?: any): IBroker {
    // Check if broker is already cached
    if (this.brokers.has(type)) {
      return this.brokers.get(type)!;
    }
    
    let broker: IBroker;
    
    // Create appropriate broker based on type
    switch (type) {
      case BrokerType.BINANCE:
        broker = new BinanceBroker(config?.testnet || false);
        break;
        
      case BrokerType.OKX:
        broker = new OkxBroker(config?.testnet || false);
        break;
        
      case BrokerType.SIMULATED:
        broker = new SimulatedBroker();
        break;
        
      default:
        throw new Error(`Unknown broker type: ${type}`);
    }
    
    // Cache the broker instance
    this.brokers.set(type, broker);
    
    return broker;
  }
  
  /**
   * Get the default broker (Binance is the primary)
   * @returns The default broker instance
   */
  getDefaultBroker(): IBroker {
    return this.createBroker(BrokerType.BINANCE);
  }
}