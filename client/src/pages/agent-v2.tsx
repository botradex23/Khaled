import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import AdminMyAgentV2 from '../components/AdminMyAgentV2';
import { useAuth } from '../hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircle } from 'lucide-react';

export default function AgentV2Page() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [needsLogin, setNeedsLogin] = useState(false);
  
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
    queryKey: ['/api/agent-v2/status'],
    queryFn: async () => {
      console.log('Fetching agent v2 status...');
      
      // Use the unified Express server - no port specification
      try {
        const response = await fetch('/api/agent-v2/status');
        
        // Check if we got a proper response
        if (response.ok) {
          const data = await response.json();
          console.log('Agent v2 status response:', data);
          return data;
        } else {
          console.warn('API request failed with status:', response.status);
          throw new Error('Failed to check agent status');
        }
      } catch (error) {
        console.error('Error checking agent status:', error);
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
  
  // Handle agent health check
  if (healthLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Checking Agent Status</h1>
          <p>Verifying that the AI agent is available</p>
        </div>
      </div>
    );
  }
  
  // Handle agent error
  if (healthError || (healthData && !healthData.status === 'ok')) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Agent Unavailable</h1>
          <p className="mb-4">The AI agent is currently unavailable. This could be due to:</p>
          <ul className="list-disc text-left mx-auto max-w-md mb-4">
            <li>Missing or invalid OpenAI API key</li>
            <li>Service disruption or rate limiting</li>
            <li>Agent server not running</li>
          </ul>
          <p>
            Please check the server logs and ensure the OPENAI_API_KEY environment variable is set correctly.
          </p>
        </div>
      </div>
    );
  }
  
  // Everything is good, show the agent UI
  return (
    <div className="container mx-auto">
      <AdminMyAgentV2 />
    </div>
  );
}