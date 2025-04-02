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
      return true;
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
      return false;
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

      // Send to backend API
      if (typeof fetch !== 'undefined') {
        fetch('/api/analytics/mixpanel/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            event: eventName, 
            properties: combinedProperties 
          })
        }).catch(err => console.error('Error sending event to backend:', err));
      }

      return true;
    } catch (error) {
      console.error('Error tracking event in Mixpanel:', error);
      return false;
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