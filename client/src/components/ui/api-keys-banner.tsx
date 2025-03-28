import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { AlertTriangle, ChevronRight, Key } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export default function ApiKeysBanner() {
  const { isAuthenticated, user } = useAuth();
  
  // Query to check if user has API keys configured
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/users/api-keys/status'],
    queryFn: async () => {
      if (!isAuthenticated) return { hasValidApiKeys: false };
      try {
        console.log('ApiKeysBanner: Fetching API keys status for authenticated user');
        const res = await apiRequest('GET', '/api/users/api-keys/status');
        
        // No need to parse response as apiRequest already returns JSON
        console.log('ApiKeysBanner: API keys status response:', res);
        return res;
      } catch (err) {
        console.error('ApiKeysBanner: Error fetching API keys status:', err);
        return { hasValidApiKeys: false, error: err };
      }
    },
    enabled: isAuthenticated,
    // Poll more frequently to catch API key updates sooner
    refetchInterval: 30000,
    // Add staleTime to prevent unnecessary refetches
    staleTime: 10000,
  });

  // For debugging - log the current state
  console.log('ApiKeysBanner: Current state:', { 
    isAuthenticated, 
    hasValidApiKeys: data?.hasValidApiKeys,
    isLoading,
    error
  });

  const hasValidApiKeys = data?.hasValidApiKeys;
  
  // Added force-cache invalidation - this helps refresh API keys data when they're updated
  React.useEffect(() => {
    if (isAuthenticated) {
      // Force refetch when component mounts to ensure we get fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users/api-keys/status'] });
    }
  }, [isAuthenticated]);
  
  // Don't show anything if:
  // 1. User is not authenticated
  // 2. User has valid API keys
  // 3. Data is still loading
  // 4. Data is explicitly null/undefined (prevents flash of content during auth transitions)
  if (!isAuthenticated || hasValidApiKeys === true || isLoading || data === undefined) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-primary bg-primary/10 text-foreground mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
          <div>
            <AlertTitle className="text-base font-semibold mb-1">
              נדרשת הגדרת מפתחות API
            </AlertTitle>
            <AlertDescription className="text-sm">
              <p className="mb-1">
                כדי להשתמש בכל האפשרויות של המערכת, אנא הגדר את מפתחות ה-API שלך.
              </p>
            </AlertDescription>
          </div>
        </div>
        <Link href="/api-keys">
          <Button size="sm" variant="default" className="bg-primary text-primary-foreground flex items-center">
            <Key className="h-4 w-4 mr-1" />
            הגדר עכשיו
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </Alert>
  );
}