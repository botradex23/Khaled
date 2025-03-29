import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * מיסוך מחרוזת רגישה (כמו מפתח API) לתצוגה בטוחה בלוגים
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

// חשוב להגדיר כדי לפתור בעיות TypeScript
declare global {
  namespace Express {
    interface Request {
      binanceApiKeys?: {
        apiKey: string;
        secretKey: string;
        testnet: boolean;
      };
    }
  }
}

/**
 * Middleware לקבלת מפתחות ה-API של המשתמש עבור Binance
 * מוסיף את המפתחות לאובייקט req.binanceApiKeys
 */
export async function getBinanceApiKeys(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // שליפת המפתחות מהאחסון
    const apiKeys = await storage.getUserBinanceApiKeys(req.user.id);
    
    // מדפיס מידע מפורט לצורך דיבאג
    console.log(`getUserBinanceApiKeys for user ${req.user.id} (${req.user.email}):`);
    console.log(`  Binance API key type: ${typeof apiKeys?.binanceApiKey}`);
    console.log(`  Binance API key null check: ${apiKeys?.binanceApiKey === null}`);
    console.log(`  Binance API key undefined check: ${apiKeys?.binanceApiKey === undefined}`);
    console.log(`  Binance API key empty string check: ${apiKeys?.binanceApiKey === ""}`);
    console.log(`  Binance API key length: ${apiKeys?.binanceApiKey ? apiKeys.binanceApiKey.length : "N/A"}`);
    
    // אם אין מפתחות מוגדרים, מוסיף אובייקט ריק ל-request
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      console.log(`User ${req.user.id} does not have Binance API keys configured.`);
      
      // במקום להחזיר שגיאה, מסמן את הבקשה כללא מפתחות API
      // ונותן למידלוור/טיפול בקשה הבא להחליט מה לעשות
      req.binanceApiKeys = {
        apiKey: '',
        secretKey: '',
        testnet: false
      };
      
      // ממשיך למידלוור/טיפול בקשה הבא
      return next();
    }
    
    // רישום לצורך דיבאג (בלי לחשוף את המפתחות האמיתיים)
    console.log(`Retrieved Binance API keys for user ${req.user.id}. API Key length: ${apiKeys.binanceApiKey.length}, Secret Key length: ${apiKeys.binanceSecretKey.length}`);
    
    // נקה את המפתחות מכל סוגי הרווחים והתווים הלבנים
    const trimmedApiKey = apiKeys.binanceApiKey.replace(/\s+/g, '').trim();
    const trimmedSecretKey = apiKeys.binanceSecretKey.replace(/\s+/g, '').trim();
    
    // מוודא שהמפתחות אינם ריקים לאחר הניקוי
    if (!trimmedApiKey || !trimmedSecretKey) {
      return res.status(400).json({ 
        error: 'Invalid Binance API keys',
        message: 'המפתחות שלך נראים ריקים או לא חוקיים. אנא הגדר אותם מחדש.'
      });
    }
    
    // בדיקה שהמפתחות באורך תקין - מינימום 10 תווים
    if (trimmedApiKey.length < 10) {
      return res.status(400).json({
        error: 'Invalid API key format',
        message: 'מפתח API לא תקין. מפתח API של Binance חייב להיות לפחות 10 תווים.'
      });
    }
    
    if (trimmedSecretKey.length < 10) {
      return res.status(400).json({
        error: 'Invalid Secret key format',
        message: 'מפתח סודי לא תקין. מפתח סודי של Binance חייב להיות לפחות 10 תווים.'
      });
    }
    
    // מצרף את המפתחות לאובייקט הבקשה לשימוש בנתיבים
    req.binanceApiKeys = {
      apiKey: trimmedApiKey,
      secretKey: trimmedSecretKey,
      testnet: false // שימוש בסביבה אמיתית לפי דרישת המשתמש
    };
    
    // שומר את ה-allowed IP בנפרד למטרות דיבאג
    console.log(`Binance Allowed IP: ${apiKeys.binanceAllowedIp || "Not set"}`);
    
    // רישום לדיבאג שעוזר לפתור בעיות
    console.log(`Binance API keys prepared for request. API Key format valid: ${trimmedApiKey.length > 0}, Secret Key format valid: ${trimmedSecretKey.length > 0}`);
    
    next();
  } catch (error) {
    console.error('Error retrieving Binance API keys:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve API keys'
    });
  }
}