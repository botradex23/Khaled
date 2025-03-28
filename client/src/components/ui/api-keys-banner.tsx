import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { AlertTriangle, ChevronRight, Key } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export default function ApiKeysBanner() {
  const { isAuthenticated, user } = useAuth();
  
  // Query to check if user has API keys configured
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/users/api-keys/status'],
    queryFn: async () => {
      if (!isAuthenticated) return { hasValidApiKeys: false };
      const res = await apiRequest('GET', '/api/users/api-keys/status');
      return await res.json();
    },
    enabled: isAuthenticated,
    // Poll less frequently since API keys don't change often
    refetchInterval: 60000,
  });

  const hasValidApiKeys = data?.hasValidApiKeys;
  
  // Don't show anything if user is not authenticated or has valid API keys
  if (!isAuthenticated || hasValidApiKeys || isLoading) {
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