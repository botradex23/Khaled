// server/services/mixpanel.ts

import crypto from 'crypto';
import https from 'https';
import { URL } from 'url';

/**
 * Server-side Mixpanel Analytics Service
 */
export class MixpanelService {
  private token: string;
  private apiSecret: string;
  private apiEndpoint = 'https://api.mixpanel.com/track';

  constructor(token: string, apiSecret: string) {
    this.token = token;
    this.apiSecret = apiSecret;
  }

  /**
   * Track an event in Mixpanel from the server side
   */
  async track(distinctId: string, eventName: string, properties: Record<string, any> = {}) {
    try {
      const eventData = {
        event: eventName,
        properties: {
          token: this.token,
          distinct_id: distinctId,
          ...properties,
          time: Math.floor(Date.now() / 1000),
        }
      };

      // Generate the data string and signature
      const encodedData = Buffer.from(JSON.stringify(eventData)).toString('base64');
      
      // Create the URL with parameters
      const url = new URL(this.apiEndpoint);
      url.searchParams.append('data', encodedData);
      
      // Optional: Add signature if required for secure API calls
      if (this.apiSecret) {
        const signature = this.generateSignature(encodedData);
        url.searchParams.append('sig', signature);
      }
      
      // Send the request to Mixpanel
      const success = await this.sendHttpRequest(url.toString());
      console.log(`[Mixpanel] Server event '${eventName}' for user ${distinctId}: ${success ? 'sent' : 'failed'}`);
      
      return success;
    } catch (error) {
      console.error('[Mixpanel] Error tracking event:', error);
      return false;
    }
  }

  /**
   * Generate a cryptographic signature using the API secret
   */
  private generateSignature(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data + this.apiSecret)
      .digest('hex');
  }

  /**
   * Send HTTP request to Mixpanel API
   */
  private sendHttpRequest(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve(response.statusCode === 200);
        });
      }).on('error', (error) => {
        console.error('[Mixpanel] HTTP request error:', error);
        resolve(false);
      });
    });
  }
}

// Export singleton instance with the provided token and API secret
const mixpanel = new MixpanelService(
  '39cb139a24b909196bd231e9fadb8dd4',  // Mixpanel Token
  '022ec591d2928d676cac6989fd14c7f0'   // API Secret
);

export default mixpanel;