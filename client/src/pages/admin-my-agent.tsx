import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import AdminMyAgent from '@/components/AdminMyAgent';
import { useAuth } from '@/hooks/use-auth';

export default function AdminMyAgentPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  // Check agent health
  const { 
    data: healthData, 
    isLoading: healthLoading, 
    error: healthError 
  } = useQuery({
    queryKey: ['/api/my-agent/health'],
    queryFn: async () => {
      const response = await fetch('/api/my-agent/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      return data;
    },
    enabled: !!user && user.isAdmin === true,
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.isAdmin !== true)) {
      setLocation('/login');
    }
  }, [user, authLoading, setLocation]);
  
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
  
  // Handle not admin
  if (!user || user.isAdmin !== true) {
    return null; // Will redirect via useEffect
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
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Agent Unavailable</h1>
          <p className="mb-4">The AI agent is currently unavailable. This could be due to:</p>
          <ul className="list-disc text-left mx-auto max-w-md mb-4">
            <li>Missing or invalid OpenAI API key</li>
            <li>Service disruption or rate limiting</li>
            <li>Configuration issue</li>
          </ul>
          <p>
            Please check the server logs and ensure the OPENAI_API_KEY environment variable is set correctly.
          </p>
        </div>
      </div>
    );
  }
  
  // Everything is good, show the agent UI
  return <AdminMyAgent />;
}