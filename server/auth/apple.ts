import passport from 'passport';
import { Strategy as AppleStrategy } from 'passport-apple';
import { User } from '@shared/schema';
import { storage } from '../storage';

// Initialize Apple OAuth strategy
export const setupAppleAuth = () => {
  // Check if all required credentials are available
  if (
    !process.env.APPLE_CLIENT_ID ||
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_KEY_ID ||
    !process.env.APPLE_PRIVATE_KEY
  ) {
    console.warn('Apple auth credentials not fully configured - Apple login will not work');
    return;
  }

  // Configure Apple strategy
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY,
        callbackURL: '/api/auth/apple/callback',
        scope: ['name', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Profile will contain 'id' which is the Apple user ID
          // First check if user exists with this Apple ID
          let user = await storage.getUserByAppleId(profile.id);
          
          if (user) {
            // User found, return the user
            return done(null, user);
          }
          
          // Check if user exists with same email
          const email = profile.email;
          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // User exists, but hasn't used Apple login before
              // TODO: We could update the user to add the Apple ID
              return done(null, user);
            }
          }
          
          // No existing user found, create a new one
          if (email) {
            // Extract name from profile if available
            const firstName = profile.name?.firstName || '';
            const lastName = profile.name?.lastName || '';
            
            const newUser = await storage.createUser({
              username: email, // Use email as username since Apple ID might not have a display name
              email: email,
              firstName: firstName,
              lastName: lastName,
              appleId: profile.id,
              profilePicture: undefined // Apple doesn't provide profile pictures
            });
            
            return done(null, newUser);
          } else {
            // Cannot create user without email
            return done(new Error('Could not retrieve email from Apple profile'), undefined);
          }
        } catch (error) {
          console.error('Error during Apple authentication', error);
          return done(error instanceof Error ? error : new Error('Unknown error during authentication'), undefined);
        }
      }
    )
  );
};