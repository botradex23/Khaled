import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { botSchema, pricingPlanSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import okxRouter from "./api/okx";
import bybitRouter from "./api/bybit";
import bitgetRouter from "./api/bitget";

export async function registerRoutes(app: Express): Promise<Server> {
  // OKX API routes
  app.use("/api/okx", okxRouter);
  
  // Bybit API routes
  app.use("/api/bybit", bybitRouter);
  
  // Bitget API routes
  app.use("/api/bitget", bitgetRouter);
  
  // API routes
  
  // Get all bots
  app.get("/api/bots", async (req, res) => {
    const bots = await storage.getAllBots();
    res.json(bots);
  });

  // Get a specific bot by ID
  app.get("/api/bots/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }
    
    const bot = await storage.getBotById(id);
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }
    
    res.json(bot);
  });

  // Get all pricing plans
  app.get("/api/pricing", async (req, res) => {
    const plans = await storage.getAllPricingPlans();
    res.json(plans);
  });

  // Register user
  app.post("/api/register", async (req, res) => {
    // Create schema with additional validations
    const registerSchema = z.object({
      firstName: z.string().min(2, "First name must be at least 2 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
    });

    try {
      // Validate input with our schema
      const data = registerSchema.parse(req.body);
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "User with this email already exists"
        });
      }
      
      // Create the user
      const user = await storage.createUser({
        username: data.email, // Use email as username
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password // In a real app, this would be hashed
      });
      
      // Send success response
      res.status(201).json({ 
        message: "Registration successful",
        user: {
          id: user.id, 
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  // Login user
  app.post("/api/login", async (req, res) => {
    const loginSchema = z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required")
    });

    try {
      // Validate input
      const data = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(data.email);
      
      // Check if user exists and password matches
      if (!user || user.password !== data.password) {
        return res.status(401).json({ 
          message: "Invalid email or password" 
        });
      }
      
      // In a real app, you would set up a session here
      
      // Return success with user data
      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
