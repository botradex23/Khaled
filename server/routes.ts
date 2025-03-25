import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { botSchema, pricingPlanSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Register user (simplified)
  app.post("/api/register", async (req, res) => {
    const registerSchema = z.object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8)
    });

    try {
      const data = registerSchema.parse(req.body);
      const user = await storage.createUser({
        username: data.email,
        password: data.password
      });
      
      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
