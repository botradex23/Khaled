import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface BinanceApiKeysData {
  binanceApiKey: string;
  binanceSecretKey: string;
  binanceAllowedIp?: string;
  testnet?: boolean;
}

/**
 * Hook for loading, saving and managing Binance API keys
 * It automatically synchronizes keys with the authenticated user
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
  
  // Load saved keys from server
  const loadSavedKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Loading API keys for user...");
      
      // Get status of keys existence
      const statusResponse = await fetch('/api/binance/api-keys/status', {
        credentials: 'include'
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
          credentials: 'include'
        });
        
        if (!fullResponse.ok) {
          throw new Error('Failed to load API keys');
        }
        
        const keysData = await fullResponse.json();
        console.log("Received API keys data:", { 
          success: keysData.success, 
          isValid: keysData.isValid,
          apiKeyLength: keysData.apiKey?.length || 0,
          secretKeyLength: keysData.secretKey?.length || 0
        });
        
        if (keysData.success && keysData.isValid) {
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
      
      const response = await fetch('/api/binance/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          apiKey,
          secretKey,
          allowedIp,
          testnet,
        }),
      });
      
      const data = await response.json();
      console.log("API response:", data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save API keys');
      }
      
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
    if (isAuthenticated && user) {
      console.log("User authenticated, loading API keys automatically...", user.id);
      loadSavedKeys();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, loadSavedKeys]);
  
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