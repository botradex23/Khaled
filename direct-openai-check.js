/**
 * Simple direct test of OpenAI connectivity
 */

import axios from 'axios';

// For testing without Vite middleware, use a direct port via the direct route
axios.post('http://localhost:5000/api/agent/verify-openai-key')
  .then(response => {
    console.log('Direct OpenAI key verification response:');
    console.log(JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.error('Error verifying OpenAI key:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  });