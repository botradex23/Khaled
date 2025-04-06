// Simple HTTP server to test port access
import http from 'http';

const server = http.createServer((req, res) => {
  console.log(`Received request for ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!');
});

const port = 5001;
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://0.0.0.0:${port}/`);
});