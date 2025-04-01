/**
 * Authentication middleware for Express routes.
 * This file centralizes authentication logic used throughout the application.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware to ensure a user is authenticated before accessing a route.
 * If the user is not authenticated, responds with a 401 Unauthorized status.
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  
  // For API requests, return a JSON error
  res.status(401).json({ 
    message: "Authentication required",
    success: false,
    code: "AUTH_REQUIRED"
  });
}

/**
 * Middleware to ensure a user has valid API keys configured.
 * This is used for routes that require API key access.
 */
export async function ensureApiKeysConfigured(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || !req.user.id) {
    return res.status(401).json({ 
      message: "Authentication required",
      success: false,
      code: "AUTH_REQUIRED"
    });
  }
  
  try {
    const userId = req.user.id;
    const apiKeys = await storage.getUserApiKeys(userId);
    
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      return res.status(403).json({
        message: "API keys not configured",
        success: false,
        code: "API_KEYS_REQUIRED"
      });
    }
    
    // Add the API keys to the request for convenience
    req.apiKeys = apiKeys;
    
    next();
  } catch (error) {
    console.error("Error checking API keys:", error);
    res.status(500).json({
      message: "Error checking API keys configuration",
      success: false,
      code: "SERVER_ERROR"
    });
  }
}

/**
 * Middleware to ensure a user has admin privileges.
 */
export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  
  res.status(403).json({ 
    message: "Admin privileges required",
    success: false,
    code: "ADMIN_REQUIRED"
  });
}

// Extend Express Request interface to include API keys
declare global {
  namespace Express {
    interface Request {
      apiKeys?: {
        binanceApiKey: string | null;
        binanceSecretKey: string | null;
        defaultBroker: string;
        useTestnet: boolean;
      }
    }
  }
}