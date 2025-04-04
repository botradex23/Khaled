import express from 'express';
import agentRoutes from './routes/my-agent';

const app = express();
const PORT = 5002;

app.use(express.json());
app.use('/', agentRoutes);

app.listen(PORT, () => {
  console.log(`✅ Agent is running on http://localhost:${PORT}`);
});