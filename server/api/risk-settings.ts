import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { riskSettings } from '@shared/schema';
import { defaultRiskSettings } from '@shared/risk-settings';

// Simple middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

const router = Router();

// Get user's risk settings
router.get('/api/v1/user/risk-settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Try to get the user's risk settings
    const userRiskSettings = await db.query.riskSettings.findFirst({
      where: eq(riskSettings.userId, userId),
    });

    // If no settings exist, return default settings
    if (!userRiskSettings) {
      return res.status(200).json({
        ...defaultRiskSettings,
        userId,
      });
    }

    // Convert decimal/numeric values to numbers for frontend consumption
    const formattedSettings = {
      ...userRiskSettings,
      globalStopLoss: Number(userRiskSettings.globalStopLoss),
      globalTakeProfit: Number(userRiskSettings.globalTakeProfit),
      maxPositionSize: Number(userRiskSettings.maxPositionSize),
      maxPortfolioRisk: Number(userRiskSettings.maxPortfolioRisk),
      emergencyStopLossThreshold: Number(userRiskSettings.emergencyStopLossThreshold),
      defaultStopLossPercent: Number(userRiskSettings.defaultStopLossPercent),
      defaultTakeProfitPercent: Number(userRiskSettings.defaultTakeProfitPercent),
    };

    return res.status(200).json(formattedSettings);
  } catch (error) {
    console.error('Error getting risk settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve risk settings' });
  }
});

// Save user's risk settings
router.post('/api/v1/user/risk-settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      globalStopLoss,
      globalTakeProfit,
      maxPositionSize,
      maxPortfolioRisk,
      maxTradesPerDay,
      enableGlobalStopLoss,
      enableGlobalTakeProfit,
      enableMaxPositionSize,
      stopLossStrategy,
      enableEmergencyStopLoss,
      emergencyStopLossThreshold,
      defaultStopLossPercent,
      defaultTakeProfitPercent,
    } = req.body;

    // Validate that required fields are present
    if (
      globalStopLoss === undefined ||
      globalTakeProfit === undefined ||
      maxPositionSize === undefined ||
      maxPortfolioRisk === undefined ||
      maxTradesPerDay === undefined ||
      enableGlobalStopLoss === undefined ||
      enableGlobalTakeProfit === undefined ||
      enableMaxPositionSize === undefined ||
      stopLossStrategy === undefined ||
      enableEmergencyStopLoss === undefined ||
      emergencyStopLossThreshold === undefined ||
      defaultStopLossPercent === undefined ||
      defaultTakeProfitPercent === undefined
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already has risk settings
    const existingSettings = await db.query.riskSettings.findFirst({
      where: eq(riskSettings.userId, userId),
    });

    // Build the settings object
    const settingsData = {
      userId,
      globalStopLoss: String(globalStopLoss),
      globalTakeProfit: String(globalTakeProfit),
      maxPositionSize: String(maxPositionSize),
      maxPortfolioRisk: String(maxPortfolioRisk),
      maxTradesPerDay,
      enableGlobalStopLoss,
      enableGlobalTakeProfit,
      enableMaxPositionSize,
      stopLossStrategy,
      enableEmergencyStopLoss,
      emergencyStopLossThreshold: String(emergencyStopLossThreshold),
      defaultStopLossPercent: String(defaultStopLossPercent),
      defaultTakeProfitPercent: String(defaultTakeProfitPercent),
    };

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      updatedSettings = await db
        .update(riskSettings)
        .set({
          ...settingsData,
          updatedAt: new Date(),
        })
        .where(eq(riskSettings.userId, userId))
        .returning();
    } else {
      // Insert new settings
      updatedSettings = await db
        .insert(riskSettings)
        .values({
          ...settingsData,
        })
        .returning();
    }

    if (!updatedSettings || updatedSettings.length === 0) {
      return res.status(500).json({ error: 'Failed to save risk settings' });
    }

    // Format the response
    const formattedSettings = {
      ...updatedSettings[0],
      globalStopLoss: Number(updatedSettings[0].globalStopLoss),
      globalTakeProfit: Number(updatedSettings[0].globalTakeProfit),
      maxPositionSize: Number(updatedSettings[0].maxPositionSize),
      maxPortfolioRisk: Number(updatedSettings[0].maxPortfolioRisk),
      emergencyStopLossThreshold: Number(updatedSettings[0].emergencyStopLossThreshold),
      defaultStopLossPercent: Number(updatedSettings[0].defaultStopLossPercent),
      defaultTakeProfitPercent: Number(updatedSettings[0].defaultTakeProfitPercent),
    };

    return res.status(200).json(formattedSettings);
  } catch (error) {
    console.error('Error saving risk settings:', error);
    return res.status(500).json({ error: 'Failed to save risk settings' });
  }
});

export default router;