// client/src/components/MixpanelProvider.tsx

import React, { createContext, useContext, useEffect } from 'react';
import mixpanel from '../lib/mixpanel';

// Context for Mixpanel
interface MixpanelContextType {
  track: (eventName: string, properties?: Record<string, any>) => void;
  identify: (userId: string, userProperties?: Record<string, any>) => void;
  reset: () => void;
}

const MixpanelContext = createContext<MixpanelContextType | null>(null);

// Custom hook for using Mixpanel
const useMixpanel = () => {
  const context = useContext(MixpanelContext);
  if (!context) {
    throw new Error('useMixpanel must be used within a MixpanelProvider');
  }
  return context;
};

// Properties for the MixpanelProvider component
interface MixpanelProviderProps {
  children: React.ReactNode;
}

// MixpanelProvider component
const MixpanelProvider: React.FC<MixpanelProviderProps> = ({ children }) => {
  // Initialize Mixpanel on component mount
  useEffect(() => {
    mixpanel.init();
    console.log('Mixpanel initialized');

    // Track page view on initial load
    mixpanel.track('page_view', {
      page: window.location.pathname,
      referrer: document.referrer,
    });

    // Set up navigation tracking
    const handleRouteChange = () => {
      mixpanel.track('page_view', {
        page: window.location.pathname,
        referrer: document.referrer,
      });
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange);

    // Handle cleanup
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Wrapper functions for Mixpanel tracking
  const track = (eventName: string, properties?: Record<string, any>) => {
    mixpanel.track(eventName, properties);
  };

  const identify = (userId: string, userProperties?: Record<string, any>) => {
    mixpanel.identify(userId, userProperties);
  };

  const reset = () => {
    mixpanel.reset();
  };

  return (
    <MixpanelContext.Provider value={{ track, identify, reset }}>
      {children}
    </MixpanelContext.Provider>
  );
};

// Export the component and hook
export { useMixpanel };
export default MixpanelProvider;