import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User } from '@shared/schema';
import { storage } from '../storage';
import { Request } from 'express';
import config from '../config';

// Extended GoogleStrategy options with proper typings
interface ExtendedGoogleStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
  proxy: boolean;
  passReqToCallback: true; // Always true for our implementation
}

// Enhanced GoogleProfile interface for our use case
interface GoogleProfile extends Profile {
  id: string;
  displayName: string;
  emails?: { value: string; verified?: boolean }[];
  photos?: { value: string }[];
  name?: {
    givenName?: string;
    familyName?: string;
  };
}

// Helper function to provide a flexible Google OAuth callback URL
// that works in both development and production environments
const getCallbackUrl = (req?: Request): string => {
  // Check if we have a PUBLIC_URL in the environment (for production)
  const publicUrl = process.env.PUBLIC_URL || '';
  const domain = process.env.DOMAIN || '';
  
  // First check if we have an explicitly configured callback URL
  if (process.env.GOOGLE_CALLBACK_URL) {
    console.log('Using explicitly configured Google callback URL:', process.env.GOOGLE_CALLBACK_URL);
    return process.env.GOOGLE_CALLBACK_URL;
  }
  
  // In production with configured domain, use the PUBLIC_URL or build from domain
  if (process.env.NODE_ENV === 'production' && (publicUrl || domain)) {
    const productionCallback = publicUrl 
      ? `${publicUrl}/api/auth/google/callback`
      : `https://${domain}/api/auth/google/callback`;
      
    console.log('Using production callback URL:', productionCallback);
    return productionCallback;
  }
  
  // Detect if running in Replit environment
  const isReplit = Boolean(process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT);
  
  // If in Replit environment, use fixed Replit URL
  if (isReplit) {
    // Use the exact URL registered in Google API credentials for Replit
    const replitCallbackUrl = 'https://19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev/api/auth/google/callback';
    console.log('Using Replit callback URL:', replitCallbackUrl);
    return replitCallbackUrl;
  }
  
  // Otherwise, determine the callback dynamically for development
  let host = 'localhost:5000'; // Default fallback
  
  // If we have a request object, extract host information
  if (req) {
    // Try different header variations for different environment setups
    const hostHeaders = [
      req.headers['host'],
      req.headers['x-forwarded-host'],
      req.headers['x-original-host']
    ];
    
    // Use the first valid header found
    for (const headerValue of hostHeaders) {
      if (headerValue && typeof headerValue === 'string') {
        host = headerValue;
        break;
      }
    }
    
    // If host is a simple port number (like '3000'), prefix with localhost
    if (/^\d+$/.test(host)) {
      host = `localhost:${host}`;
    }
  }
  
  // Determine protocol based on host
  const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https';
  
  // Build the callback URL
  const callbackUrl = `${protocol}://${host}/api/auth/google/callback`;
  console.log('Using dynamic callback URL:', callbackUrl);
  
  return callbackUrl;
};

// Initialize Google OAuth strategy
export const setupGoogleAuth = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not configured - auth will be disabled');
    return;
  }
  
  // Initial callback URL - will be dynamically updated in auth route
  const initialCallbackUrl = getCallbackUrl();
  
  console.log('Setting up Google OAuth with:');
  console.log(`Client ID: ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'not set'}`);
  console.log(`Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'set (hidden)' : 'not set'}`);
  console.log(`Initial Callback URL: ${initialCallbackUrl}`);
  
  // Create and register Google strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: initialCallbackUrl,
        scope: ['profile', 'email'],
        proxy: true, // Enable proxy support for Replit environment
        passReqToCallback: true // We need the request object for session management
      } as ExtendedGoogleStrategyOptions,
      // Fix the function signature to match what passport-google-oauth20 expects
      // @ts-ignore - We're purposely using a 5-param version with Request object
      async (
        req: Request, 
        accessToken: string, 
        refreshToken: string, 
        profile: GoogleProfile, 
        done: (error: Error | null, user?: User) => void
      ) => {
        console.log('Google auth strategy callback accessed, session ID:', req.sessionID);
        console.log('Google auth profile data received with id:', profile.id);
        
        try {
          // Check if user exists with this Google ID
          let user = await storage.getUserByGoogleId(profile.id);

          if (user) {
            console.log('Existing user found with Google ID:', profile.id);
            // Update profile picture if available
            if (profile.photos?.[0]?.value && (!user.profilePicture || user.profilePicture !== profile.photos[0].value)) {
              await storage.updateUser(user.id, { 
                profilePicture: profile.photos[0].value 
              } as any);
              user.profilePicture = profile.photos[0].value;
            }
            return done(null, user);
          }

          // Check if user exists with same email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              console.log('Existing user found with email:', email);
              // Link Google account to existing user
              await storage.updateUser(user.id, { 
                googleId: profile.id,
                profilePicture: profile.photos?.[0]?.value || user.profilePicture 
              } as any);
              
              // Update the user object
              user.googleId = profile.id;
              if (profile.photos?.[0]?.value) {
                user.profilePicture = profile.photos[0].value;
              }
              
              return done(null, user);
            }
          }

          // No existing user found, create a new one
          if (email) {
            console.log('Creating new user with Google account:', email);
            // Create new user with Google data
            const newUser = await storage.createUser({
              username: profile.displayName || `user_${profile.id}`,
              email: email,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              googleId: profile.id,
              profilePicture: profile.photos?.[0]?.value,
              password: null, // No password for OAuth users
              isAdmin: false,
              isSuperAdmin: false,
              useTestnet: true // Start with testnet for safety
            } as any);

            return done(null, newUser);
          } else {
            // Cannot create user without email
            console.error('Google authentication failed: No email provided in profile');
            return done(new Error('Could not retrieve email from Google profile'), undefined);
          }
        } catch (error) {
          console.error('Error during Google authentication:', error);
          return done(error instanceof Error ? error : new Error('Unknown error during authentication'), undefined);
        }
      }
    )
  );

  // Update auth routes to use dynamic callback URL
  // See setupAuthRoutes in index.ts for route customization
};

// Export helper for use in auth routes
export { getCallbackUrl };
