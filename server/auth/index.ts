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
  // Trust first proxy for secure cookies behind HTTPS
  app.set('trust proxy', 1);
  
  // Setup session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'mudrex-crypto-trading-secret',
      resave: true,
      saveUninitialized: true,
      cookie: {
        secure: 'auto', // 'auto' will use secure cookies when the connection is HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'none'   // Allow cross-site cookies for OAuth callbacks
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
    (req: Request, res: Response, next: NextFunction) => {
      console.log('Google auth request initiated');
      console.log('Redirect URI used in callback:', 'https://19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev/api/auth/google/callback');
      console.log('Current host:', req.headers.host);
      console.log('Current protocol:', req.protocol);
      next();
    },
    passport.authenticate('google', { scope: ['profile', 'email'] }),
    (err: any, req: Request, res: Response, next: NextFunction) => {
      if (err) {
        console.error('Error during Google auth initialization:', err);
        return res.redirect('/login?error=google_auth_failed');
      }
      next();
    }
  );

  app.get(
    '/api/auth/google/callback',
    (req: Request, res: Response, next: NextFunction) => {
      console.log('Google callback received with query params:', req.query);
      console.log('Google callback received with headers:', req.headers);
      console.log('Google callback received with host:', req.headers.host);
      if (req.query.error) {
        console.error('Error returned from Google:', req.query.error);
        return res.redirect(`/login?error=${req.query.error}`);
      }
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('google', (err: Error | null, user: any, info: any) => {
        if (err) {
          console.error('Error during Google authentication:', err);
          return res.redirect('/login?error=google_auth_failed&message=' + encodeURIComponent(err.message));
        }
        
        if (!user) {
          console.error('No user returned from Google auth, info:', info);
          const infoStr = info ? JSON.stringify(info) : 'No info available';
          console.log('Authentication info details:', infoStr);
          return res.redirect('/login?error=google_no_user&info=' + encodeURIComponent(infoStr));
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error('Error during login after Google auth:', loginErr);
            return res.redirect('/login?error=login_failed&message=' + encodeURIComponent(loginErr.message));
          }
          
          console.log('Google authentication successful, user:', user);
          return res.redirect('/login?success=true');
        });
      })(req, res, next);
    }
  );

  // Logout
  app.get('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
        return res.status(500).json({ success: false, error: 'An error occurred during logout' });
      }
      res.json({ success: true, message: 'Successfully logged out' });
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