// client/src/components/MixpanelProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import mixpanel from '../lib/mixpanel';

// Context for Mixpanel
interface MixpanelContextType {
  track: (eventName: string, properties?: Record<string, any>) => void;
  identify: (userId: string, userProperties?: Record<string, any>) => void;
  reset: () => void;
  trackBotCreation: (botType: string, settings: Record<string, any>) => void;
  trackTrade: (tradeType: string, symbol: string, amount: number | string, additional?: Record<string, any>) => void;
  trackBotAction: (action: string, botType: string, botId: string | number) => void;
  trackFeatureUsage: (feature: string, details?: Record<string, any>) => void;
  trackError: (errorType: string, errorMessage: string, errorDetails?: Record<string, any>) => void;
  trackPerformance: (component: string, durationMs: number) => void;
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

// Event names constants
export const MIXPANEL_EVENTS = {
  PAGE_VIEW: 'page_view',
  LOGIN: 'user_login',
  SIGNUP: 'user_signup',
  BOT_CREATED: 'bot_created',
  BOT_UPDATED: 'bot_updated',
  BOT_DELETED: 'bot_deleted',
  BOT_STARTED: 'bot_started',
  BOT_STOPPED: 'bot_stopped',
  BOT_ACTION: 'bot_action',
  TRADE_EXECUTED: 'trade_executed',
  TRADE_CANCELED: 'trade_canceled',
  SETTINGS_CHANGED: 'settings_changed',
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred',
  ERROR: 'error',
  PERFORMANCE_METRIC: 'performance_metric',
  RISK_SETTING_CHANGED: 'risk_setting_changed',
  PREDICTION_VIEWED: 'prediction_viewed',
  DASHBOARD_VIEWED: 'dashboard_view',
  CHART_INTERACTION: 'chart_interaction',
  FILTER_APPLIED: 'filter_applied',
  SEARCH_PERFORMED: 'search_performed',
  SORT_APPLIED: 'sort_applied'
};

// Properties for the MixpanelProvider component
interface MixpanelProviderProps {
  children: React.ReactNode;
}

// MixpanelProvider component
const MixpanelProvider: React.FC<MixpanelProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Mixpanel on component mount
  useEffect(() => {
    const initStatus = mixpanel.init();
    setIsInitialized(initStatus);
    
    if (initStatus) {
      console.log('Mixpanel initialized');

      // Track page view on initial load
      trackPageView();

      // Track performance metrics
      trackPageLoadPerformance();
    }

    // Set up navigation tracking
    const handleRouteChange = () => {
      trackPageView();
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange);
    
    // Listen for clicks on elements with data-tracking-id
    document.addEventListener('click', handleTrackableClick);
    
    // Track session and system info
    trackSystemInfo();
    
    // Set up error tracking
    setupErrorTracking();

    // Handle cleanup
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('click', handleTrackableClick);
    };
  }, []);
  
  // Track page load performance
  const trackPageLoadPerformance = () => {
    if (window.performance) {
      setTimeout(() => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const domReadyTime = perfData.domComplete - perfData.domLoading;
        
        mixpanel.track(MIXPANEL_EVENTS.PERFORMANCE_METRIC, {
          metric_type: 'page_load',
          page: window.location.pathname,
          total_load_time_ms: pageLoadTime,
          dom_ready_time_ms: domReadyTime,
          network_latency_ms: perfData.responseEnd - perfData.requestStart
        });
      }, 0);
    }
  };
  
  // Track current page view
  const trackPageView = () => {
    const url = window.location.href;
    const path = window.location.pathname;
    
    // Track specific page types
    if (path.includes('/dashboard')) {
      mixpanel.track(MIXPANEL_EVENTS.DASHBOARD_VIEWED, {
        page: path,
        referrer: document.referrer
      });
    } else if (path.includes('/predictions') || path.includes('/forecast')) {
      mixpanel.track(MIXPANEL_EVENTS.PREDICTION_VIEWED, {
        page: path,
        referrer: document.referrer
      });
    }
    
    // Always track general page view
    mixpanel.track(MIXPANEL_EVENTS.PAGE_VIEW, {
      page: path,
      url: url,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  };
  
  // Track clickable elements with data-tracking attributes
  const handleTrackableClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const trackingElement = findTrackingElement(target);
    
    if (trackingElement) {
      const trackingId = trackingElement.getAttribute('data-tracking-id');
      const trackingType = trackingElement.getAttribute('data-tracking-type') || 'click';
      const trackingCategory = trackingElement.getAttribute('data-tracking-category') || 'ui_interaction';
      
      if (trackingId) {
        mixpanel.track(trackingType, {
          element_id: trackingId,
          category: trackingCategory,
          text: trackingElement.textContent?.trim(),
          page: window.location.pathname
        });
      }
    }
  };
  
  // Find the closest element with tracking attributes
  const findTrackingElement = (element: HTMLElement | null): HTMLElement | null => {
    if (!element) return null;
    if (element.hasAttribute('data-tracking-id')) return element;
    if (element.parentElement) return findTrackingElement(element.parentElement);
    return null;
  };
  
  // Track system info
  const trackSystemInfo = () => {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    mixpanel.track('session_start', {
      screen_width: screenWidth,
      screen_height: screenHeight,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      pixel_ratio: devicePixelRatio,
      language: navigator.language,
      platform: navigator.platform,
      is_mobile: /Mobi|Android/i.test(navigator.userAgent)
    });
  };
  
  // Set up error tracking
  const setupErrorTracking = () => {
    window.addEventListener('error', (e) => {
      trackError('javascript_error', e.message, {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
      });
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      trackError('unhandled_promise', 'Unhandled Promise Rejection', {
        reason: e.reason?.toString(),
        stack: e.reason?.stack
      });
    });
  };

  // Wrapper functions for Mixpanel tracking
  const track = (eventName: string, properties?: Record<string, any>) => {
    if (!isInitialized) return;
    mixpanel.track(eventName, properties);
  };

  const identify = (userId: string, userProperties?: Record<string, any>) => {
    if (!isInitialized) return;
    mixpanel.identify(userId, userProperties);
  };

  const reset = () => {
    if (!isInitialized) return;
    mixpanel.reset();
  };
  
  // Track bot creation
  const trackBotCreation = (botType: string, settings: Record<string, any>) => {
    if (!isInitialized) return;
    mixpanel.track(MIXPANEL_EVENTS.BOT_CREATED, {
      bot_type: botType,
      settings: settings,
      timestamp: new Date().toISOString()
    });
  };
  
  // Track trade execution
  const trackTrade = (tradeType: string, symbol: string, amount: number | string, additional?: Record<string, any>) => {
    if (!isInitialized) return;
    mixpanel.track(MIXPANEL_EVENTS.TRADE_EXECUTED, {
      trade_type: tradeType,
      symbol: symbol,
      amount: amount,
      ...additional,
      timestamp: new Date().toISOString()
    });
  };
  
  // Track bot actions
  const trackBotAction = (action: string, botType: string, botId: string | number) => {
    if (!isInitialized) return;
    mixpanel.track(action, {
      bot_type: botType,
      bot_id: botId,
      timestamp: new Date().toISOString()
    });
  };
  
  // Track feature usage
  const trackFeatureUsage = (feature: string, details?: Record<string, any>) => {
    if (!isInitialized) return;
    mixpanel.track(MIXPANEL_EVENTS.FEATURE_USED, {
      feature_name: feature,
      ...details,
      timestamp: new Date().toISOString()
    });
  };
  
  // Track errors
  const trackError = (errorType: string, errorMessage: string, errorDetails?: Record<string, any>) => {
    if (!isInitialized) return;
    mixpanel.track(MIXPANEL_EVENTS.ERROR_OCCURRED, {
      error_type: errorType,
      error_message: errorMessage,
      ...errorDetails,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  };
  
  // Track performance metrics
  const trackPerformance = (component: string, durationMs: number) => {
    if (!isInitialized) return;
    mixpanel.track(MIXPANEL_EVENTS.PERFORMANCE_METRIC, {
      component: component,
      duration_ms: durationMs,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <MixpanelContext.Provider value={{
      track,
      identify,
      reset,
      trackBotCreation,
      trackTrade,
      trackBotAction,
      trackFeatureUsage,
      trackError,
      trackPerformance
    }}>
      {children}
    </MixpanelContext.Provider>
  );
};

// Export the component and hook
export { useMixpanel };
export default MixpanelProvider;