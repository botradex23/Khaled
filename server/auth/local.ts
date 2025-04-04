import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import crypto from 'crypto';
import { storage } from '../storage';

/**
 * Setup local authentication strategy with passport
 * This allows users to login with username/email and password
 */
export function setupLocalAuth() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Use email as the username field
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          console.log(`Local auth attempt for email: ${email}`);
          
          // Get user by email
          const user = await storage.getUserByEmail(email);
          
          // If user not found
          if (!user) {
            console.log(`User not found with email: ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // If user has no password (e.g., OAuth-only user)
          if (!user.password) {
            console.log(`User has no password (likely OAuth-only): ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // Compare password using crypto (SHA-256)
          // This assumes passwords are stored using SHA-256 hashing
          const hash = crypto.createHash('sha256').update(password).digest('hex');
          const isMatch = hash === user.password;
          
          if (!isMatch) {
            console.log(`Password mismatch for user: ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // Authentication successful
          console.log(`Local auth successful for user: ${email}`);
          return done(null, user);
        } catch (error) {
          console.error('Error during local authentication:', error);
          return done(error);
        }
      }
    )
  );
}