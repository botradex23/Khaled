// client/src/lib/mixpanel.ts

// Mixpanel token from environment or hardcoded for development
const MIXPANEL_TOKEN = '39cb139a24b909196bd231e9fadb8dd4';
const API_SECRET = '022ec591d2928d676cac6989fd14c7f0';
const MIXPANEL_API_URL = 'https://api.mixpanel.com/track';

// Custom implementation for Mixpanel without the library dependency
class CustomMixpanel {
  private token: string;
  private distinct_id: string | null = null;
  private initialized: boolean = false;

  constructor(token: string) {
    this.token = token;
  }

  // Initialize tracking
  init(): boolean {
    try {
      this.initialized = true;
      const storedId = localStorage.getItem('mp_distinct_id');
      if (storedId) {
        this.distinct_id = storedId;
      } else {
        this.distinct_id = this.generateUniqueId();
        localStorage.setItem('mp_distinct_id', this.distinct_id);
      }
      console.log('Mixpanel initialized with token:', this.token);
      
      // Process any previously failed events
      this.processFailedEvents();
      
      // Set up online/offline event listeners
      this.setupConnectionListeners();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
      return false;
    }
  }
  
  // Process previously failed events
  private async processFailedEvents(): Promise<void> {
    try {
      const failedEvents = JSON.parse(
        localStorage.getItem('mp_failed_events') || '[]'
      );
      
      if (failedEvents.length === 0) {
        return;
      }
      
      console.log(`Processing ${failedEvents.length} previously failed events`);
      
      // Process events in small batches to prevent overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < failedEvents.length; i += batchSize) {
        const batch = failedEvents.slice(i, i + batchSize);
        
        // Process batch sequentially
        for (const failedEvent of batch) {
          try {
            // Don't retry events older than 3 days
            const ageInMs = Date.now() - failedEvent.timestamp;
            if (ageInMs > 3 * 24 * 60 * 60 * 1000) {
              console.log(`Skipping old event: ${failedEvent.event}`);
              continue;
            }
            
            await this.sendEventWithRetry(failedEvent.event, failedEvent.properties, 1);
          } catch (error) {
            console.error(`Failed to process event ${failedEvent.event}:`, error);
          }
        }
        
        // Short delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Clear the processed events
      localStorage.setItem('mp_failed_events', '[]');
      console.log('Successfully processed failed events');
    } catch (error) {
      console.error('Error processing failed events:', error);
    }
  }
  
  // Set up network status listeners
  private setupConnectionListeners(): void {
    if (typeof window !== 'undefined') {
      // Process failed events when coming back online
      window.addEventListener('online', () => {
        console.log('Network connection restored, processing failed events');
        this.processFailedEvents();
      });
      
      // Log when going offline
      window.addEventListener('offline', () => {
        console.log('Network connection lost, events will be stored locally');
      });
    }
  }

  // Generate a unique identifier for anonymous users
  private generateUniqueId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Track an event via the server API
  track(eventName: string, properties: Record<string, any> = {}): boolean {
    if (!this.initialized) {
      console.warn('Mixpanel not initialized, initializing now...');
      this.init();
    }

    try {
      // Combine basic event data with custom properties
      const combinedProperties = {
        ...properties,
        token: this.token,
        distinct_id: this.distinct_id || 'anonymous',
        time: Math.floor(Date.now() / 1000),
        $browser: navigator.userAgent,
        $current_url: window.location.href,
        $screen_height: window.screen.height,
        $screen_width: window.screen.width,
      };

      // Log the event data for development
      console.log('Mixpanel event:', eventName, {
        event: eventName,
        properties: combinedProperties
      });

      // Send to backend API with retry logic
      if (typeof fetch !== 'undefined') {
        this.sendEventWithRetry(eventName, combinedProperties);
      }

      return true;
    } catch (error) {
      console.error('Error tracking event in Mixpanel:', error);
      return false;
    }
  }
  
  // Send event with retry logic
  private async sendEventWithRetry(
    eventName: string, 
    properties: Record<string, any>,
    retries = 3, 
    backoff = 500
  ): Promise<void> {
    try {
      const response = await fetch('/api/analytics/mixpanel/track', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          event: eventName, 
          properties 
        }),
        // Add credentials to ensure cookies are sent
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Unknown error from server');
      }
      
      // Success - event was tracked
      console.debug(`Mixpanel event '${eventName}' sent successfully`);
    } catch (error) {
      console.error('Error sending event to backend:', error);
      
      // Retry logic
      if (retries > 0) {
        console.log(`Retrying event '${eventName}'... (${retries} attempts left)`);
        
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoff));
        
        // Retry with increased backoff
        return this.sendEventWithRetry(
          eventName, 
          properties, 
          retries - 1, 
          backoff * 2
        );
      } else {
        // Store failed events in localStorage for later retry
        this.storeFailedEvent(eventName, properties);
      }
    }
  }
  
  // Store failed events for later retry
  private storeFailedEvent(eventName: string, properties: Record<string, any>): void {
    try {
      const failedEvents = JSON.parse(
        localStorage.getItem('mp_failed_events') || '[]'
      );
      
      failedEvents.push({
        event: eventName,
        properties,
        timestamp: Date.now()
      });
      
      // Limit the number of stored events
      const limitedEvents = failedEvents.slice(-50);
      
      localStorage.setItem('mp_failed_events', JSON.stringify(limitedEvents));
      console.log(`Stored failed event '${eventName}' for later retry`);
    } catch (e) {
      console.error('Failed to store event in localStorage:', e);
    }
  }

  // Identify a user
  identify(userId: string, userProperties: Record<string, any> = {}): boolean {
    try {
      this.distinct_id = userId;
      localStorage.setItem('mp_distinct_id', userId);
      
      // Track identify event
      this.track('$identify', {
        $identified_id: userId,
        ...userProperties
      });
      
      console.log('Mixpanel user identified:', userId);
      return true;
    } catch (error) {
      console.error('Error identifying user in Mixpanel:', error);
      return false;
    }
  }

  // Reset the user identifier
  reset(): boolean {
    try {
      this.distinct_id = this.generateUniqueId();
      localStorage.setItem('mp_distinct_id', this.distinct_id);
      console.log('Mixpanel user reset');
      return true;
    } catch (error) {
      console.error('Error resetting Mixpanel user:', error);
      return false;
    }
  }
}

// Create instance
const mixpanelInstance = new CustomMixpanel(MIXPANEL_TOKEN);

// Helper functions
const initialize = () => mixpanelInstance.init();
const track = (eventName: string, properties: Record<string, any> = {}) => 
  mixpanelInstance.track(eventName, properties);
const identify = (userId: string, userProperties: Record<string, any> = {}) => 
  mixpanelInstance.identify(userId, userProperties);
const reset = () => mixpanelInstance.reset();

// Track page view events
const trackPageView = (url: string, referrer?: string) => {
  return track('page_view', {
    url,
    referrer: referrer || document.referrer,
    pathname: new URL(url).pathname
  });
};

export default {
  init: initialize,
  track,
  identify,
  reset,
  trackPageView
};