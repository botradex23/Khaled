import express from 'express';
import { agent } from '../controllers';
import { logInfo, logError } from '../utils/logger';

const router = express.Router();

/**
 * Log a message with the specified level
 * @param message Message to log
 * @param level Log level
 */
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  if (level === 'ERROR') {
    logError('Agent Routes', message);
  } else {
    logInfo('Agent Routes', message);
  }
}

/**
 * Get the agent health status
 */
router.get('/health', async (req, res) => {
  try {
    const status = agent.getAgentStatus();
    res.json(status);
  } catch (error: any) {
    log(`Error in health check: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Verify the OpenAI API key
 */
router.get('/verify-openai-key', async (req, res) => {
  try {
    const result = await agent.verifyOpenAIKey();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    log(`Error verifying OpenAI API key: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get a chat response from the agent
 */
router.post('/chat', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    log(`Processing chat request: ${prompt.substring(0, 50)}...`);
    const result = await agent.getAgentChatResponse(prompt, systemPrompt);
    res.json(result);
  } catch (error: any) {
    log(`Error in chat endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Execute a task with the agent
 */
router.post('/task', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    log(`Processing task request: ${prompt.substring(0, 50)}...`);
    const result = await agent.executeAgentTask(prompt, systemPrompt);
    res.json(result);
  } catch (error: any) {
    log(`Error in task endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Execute a file operation
 */
router.post('/file-op', async (req, res) => {
  try {
    const { operation, params } = req.body;
    if (!operation) return res.status(400).json({ success: false, message: 'Operation is required' });

    log(`Processing file operation: ${operation}`);
    const result = await agent.executeFileOperation(operation, params);
    res.json(result);
  } catch (error: any) {
    log(`Error in file operation endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Search for files in a directory
 */
router.post('/search-files', async (req, res) => {
  try {
    const { directory, options } = req.body;
    if (!directory) return res.status(400).json({ success: false, message: 'Directory is required' });

    const result = await agent.executeFileOperation('listFilesRecursive', { directory, options });
    res.json(result);
  } catch (error: any) {
    log(`Error in search files endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Search for content in files
 */
router.post('/search-content', async (req, res) => {
  try {
    const { text, options } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    const result = await agent.executeFileOperation('findFilesContainingText', { text, options });
    res.json(result);
  } catch (error: any) {
    log(`Error in search content endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Analyze the entire project
 */
router.post('/analyze-project', async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) return res.status(400).json({ success: false, message: 'Task is required' });

    const result = await agent.analyzeEntireProject(task);
    res.json({ success: true, result });
  } catch (error: any) {
    log(`Error in analyze-project endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Smart analyze and edit functionality
 */
router.post('/smart-edit', async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) return res.status(400).json({ success: false, message: 'Task is required' });

    log(`Executing smartAnalyzeAndEdit for task: ${task}`);
    const result = await agent.smartAnalyzeAndEdit(task);
    res.json(result);
  } catch (error: any) {
    log(`Error in smart-edit endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get the agent status
 */
router.get('/status', (req, res) => {
  try {
    res.json({
      status: 'ok',
      message: 'Integrated agent routes are registered and active',
      timestamp: new Date().toISOString(),
      integratedMode: true
    });
  } catch (error: any) {
    log(`Error in status endpoint: ${error.message}`, 'ERROR');
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;