import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface BinanceApiKeysData {
  binanceApiKey: string;
  binanceSecretKey: string;
  binanceAllowedIp?: string;
  testnet?: boolean;
}

/**
 * הוק זה משמש לטעינה, שמירה וניהול מפתחות API של ביננס
 * הוא מסנכרן אוטומטית את המפתחות עם המשתמש המחובר
 */
export function useBinanceApiKeys() {
  const [apiKey, setApiKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [allowedIp, setAllowedIp] = useState<string>('185.199.228.220');
  const [testnet, setTestnet] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // טען את המפתחות באופן אוטומטי בעת טעינת הקומפוננטה או שינוי משתמש מחובר
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedKeys();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);
  
  // טעינת המפתחות השמורים מהשרת
  const loadSavedKeys = async () => {
    try {
      setIsLoading(true);
      
      // קבל מצב קיום מפתחות
      const statusResponse = await fetch('/api/binance/api-keys/status');
      const statusData = await statusResponse.json();
      
      if (!statusResponse.ok) {
        throw new Error(statusData.message || 'Failed to check API keys status');
      }
      
      // אם יש מפתחות, טען אותם
      if (statusData.configured) {
        setIsConfigured(true);
        
        // טען את המפתחות המלאים (ללא מיסוך)
        const fullResponse = await fetch('/api/binance/api-keys/full');
        if (!fullResponse.ok) {
          throw new Error('Failed to load API keys');
        }
        
        const keysData = await fullResponse.json();
        
        if (keysData.success && keysData.isValid) {
          setApiKey(keysData.apiKey || '');
          setSecretKey(keysData.secretKey || '');
          setAllowedIp(keysData.allowedIp || '185.199.228.220');
          setTestnet(keysData.testnet || false);
          console.log("הטענת מפתחות API מהשרת בוצעה בהצלחה");
        } else {
          console.log("The saved keys are invalid or missing");
          setApiKey('');
          setSecretKey('');
        }
      } else {
        setIsConfigured(false);
        setApiKey('');
        setSecretKey('');
      }
    } catch (error) {
      console.error('שגיאה בטעינת מפתחות API:', error);
      toast({
        title: 'שגיאה בטעינת מפתחות API',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // שמירת המפתחות לשרת
  const saveApiKeys = async () => {
    // וידוא שיש מפתחות לשמור
    if (!apiKey || !secretKey) {
      toast({
        title: 'שגיאה בשמירת מפתחות API',
        description: 'נא להזין את שני המפתחות (API Key ו-Secret Key)',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/binance/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          secretKey,
          allowedIp,
          testnet,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save API keys');
      }
      
      setIsConfigured(true);
      
      toast({
        title: 'מפתחות API נשמרו בהצלחה',
        description: 'מפתחות ה-API של Binance עודכנו בהצלחה',
        variant: 'default',
      });
      
      return true;
    } catch (error) {
      console.error('שגיאה בשמירת מפתחות API:', error);
      toast({
        title: 'שגיאה בשמירת מפתחות API',
        description: error instanceof Error ? error.message : 'אירעה שגיאה לא ידועה',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // החזרת כל הפרמטרים הדרושים לניהול מפתחות API
  return {
    apiKey,
    setApiKey,
    secretKey,
    setSecretKey,
    allowedIp,
    setAllowedIp,
    testnet,
    setTestnet,
    isLoading,
    isSaving,
    isConfigured,
    loadSavedKeys,
    saveApiKeys,
  };
}