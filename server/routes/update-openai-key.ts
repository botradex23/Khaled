import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ensureAuthenticated } from '../auth';

const router = Router();

// Middleware to ensure the user is an admin
function ensureAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user && (req.user as any).isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
}

// Update OpenAI API key
router.post('/update-openai-key', ensureAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API key is required' 
      });
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-') || apiKey.length < 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid API key format. OpenAI API keys typically start with "sk-" and are at least 30 characters long.' 
      });
    }
    
    // Read the current .env file
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (error) {
      console.error('Error reading .env file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to read environment configuration' 
      });
    }
    
    // Update or add the OPENAI_API_KEY
    const keyExists = envContent.includes('OPENAI_API_KEY=');
    
    let updatedContent = '';
    if (keyExists) {
      // Replace existing key
      const keyRegex = /OPENAI_API_KEY=.*/;
      updatedContent = envContent.replace(keyRegex, `OPENAI_API_KEY=${apiKey}`);
    } else {
      // Add new key
      updatedContent = envContent + `\nOPENAI_API_KEY=${apiKey}\n`;
    }
    
    // Write updated content back to .env file
    try {
      fs.writeFileSync(envPath, updatedContent);
      
      // Update the current environment variable
      process.env.OPENAI_API_KEY = apiKey;
      
      return res.json({ 
        success: true, 
        message: 'OpenAI API key updated successfully' 
      });
    } catch (error) {
      console.error('Error updating .env file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update environment configuration' 
      });
    }
  } catch (error) {
    console.error('Error updating OpenAI API key:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;