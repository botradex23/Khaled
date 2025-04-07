import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3500;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files from the root directory
app.use(express.static('.'));

// Serve the download page as the index
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'ml_data_download.html'));
});

// Special route for the ML data files
app.get('/ml_extract/:filename', (req, res) => {
  const { filename } = req.params;
  res.sendFile(join(__dirname, 'ml_extract', filename));
});

// Route for the zip file
app.get('/ml_data_files.zip', (req, res) => {
  res.sendFile(join(__dirname, 'ml_data_files.zip'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ML data download server running at http://localhost:${port}`);
});