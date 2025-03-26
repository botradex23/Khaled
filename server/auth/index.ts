import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import session from 'express-session';
import { setupGoogleAuth } from './google';
import { setupAppleAuth } from './apple';
import { storage } from '../storage';

// Type definition for user in session
import { User as UserModel } from '@shared/schema';

declare global {
  namespace Express {
    interface User extends UserModel {}
  }
}

export function setupAuth(app: Express) {
  // Setup session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'mudrex-crypto-trading-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure user serialization/deserialization
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error instanceof Error ? error : new Error('Error deserializing user'), null);
    }
  });

  // Setup OAuth providers
  setupGoogleAuth();
  setupAppleAuth();

  // Register auth routes
  registerAuthRoutes(app);
}

function registerAuthRoutes(app: Express) {
  // Google Auth
  app.get(
    '/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Logout
  app.get('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
      }
      res.redirect('/');
    });
  });

  // Get current user
  app.get('/api/auth/user', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json({
        isAuthenticated: true,
        user: req.user,
      });
    } else {
      res.json({
        isAuthenticated: false,
        user: null,
      });
    }
  });

  // Auth middleware for protected routes
  app.use('/api/protected', ensureAuthenticated);
}

// Middleware to ensure a user is authenticated
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}