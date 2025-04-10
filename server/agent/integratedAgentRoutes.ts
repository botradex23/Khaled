import express from 'express';
import {
  analyzeCodeFiles,
  readFile,
  writeFile,
  suggestCodeChanges,
  validateOpenAIKey,
} from '../services/openaiService';

const router = express.Router();

// Middleware to validate admin
router.use((req, res, next) => {
  const isAdmin = req.headers['x-test-admin'] === 'true';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Unauthorized - admin access required' });
  }
  next();
});

// Health check
router.get('/health', async (req, res) => {
  const result = await validateOpenAIKey();
  res.json(result);
});

// Read file
router.post('/read-file', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  const content = await readFile(filePath);
  if (content === null) {
    return res.status(404).json({ error: 'File not found or unreadable' });
  }

  res.json({ content });
});

// Write file
router.post('/write-file', async (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'filePath and content are required' });
  }

  const success = await writeFile(filePath, content);
  if (!success) {
    return res.status(500).json({ error: 'Failed to write file' });
  }

  res.json({ success: true });
});

// Analyze multiple code files
router.post('/analyze', async (req, res) => {
  const { task, filePaths } = req.body;
  if (!task || !filePaths || !Array.isArray(filePaths)) {
    return res.status(400).json({ error: 'task and filePaths are required' });
  }

  const analysis = await analyzeCodeFiles(task, filePaths);
  res.json({ result: analysis });
});

// Suggest code changes
router.post('/suggest', async (req, res) => {
  const { task, filePath } = req.body;
  if (!task || !filePath) {
    return res.status(400).json({ error: 'task and filePath are required' });
  }

  const suggestion = await suggestCodeChanges(task, filePath);
  res.json({ result: suggestion });
});

export default router;