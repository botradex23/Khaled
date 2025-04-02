/**
 * RiskSettingsService.ts
 * 
 * Service for managing user-specific risk settings
 * Provides access to stop-loss, take-profit, and position sizing parameters
 */

import { 
  RiskSettings, 
  InsertRiskSettings,
  riskSettings
} from '@shared/schema';
import { storage } from '../../storage';
import { EventEmitter } from 'events';

// Helper function to ensure all required fields are present
// This addresses TypeScript errors when some fields might be undefined
const ensureAllRequiredFields = (settings: InsertRiskSettings): InsertRiskSettings => {
  return {
    userId: settings.userId,
    globalStopLoss: settings.globalStopLoss || '2.0',
    globalTakeProfit: settings.globalTakeProfit || '4.0',
    maxPositionSize: settings.maxPositionSize || '10.0',
    maxPortfolioRisk: settings.maxPortfolioRisk || '20.0',
    maxTradesPerDay: settings.maxTradesPerDay ?? 10,
    enableGlobalStopLoss: settings.enableGlobalStopLoss ?? true,
    enableGlobalTakeProfit: settings.enableGlobalTakeProfit ?? true,
    enableMaxPositionSize: settings.enableMaxPositionSize ?? true,
    stopLossStrategy: settings.stopLossStrategy || 'fixed',
    enableEmergencyStopLoss: settings.enableEmergencyStopLoss ?? true,
    emergencyStopLossThreshold: settings.emergencyStopLossThreshold || '15.0',
    defaultStopLossPercent: settings.defaultStopLossPercent || '2.0',
    defaultTakeProfitPercent: settings.defaultTakeProfitPercent || '4.0',
  };
};

// Define risk profiles inline instead of importing from a separate file
export interface RiskProfile {
  name: string;
  description: string;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositionSize: number;
  maxPortfolioRisk: number;
}

export const riskProfiles: Record<string, RiskProfile> = {
  conservative: {
    name: 'Conservative',
    description: 'Lower risk with modest profit targets. Focuses on capital preservation with tighter stop losses and smaller position sizes.',
    stopLossPercent: 1.5,
    takeProfitPercent: 3.0,
    maxPositionSize: 5.0,
    maxPortfolioRisk: 10.0
  },
  
  balanced: {
    name: 'Balanced',
    description: 'Moderate risk with balanced profit targets. A middle-ground approach suitable for most traders.',
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0,
    maxPositionSize: 10.0,
    maxPortfolioRisk: 20.0
  },
  
  aggressive: {
    name: 'Aggressive',
    description: 'Higher risk with larger profit targets. Allows for wider stop losses and larger position sizes for experienced traders.',
    stopLossPercent: 4.0,
    takeProfitPercent: 8.0,
    maxPositionSize: 15.0,
    maxPortfolioRisk: 30.0
  },
  
  dayTrader: {
    name: 'Day Trader',
    description: 'Optimized for short-term trading with tight stop losses and quick profit targets.',
    stopLossPercent: 1.0,
    takeProfitPercent: 2.0,
    maxPositionSize: 8.0,
    maxPortfolioRisk: 25.0
  },
  
  swingTrader: {
    name: 'Swing Trader',
    description: 'Designed for multi-day positions with wider stop losses to accommodate market fluctuations.',
    stopLossPercent: 3.0,
    takeProfitPercent: 7.0,
    maxPositionSize: 12.0,
    maxPortfolioRisk: 25.0
  }
};

interface RiskSettingsCache {
  [userId: number]: RiskSettings;
}

class RiskSettingsService extends EventEmitter {
  private static instance: RiskSettingsService;
  private settingsCache: RiskSettingsCache = {};
  
  // Default risk parameters (if user settings don't exist)
  private readonly DEFAULT_STOP_LOSS_PERCENT = 2.0;
  private readonly DEFAULT_TAKE_PROFIT_PERCENT = 4.0;
  private readonly DEFAULT_MAX_POSITION_SIZE_PERCENT = 10.0;
  private readonly DEFAULT_MAX_PORTFOLIO_RISK = 20.0;
  private readonly DEFAULT_RISK_MODE = 'balanced';
  
  private constructor() {
    super();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): RiskSettingsService {
    if (!RiskSettingsService.instance) {
      RiskSettingsService.instance = new RiskSettingsService();
    }
    return RiskSettingsService.instance;
  }
  
  /**
   * Get a user's risk settings with defaults if not found
   * @param userId User ID to get settings for
   * @returns Risk settings object with defaults applied if needed
   */
  public async getUserRiskSettings(userId: number): Promise<RiskSettings> {
    // Check cache first
    if (this.settingsCache[userId]) {
      return this.settingsCache[userId];
    }
    
    try {
      // First check the database for existing settings
      const settings = await this.getUserRiskSettingsFromDB(userId);
      
      if (settings) {
        // Cache the settings
        this.settingsCache[userId] = settings;
        return settings;
      }
      
      // If no settings found, create default ones
      const defaultSettings = await this.createDefaultRiskSettings(userId);
      this.settingsCache[userId] = defaultSettings;
      
      return defaultSettings;
    } catch (error) {
      console.error(`Error getting user risk settings for user ${userId}:`, error);
      
      // Return default settings object that's not persisted
      // Convert numeric values to strings for proper typing
      return {
        id: 0,
        userId,
        globalStopLoss: this.DEFAULT_STOP_LOSS_PERCENT.toString(),
        globalTakeProfit: this.DEFAULT_TAKE_PROFIT_PERCENT.toString(),
        maxPositionSize: this.DEFAULT_MAX_POSITION_SIZE_PERCENT.toString(),
        maxPortfolioRisk: this.DEFAULT_MAX_PORTFOLIO_RISK.toString(),
        maxTradesPerDay: 10,
        enableGlobalStopLoss: true,
        enableGlobalTakeProfit: true,
        enableMaxPositionSize: true,
        stopLossStrategy: 'fixed',
        enableEmergencyStopLoss: true,
        emergencyStopLossThreshold: '15.0', 
        defaultStopLossPercent: this.DEFAULT_STOP_LOSS_PERCENT.toString(),
        defaultTakeProfitPercent: this.DEFAULT_TAKE_PROFIT_PERCENT.toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
  
  /**
   * Retrieve user risk settings from the database
   */
  private async getUserRiskSettingsFromDB(userId: number): Promise<RiskSettings | null> {
    try {
      // Query the database for the user's risk settings using storage
      const settings = await storage.getRiskSettingsByUserId(userId);
      
      if (!settings) {
        console.log(`No risk settings found for user ${userId}, will create defaults`);
        return null;
      }
      
      console.log(`Retrieved risk settings for user ${userId}: ID ${settings.id}`);
      return settings;
    } catch (error) {
      console.error(`Error retrieving risk settings for user ${userId} from DB:`, error);
      return null;
    }
  }
  
  /**
   * Create default risk settings for a user
   */
  private async createDefaultRiskSettings(userId: number): Promise<RiskSettings> {
    try {
      // Create base settings with required userId
      const baseSettings: InsertRiskSettings = {
        userId,
        globalStopLoss: this.DEFAULT_STOP_LOSS_PERCENT.toString(),
        globalTakeProfit: this.DEFAULT_TAKE_PROFIT_PERCENT.toString(),
        maxPositionSize: this.DEFAULT_MAX_POSITION_SIZE_PERCENT.toString(),
        maxPortfolioRisk: this.DEFAULT_MAX_PORTFOLIO_RISK.toString(),
        maxTradesPerDay: 10,
        enableGlobalStopLoss: true,
        enableGlobalTakeProfit: true,
        enableMaxPositionSize: true,
        stopLossStrategy: 'fixed',
        enableEmergencyStopLoss: true,
        emergencyStopLossThreshold: '15.0',
        defaultStopLossPercent: this.DEFAULT_STOP_LOSS_PERCENT.toString(),
        defaultTakeProfitPercent: this.DEFAULT_TAKE_PROFIT_PERCENT.toString(),
      };
      
      // Use helper function to ensure all fields are defined
      const defaultSettings = ensureAllRequiredFields(baseSettings);
      
      // Create settings in storage
      const createdSettings = await storage.createRiskSettings(defaultSettings);
      
      if (!createdSettings) {
        throw new Error(`Failed to create default risk settings for user ${userId}`);
      }
      
      console.log(`Created default risk settings for user ${userId}: ID ${createdSettings.id}`);
      return createdSettings;
    } catch (error) {
      console.error(`Error creating default risk settings for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a user's risk settings
   */
  public async updateRiskSettings(userId: number, settings: Partial<RiskSettings>): Promise<RiskSettings> {
    try {
      // Get current settings
      const currentSettings = await this.getUserRiskSettings(userId);
      
      // Merge with updates
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updatedAt: new Date()
      };
      
      // Save to database
      const result = await storage.updateRiskSettings(currentSettings.id, settings);
      
      if (!result) {
        throw new Error(`Failed to update risk settings for user ${userId}`);
      }
      
      // Update cache
      this.settingsCache[userId] = result;
      
      console.log(`Updated risk settings for user ${userId}: ID ${currentSettings.id}`);
      
      // Emit update event
      this.emit('settingsUpdated', { userId, settings: result });
      
      return result;
    } catch (error) {
      console.error(`Error updating risk settings for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Apply a predefined risk profile to a user
   */
  public async applyRiskProfile(userId: number, profileName: string): Promise<RiskSettings> {
    try {
      const profile = riskProfiles[profileName];
      
      if (!profile) {
        throw new Error(`Risk profile '${profileName}' not found`);
      }
      
      // Get current settings
      const currentSettings = await this.getUserRiskSettings(userId);
      
      // Create profile settings updates (convert numbers to strings for proper typing)
      const profileUpdates: Partial<RiskSettings> = {
        globalStopLoss: profile.stopLossPercent.toString(),
        globalTakeProfit: profile.takeProfitPercent.toString(),
        defaultStopLossPercent: profile.stopLossPercent.toString(),
        defaultTakeProfitPercent: profile.takeProfitPercent.toString(),
        maxPositionSize: profile.maxPositionSize.toString(),
        maxPortfolioRisk: profile.maxPortfolioRisk.toString(),
      };
      
      // Save to database using the existing updateRiskSettings method
      const result = await this.updateRiskSettings(userId, profileUpdates);
      
      if (!result) {
        throw new Error(`Failed to apply risk profile '${profileName}' for user ${userId}`);
      }
      
      console.log(`Applied ${profileName} risk profile for user ${userId}: ID ${currentSettings.id}`);
      
      // Emit profile applied event
      this.emit('profileApplied', { userId, profileName, settings: result });
      
      return result;
    } catch (error) {
      console.error(`Error applying risk profile '${profileName}' for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Clear cache for a specific user or all users
   */
  public clearCache(userId?: number): void {
    if (userId) {
      delete this.settingsCache[userId];
    } else {
      this.settingsCache = {};
    }
  }
}

const riskSettingsService = RiskSettingsService.getInstance();
export default riskSettingsService;