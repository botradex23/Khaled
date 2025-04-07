import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '@shared/schema';
import { storage } from '../storage';

// Define profile type for use in callback
interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
  name?: {
    givenName?: string;
    familyName?: string;
  };
}

// Initialize Google OAuth strategy
export const setupGoogleAuth = () => {
  // Get the hostname from environment variable or default to replit domain
  const callbackHost = process.env.REPLIT_HOSTNAME || '19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev';
  const callbackUrl = `https://${callbackHost}/api/auth/google/callback`;
  
  console.log('Setting up Google OAuth with:');
  console.log(`Client ID: ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'not set'}`);
  console.log(`Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'set (hidden)' : 'not set'}`);
  console.log(`Callback URL: ${callbackUrl}`);
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not configured - auth will be disabled');
    return;
  }
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackUrl,
        scope: ['profile', 'email'],
        proxy: true // Enable proxy support to handle Replit proxy
      },
      async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: (error: Error | null, user?: User) => void) => {
        try {
          // Check if user exists with this Google ID
          let user = await storage.getUserByGoogleId(profile.id);

          if (user) {
            // User found, return the user
            return done(null, user);
          }

          // Check if user exists with same email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // TODO: We could update the user to add the Google ID
              // This would link the Google account to the existing account
              return done(null, user);
            }
          }

          // No existing user found, create a new one
          if (email) {
            // Use type assertion to allow googleId and profilePicture fields
            const newUser = await storage.createUser({
              username: profile.displayName || `user_${profile.id}`,
              email: email,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              googleId: profile.id,
              profilePicture: profile.photos?.[0]?.value
            } as any);

            return done(null, newUser);
          } else {
            // Cannot create user without email
            return done(new Error('Could not retrieve email from Google profile'), undefined);
          }
        } catch (error) {
          console.error('Error during Google authentication', error);
          return done(error instanceof Error ? error : new Error('Unknown error during authentication'), undefined);
        }
      }
    )
  );

  // We'll handle serialize/deserialize in the main auth setup
  // to avoid conflicts with other strategies
};