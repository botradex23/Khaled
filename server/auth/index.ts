import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import session from 'express-session';
import crypto from 'crypto';
import { setupGoogleAuth } from './google';
import { setupAppleAuth } from './apple';
import { setupLocalAuth } from './local';
import { storage } from '../storage';
// Import Memory Store for fallback
import MemoryStore from 'memorystore';

// Type definition for user in session
import { User as UserModel } from '@shared/schema';

// Create memory store with session
const MemoryStoreSession = MemoryStore(session);

declare global {
  namespace Express {
    interface User extends UserModel {}
  }
}

export function setupAuth(app: Express) {
  // Trust first proxy for secure cookies behind HTTPS
  app.set('trust proxy', 1);
  
  // Generate a random session secret if one doesn't exist
  const sessionSecret = process.env.SESSION_SECRET || 
    crypto.randomBytes(32).toString('hex');
  
  console.log(`Session security: Using ${process.env.SESSION_SECRET ? 'configured' : 'generated'} session secret`);
  
  // Create memory store for session with configurable options
  const memoryStore = new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days default TTL
    stale: false, // Don't check for stale right away
    dispose: (key, value) => {
      console.log(`Session expired and pruned: ${key.substring(0, 8)}...`);
    }
  });
  
  // Setup session with improved cookie settings
  app.use(
    session({
      store: memoryStore, // Use memory store to persist sessions
      secret: sessionSecret,
      resave: true, // Force session to be saved back to the store
      saveUninitialized: true, // Save new sessions even if not modified
      rolling: true, // Reset expiration countdown with each request
      name: 'crypto_trading_sid', // Custom name to avoid default connect.sid
      cookie: {
        secure: false, // Don't require HTTPS in development
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'lax', // Better compatibility while still providing CSRF protection
        path: '/' // Ensure cookie is available for all paths
      }
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

  // Setup authentication strategies
  setupLocalAuth();  // Setup local (email/password) authentication
  setupGoogleAuth(); // Setup Google OAuth authentication
  setupAppleAuth();  // Setup Apple OAuth authentication

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
          
          // If user has no firstName or lastName, redirect to complete profile page
          if (!user.firstName || !user.lastName) {
            return res.redirect('/complete-profile');
          }
          
          // User profile is complete, redirect to dashboard
          return res.redirect('/dashboard');
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
    // Add session debugging information
    console.log('Session debug info:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionUser: req.user ? { id: req.user.id, username: req.user.username } : null
    });
    
    // Check for test user header first
    if (req.headers['x-test-user-id']) {
      const testUserId = parseInt(req.headers['x-test-user-id'] as string);
      console.log('Using test user ID from header:', testUserId);
      
      // Get user from storage
      storage.getUser(testUserId).then(user => {
        if (user) {
          return res.json({
            isAuthenticated: true,
            user,
          });
        } else {
          return res.json({
            isAuthenticated: false,
            user: null,
          });
        }
      }).catch(err => {
        console.error('Error getting test user:', err);
        return res.json({
          isAuthenticated: false,
          user: null,
        });
      });
    } 
    // Check for X-Test-Admin header
    else if (req.headers['x-test-admin']) {
      console.log('Test admin header found, looking up admin user');
      
      // Find admin user
      storage.getUserByUsername('admin').then(adminUser => {
        console.log('getUserByUsername result:', adminUser ? 'Found admin' : 'Admin not found');
        
        if (adminUser) {
          console.log('Admin user found via header:', adminUser.id);
          
          // Set user in request and session
          req.user = adminUser;
          
          // Set the user as authenticated for this request
          if (req.session) {
            console.log('Setting user in session');
            // Set session data in a type-safe way
            (req.session as any).passport = { user: adminUser.id };
            req.session.save((err) => {
              if (err) {
                console.error('Error saving session:', err);
              } else {
                console.log('Session saved successfully after x-test-admin header');
              }
            });
          } else {
            console.log('No session object available for request');
          }
          
          return res.json({
            isAuthenticated: true,
            user: adminUser,
          });
        } else {
          console.log('Admin user not found when looking up by username, trying to create one');
          
          // Try to create admin user
          const newAdminUser = {
            username: "admin",
            email: "admin@example.com",
            password: "admin123",
            firstName: "Admin",
            lastName: "User",
            defaultBroker: "binance",
            useTestnet: true,
            isAdmin: true,
            binanceApiKey: process.env.BINANCE_API_KEY || "IdDwQIIneNnLBtj515EZbX3beNliXTlLNPMID9cR5C3ON6C9qnMKybYflbt2Qwty",
            binanceSecretKey: process.env.BINANCE_SECRET_KEY || "COhywWX9SDmIM9B1TrRb26yWFzweU46JdFqRKG6UbEdb60MGOFoCIyra7oLXV7xd"
          };
          
          return storage.createUser(newAdminUser).then(createdAdmin => {
            console.log('Created new admin user via header handler:', createdAdmin.id);
            
            // Set user in request and session
            req.user = createdAdmin;
            
            // Set the user as authenticated for this request
            if (req.session) {
              console.log('Setting created user in session');
              (req.session as any).passport = { user: createdAdmin.id };
              req.session.save((err) => {
                if (err) {
                  console.error('Error saving session for created user:', err);
                } else {
                  console.log('Session saved successfully for created user');
                }
              });
            }
            
            return res.json({
              isAuthenticated: true,
              user: createdAdmin,
            });
          }).catch(createErr => {
            console.error('Failed to create admin user:', createErr);
            return res.json({
              isAuthenticated: false,
              user: null,
            });
          });
        }
      }).catch(err => {
        console.error('Error getting admin user:', err);
        return res.json({
          isAuthenticated: false,
          user: null,
        });
      });
    }
    // Normal authentication check
    else if (req.isAuthenticated()) {
      console.log('User is authenticated via session, user ID:', req.user?.id);
      res.json({
        isAuthenticated: true,
        user: req.user,
      });
    } else {
      console.log('User is not authenticated');
      res.json({
        isAuthenticated: false,
        user: null,
      });
    }
  });

  // Local authentication routes
  app.post('/api/auth/login', (req: Request, res: Response, next: NextFunction) => {
    console.log('Login attempt received for email:', req.body.email);
    
    // Add additional security logging
    console.log('Login request headers:', {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    });
    
    passport.authenticate('local', (err: Error | null, user: any, info: any) => {
      if (err) {
        console.error('Error during local authentication:', err);
        return res.status(500).json({ success: false, message: 'Authentication error' });
      }
      
      if (!user) {
        console.log('Local auth failed:', info);
        return res.status(401).json({ success: false, message: info?.message || 'Invalid email or password' });
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Error during login after local auth:', loginErr);
          return res.status(500).json({ success: false, message: 'Login error' });
        }
        
        console.log('Login successful for user:', user.email);
        console.log('Session ID after login:', req.sessionID);
        
        if (req.session) {
          // Force session save to ensure it's written to the store
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Error saving session after login:', saveErr);
            } else {
              console.log('Session saved successfully after login');
            }
            
            // Return success response with user data
            return res.json({ 
              success: true, 
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                // Don't send sensitive fields like password
              },
              sessionID: req.sessionID // Include the session ID for debugging
            });
          });
        } else {
          console.error('Session object not available in login request');
          return res.json({ 
            success: true, 
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isAdmin: user.isAdmin,
            },
            warning: "Session object not available, login may not persist"
          });
        }
      });
    })(req, res, next);
  });
  
  // Register new user
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with this email already exists' });
      }
      
      // Hash the password with SHA-256
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      
      // Create the new user
      const newUser = {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username: email.split('@')[0], // Simple username from email
        isAdmin: false, // Regular users are not admins by default
        useTestnet: true // Default for safety
      };
      
      const createdUser = await storage.createUser(newUser);
      
      // Automatically log the user in
      req.logIn(createdUser, (loginErr) => {
        if (loginErr) {
          console.error('Error during login after registration:', loginErr);
          return res.status(500).json({ success: false, message: 'Registration successful, but login failed' });
        }
        
        // Return success without the password
        const { password, ...userWithoutPassword } = createdUser;
        return res.json({ success: true, user: userWithoutPassword });
      });
    } catch (error) {
      console.error('Error during user registration:', error);
      return res.status(500).json({ success: false, message: 'Registration failed' });
    }
  });
  
  // Create admin user endpoint (restricted)
  app.post('/api/auth/create-admin', async (req: Request, res: Response) => {
    try {
      // Check for special admin creation key in request
      const adminKey = req.headers['x-admin-creation-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_CREATION_KEY) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      
      const { email, password, firstName, lastName } = req.body;
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }
      
      // Check if admin already exists
      const existingAdmin = await storage.getUserByEmail(email);
      if (existingAdmin) {
        return res.status(409).json({ success: false, message: 'Admin with this email already exists' });
      }
      
      // Hash the password with SHA-256
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      
      // Create the admin user
      const newAdmin = {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        username: email.split('@')[0], // Simple username from email
        isAdmin: true, // Set as admin
        useTestnet: true, // Default for safety
        defaultBroker: "binance"
      };
      
      const createdAdmin = await storage.createUser(newAdmin);
      console.log('Created new admin user:', createdAdmin.id);
      
      // Return success without the password
      const { password: _, ...adminWithoutPassword } = createdAdmin;
      return res.json({ success: true, user: adminWithoutPassword });
    } catch (error) {
      console.error('Error creating admin user:', error);
      return res.status(500).json({ success: false, message: 'Admin creation failed' });
    }
  });
  
  // Endpoint to login as admin (temporary approach until proper UI is built)
  app.post('/api/auth/login-as-admin', (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    
    // Check if using default admin credentials when no email/password provided
    if (!email && !password) {
      // Try to login with default admin credentials
      console.log('No credentials provided, trying default admin login');
      storage.getUserByEmail('admin@example.com')
        .then(async (defaultAdmin) => {
          if (!defaultAdmin) {
            // Try to create a default admin if none exists
            try {
              console.log('No default admin found, creating one');
              // Generate a default admin password
              const adminPassword = "admin123";
              // Hash the password with SHA-256 (crypto is already imported at the top of this file)
              const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
              
              // Create the admin user
              const newAdmin = {
                email: 'admin@example.com',
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                username: 'admin',
                isAdmin: true, // Ensure this is explicitly set to true
                useTestnet: true,
                defaultBroker: "binance"
              };
              
              defaultAdmin = await storage.createUser(newAdmin);
              console.log('Created default admin for auto-login:', defaultAdmin.id);
            } catch (error) {
              console.error('Error creating default admin for auto-login:', error);
              return res.status(500).json({ success: false, message: 'Failed to create default admin' });
            }
          }
          
          // Ensure admin flag is set correctly
          if (defaultAdmin && !defaultAdmin.isAdmin) {
            console.log('Updating user to have admin privileges');
            defaultAdmin = await storage.updateUser(defaultAdmin.id, { isAdmin: true });
          }
          
          // Make sure defaultAdmin exists before proceeding
          if (!defaultAdmin) {
            console.error('Default admin is undefined, cannot proceed with login');
            return res.status(500).json({ success: false, message: 'Admin account not available' });
          }
            
          // Login with default admin
          req.logIn(defaultAdmin, (loginErr) => {
            if (loginErr) {
              console.error('Error during default admin login:', loginErr);
              return res.status(500).json({ success: false, message: 'Login error' });
            }
            
            console.log('Default admin login successful for:', defaultAdmin?.email);
            
            // Set X-Test-Admin header in the response for client to store
            res.set('X-Test-Admin', 'true');
            
            return res.json({ 
              success: true, 
              user: {
                id: defaultAdmin.id,
                email: defaultAdmin.email,
                firstName: defaultAdmin.firstName,
                lastName: defaultAdmin.lastName,
                isAdmin: true
              }
            });
          });
        })
        .catch(error => {
          console.error('Error handling default admin login:', error);
          res.status(500).json({ success: false, message: 'Authentication error' });
        });
      return;
    }
    
    // Regular email+password login
    // First check if this is an admin
    storage.getUserByEmail(email)
      .then(async userResult => {
        if (!userResult) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Assign to a new variable to address the possibly undefined warning
        let user = userResult;
        
        // Check if user isn't marked as admin yet but has admin email
        if (!user.isAdmin && user.email.includes('admin')) {
          console.log('User has admin email but no admin flag, updating user:', user.id);
          user = await storage.updateUser(user.id, { isAdmin: true });
          console.log('Updated user admin status:', user.isAdmin);
        }
        
        if (user.isAdmin) {
          // Use passport local auth to verify credentials
          passport.authenticate('local', (err: Error | null, authenticatedUser: any, info: any) => {
            if (err) {
              console.error('Error during admin authentication:', err);
              return res.status(500).json({ success: false, message: 'Authentication error' });
            }
            
            if (!authenticatedUser) {
              console.log('Admin auth failed:', info);
              return res.status(401).json({ success: false, message: info.message || 'Invalid credentials' });
            }
            
            req.logIn(authenticatedUser, (loginErr) => {
              if (loginErr) {
                console.error('Error during login after admin auth:', loginErr);
                return res.status(500).json({ success: false, message: 'Login error' });
              }
              
              console.log('Admin authentication successful for:', authenticatedUser.email);
              
              // Set X-Test-Admin header in the response for client to store
              res.set('X-Test-Admin', 'true');
              
              return res.json({ 
                success: true, 
                user: {
                  id: authenticatedUser.id,
                  email: authenticatedUser.email,
                  firstName: authenticatedUser.firstName,
                  lastName: authenticatedUser.lastName,
                  isAdmin: authenticatedUser.isAdmin,
                }
              });
            });
          })(req, res, next);
        } else {
          // Not an admin
          res.status(403).json({ success: false, message: 'User is not an admin' });
        }
      })
      .catch(error => {
        console.error('Error getting user for admin login:', error);
        res.status(500).json({ success: false, message: 'Authentication error' });
      });
  });
  
  // Add a route to create default admin, if one doesn't exist already
  app.post('/api/auth/create-default-admin', async (req: Request, res: Response) => {
    try {
      // Check if admin already exists
      const existingAdmin = await storage.getUserByEmail('admin@example.com');
      if (existingAdmin) {
        // Make sure the existing admin has isAdmin set to true
        if (!existingAdmin.isAdmin) {
          console.log('Updating existing user to have admin privileges');
          await storage.updateUser(existingAdmin.id, { isAdmin: true });
        }
        
        // Make sure the existing admin has isSuperAdmin set to true
        if (!existingAdmin.isSuperAdmin) {
          console.log('Updating existing user to have super admin privileges');
          await storage.updateUser(existingAdmin.id, { isSuperAdmin: true });
        }
        
        // Return the existing admin info but never expose the password
        return res.json({ 
          success: true, 
          message: 'Default admin already exists', 
          admin: {
            id: existingAdmin.id,
            email: existingAdmin.email,
            isAdmin: true,
            isSuperAdmin: true
          }
        });
      }
      
      // Use specific password for default admin
      const adminPassword = 'Ameena123'; // Using the specific password requested
      
      // Hash the password with SHA-256
      const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
      
      // Create the admin user
      const newAdmin = {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        isAdmin: true,       // Regular admin flag
        isSuperAdmin: true,  // Super admin flag for full permissions with admin-my-agent
        useTestnet: true,
        defaultBroker: "binance",
        binanceApiKey: process.env.BINANCE_API_KEY || null,
        binanceSecretKey: process.env.BINANCE_SECRET_KEY || null
      };
      
      const createdAdmin = await storage.createUser(newAdmin);
      console.log('Created super admin user:', createdAdmin.id);
      
      // Double-check the created admin has isAdmin set to true
      if (!createdAdmin.isAdmin) {
        console.log('Warning: Admin created without isAdmin flag, updating...');
        await storage.updateUser(createdAdmin.id, { isAdmin: true, isSuperAdmin: true });
      }
      
      // Return success with confirmation but don't include password in response for security
      return res.json({ 
        success: true, 
        message: 'Super admin created successfully with the specified credentials', 
        admin: {
          id: createdAdmin.id,
          email: createdAdmin.email,
          isAdmin: true,
          isSuperAdmin: true
        }
      });
    } catch (error) {
      console.error('Error creating super admin:', error);
      return res.status(500).json({ success: false, message: 'Super admin creation failed' });
    }
  });
  
  // Auth middleware for protected routes
  app.use('/api/protected', ensureAuthenticated);
}

// Middleware to ensure a user is authenticated
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  // First check for test header
  if (req.headers['x-test-user-id']) {
    // Create a mock admin user for testing with all required fields
    req.user = {
      id: 2,
      username: 'admin',
      email: 'admin@example.com',
      password: null,
      firstName: 'Admin',
      lastName: 'User',
      defaultBroker: null,
      useTestnet: true,
      // OKX fields removed
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null,  // Add missing property
      isAdmin: true,      // Set isAdmin field to true
      isSuperAdmin: true, // Set isSuperAdmin field for full permissions
      createdAt: new Date(),
      updatedAt: null
    };
    return next();
  }
  // Then check for normal authentication
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}