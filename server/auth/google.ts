import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';

// Initialize Google OAuth strategy
export const setupGoogleAuth = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
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
            const newUser = await storage.createUser({
              username: profile.displayName || `user_${profile.id}`,
              email: email,
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              googleId: profile.id,
              profilePicture: profile.photos?.[0]?.value
            });
            
            return done(null, newUser);
          } else {
            // Cannot create user without email
            return done(new Error('Could not retrieve email from Google profile'), undefined);
          }
        } catch (error) {
          console.error('Error during Google authentication', error);
          return done(error, undefined);
        }
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};