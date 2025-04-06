// Simple HTTP server to test Node.js
import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:5000/');
});