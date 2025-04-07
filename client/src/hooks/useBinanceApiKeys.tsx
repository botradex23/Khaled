import { useState, useEffect, useCallback } from 'react';
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";

interface BinanceApiKeysData {
  binanceApiKey: string;
  binanceSecretKey: string;
  binanceAllowedIp?: string;
  testnet?: boolean;
}

interface ApiKeysResponse {
  success: boolean;
  isValid: boolean;
  apiKey?: string;
  secretKey?: string;
  allowedIp?: string;
  testnet?: boolean;
  encryptionChanged?: boolean; // Flag to indicate encryption key change
  message?: string;
}

/**
 * Hook for loading, saving and managing Binance API keys
 * It automatically synchronizes keys with the authenticated user
 */
export function useBinanceApiKeys() {
  const [apiKey, setApiKey] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [allowedIp, setAllowedIp] = useState<string>('185.199.228.220');
  const [testnet, setTestnet] = useState<boolean>(true); // Using testnet by default for simulation testing
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Load saved keys from server
  const loadSavedKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Loading API keys for user...");
      
      // Get status of keys existence
      const statusResponse = await fetch('/api/binance/api-keys/status', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-User-ID': '2',  // Use a test user for development environment
        }
      });
      const statusData = await statusResponse.json();
      
      if (!statusResponse.ok) {
        throw new Error(statusData.message || 'Failed to check API keys status');
      }
      
      // If keys exist, load them
      if (statusData.configured) {
        setIsConfigured(true);
        console.log("API keys are configured, loading full keys...");
        
        // Load full keys (without masking)
        const fullResponse = await fetch('/api/binance/api-keys/full', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Test-User-ID': '2',  // Use a test user for development environment
          }
        });
        
        if (!fullResponse.ok) {
          throw new Error('Failed to load API keys');
        }
        
        const keysData: ApiKeysResponse = await fullResponse.json();
        console.log("Received API keys data:", { 
          success: keysData.success, 
          isValid: keysData.isValid,
          apiKeyLength: keysData.apiKey?.length || 0,
          secretKeyLength: keysData.secretKey?.length || 0,
          encryptionChanged: keysData.encryptionChanged || false
        });
        
        // Check if encryption keys have changed
        if (keysData.encryptionChanged) {
          // Show encryption changed warning
          toast({
            title: 'הצפנת המפתחות השתנתה',
            description: 'מפתחות ההצפנה במערכת השתנו. יש להזין מחדש את מפתחות ה-API שלך.',
            variant: 'destructive',
            duration: 10000, // Show longer for important message
          });
          
          // Clear the configured status to prompt re-entry
          setIsConfigured(false);
          setApiKey('');
          setSecretKey('');
        }
        // If keys are valid and available
        else if (keysData.success && keysData.isValid) {
          setApiKey(keysData.apiKey || '');
          setSecretKey(keysData.secretKey || '');
          setAllowedIp(keysData.allowedIp || '185.199.228.220');
          setTestnet(keysData.testnet || false);
          console.log("Successfully loaded API keys from server");
        } else {
          console.log("The saved keys are invalid or missing");
          setApiKey('');
          setSecretKey('');
        }
      } else {
        console.log("No API keys configured yet");
        setIsConfigured(false);
        setApiKey('');
        setSecretKey('');
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: 'Error Loading API Keys',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Save keys to server
  const saveApiKeys = useCallback(async () => {
    // Validate keys exist
    if (!apiKey || !secretKey) {
      toast({
        title: 'Error Saving API Keys',
        description: 'Please enter both API Key and Secret Key',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setIsSaving(true);
      console.log("Saving API keys to server...");
      
      // Clean up API key and Secret key by removing whitespace
      const cleanedApiKey = apiKey.replace(/\s+/g, '').trim();
      const cleanedSecretKey = secretKey.replace(/\s+/g, '').trim();
      const cleanedAllowedIp = allowedIp ? allowedIp.replace(/\s+/g, '').trim() : '';
      
      // Basic validation for key length - Binance API keys are usually 64 characters
      if (cleanedApiKey.length < 10) {
        toast({
          title: 'Invalid API Key',
          description: 'API key must be at least 10 characters long',
          variant: 'destructive',
        });
        setIsSaving(false);
        return false;
      }
      
      if (cleanedSecretKey.length < 10) {
        toast({
          title: 'Invalid Secret Key',
          description: 'Secret key must be at least 10 characters long',
          variant: 'destructive',
        });
        setIsSaving(false);
        return false;
      }
      
      console.log(`Sending API keys to server - API Key length: ${cleanedApiKey.length}, Secret Key length: ${cleanedSecretKey.length}`);
      
      const response = await fetch('/api/binance/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-User-ID': '2',  // Use a test user for development environment
        },
        credentials: 'include',
        body: JSON.stringify({
          apiKey: cleanedApiKey,
          secretKey: cleanedSecretKey,
          allowedIp: cleanedAllowedIp || '185.199.228.220',
          testnet,
        }),
      });
      
      const data = await response.json();
      console.log("API response:", data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save API keys');
      }
      
      // Update the local state with the cleaned values
      setApiKey(cleanedApiKey);
      setSecretKey(cleanedSecretKey);
      setAllowedIp(cleanedAllowedIp || '185.199.228.220');
      setIsConfigured(true);
      
      toast({
        title: 'API Keys Saved Successfully',
        description: 'Your Binance API keys have been updated successfully',
        variant: 'default',
      });
      
      return true;
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: 'Error Saving API Keys',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, secretKey, allowedIp, testnet, toast]);
  
  // Load keys automatically when component loads or user changes
  useEffect(() => {
    // For development, always try to load keys regardless of authentication status
    console.log("API key status from hook:", isAuthenticated);
    // In development, always load keys - in production, only load if authenticated
    loadSavedKeys();
  }, [loadSavedKeys]);
  
  // Return all parameters needed for managing API keys
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