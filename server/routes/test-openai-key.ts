import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Test OpenAI API key by making a minimal API call
router.get('/test-openai-key', async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Test OpenAI API key endpoint called, key present:', !!apiKey);
  
  if (!apiKey) {
    console.log('OpenAI API Key is missing in test-openai-key endpoint');
    return res.json({ 
      success: false, 
      message: 'OpenAI API Key is not set. Please configure the OPENAI_API_KEY environment variable.' 
    });
  }
  
  try {
    // Make a minimal request to OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo", // Use a simpler model for testing
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello" }
        ],
        max_tokens: 10, // Minimal response to save tokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return res.json({ 
      success: true, 
      message: 'OpenAI API key is valid',
      response: response.data.choices[0]?.message?.content
    });
  } catch (error: any) {
    console.error('Error testing OpenAI API key:', error.response?.data || error.message);
    return res.json({ 
      success: false, 
      message: 'Error testing OpenAI API key',
      error: error.response?.data?.error?.message || error.message || 'Unknown error'
    });
  }
});

export default router;