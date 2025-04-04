import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import AdminMyAgent from '@/components/AdminMyAgent';
import { AdminLoginForm } from '@/components/AdminLoginForm';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AdminMyAgentPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  
  // Handle admin login
  const handleLoginSuccess = (userData: any) => {
    console.log('Admin login successful', userData);
    setAdminUser(userData);
  };
  
  // We're allowing all users to access the agent for debugging
  useEffect(() => {
    // Remove admin access restrictions - always allow access
    setNeedsLogin(false);
  }, [user]);
  
  // Check agent health
  const { 
    data: healthData, 
    isLoading: healthLoading, 
    error: healthError 
  } = useQuery({
    queryKey: ['/api/my-agent/health'],
    queryFn: async () => {
      console.log('Fetching agent health status...');
      
      // Try direct port 5002 API first
      try {
        const directResponse = await fetch('http://localhost:5002/health', {
          headers: {
            'Accept': 'application/json',
            'X-Test-Admin': 'true'
          }
        });
        
        // Check if we got a proper response from direct API
        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log('Direct API agent health response:', directData);
          return directData;
        } else {
          console.warn('Direct API request failed, falling back to standard API');
        }
      } catch (directError) {
        console.warn('Direct API call failed, falling back to standard API:', directError);
      }
      
      // Fall back to original API route
      try {
        // Try the direct-agent router in the main API
        const response = await fetch('/api/direct-agent/health', {
          headers: {
            'Accept': 'application/json',
            'X-Test-Admin': 'true'
          }
        });
        
        // Check if we got a proper response from main API
        if (response.ok) {
          const data = await response.json();
          console.log('Agent health response from direct-agent route:', data);
          return data;
        } else {
          // Last resort, try original endpoint
          const fallbackResponse = await fetch('/api/my-agent/health');
          const fallbackData = await fallbackResponse.json();
          console.log('Agent health response from fallback route:', fallbackData);
          return fallbackData;
        }
      } catch (error) {
        console.error('Error checking API key status:', error);
        throw error;
      }
    },
    enabled: true, // Allow all users access
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Handle loading
  if (authLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Checking authentication status</p>
        </div>
      </div>
    );
  }
  
  // Display admin login form if needed
  if (needsLogin && !adminUser && localStorage.getItem('isAdmin') !== 'true') {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">AI Agent Admin Access</h1>
          
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Admin Access Required</AlertTitle>
            <AlertDescription>
              This page requires admin credentials. Please log in with your admin account.
            </AlertDescription>
          </Alert>
          
          <AdminLoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }
  
  // Handle agent health check
  if (healthLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Checking Agent Status</h1>
          <p>Verifying that the OpenAI agent is available</p>
        </div>
      </div>
    );
  }
  
  // Handle agent error
  if (healthError || (healthData && !healthData.success)) {
    // Check if we're getting a quota exceeded error (if available in the response)
    const quotaExceeded = healthData?.error?.includes?.('quota') || 
                          healthData?.error?.includes?.('insufficient_quota') ||
                          healthData?.message?.includes?.('quota');
    
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Agent Unavailable</h1>
          {quotaExceeded ? (
            <>
              <p className="mb-4">The OpenAI API key has exceeded its quota limit.</p>
              <p className="mb-4">This is typically caused by reaching the usage limit for the current API key.</p>
              <div className="bg-amber-100 text-amber-800 p-4 rounded-md mb-4">
                <p className="font-semibold">Your OpenAI API key has exceeded its quota</p>
                <p>Please provide a new API key with available quota to continue using the AI agent.</p>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4">The AI agent is currently unavailable. This could be due to:</p>
              <ul className="list-disc text-left mx-auto max-w-md mb-4">
                <li>Missing or invalid OpenAI API key</li>
                <li>Service disruption or rate limiting</li>
                <li>Configuration issue</li>
              </ul>
            </>
          )}
          <p>
            Please check the server logs and ensure the OPENAI_API_KEY environment variable is set correctly.
          </p>
          {healthData?.error && (
            <div className="mt-4 bg-gray-100 p-4 rounded-md text-left overflow-auto max-h-40">
              <p className="font-mono text-xs text-red-600">{healthData.error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Everything is good, show the agent UI
  return <AdminMyAgent />;
}