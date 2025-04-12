```javascript
// openai-service.js

// Import necessary modules
const axios = require('axios');

// OpenAI Service configuration
const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1'
};

// Axios instance for OpenAI API requests
const openaiApi = axios.create({
    baseURL: openaiConfig.baseUrl,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiConfig.apiKey}`
    }
});

/**
 * Generate text using OpenAI's language model
 * @param {string} prompt - The prompt text to generate the completion for.
 * @param {string} model - The OpenAI model to use for text generation (e.g., 'text-davinci-003').
 * @param {number} maxTokens - The maximum number of tokens to generate in the completion.
 * @param {number} [temperature=0.7] - Controls the randomness of the generated output.
 * @returns {Promise<string>} - A promise that resolves to the generated text completion.
 */
async function generateText(prompt, model, maxTokens, temperature = 0.7) {
    try {
        const response = await openaiApi.post('/completions', {
            model,
            prompt,
            max_tokens: maxTokens,
            temperature
        });
        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error generating text:', error.message, error.response.data);
        throw new Error('Failed to generate text completion.');
    }
}

/**
 * Generate multiple text completions using OpenAI's language model
 * @param {string} prompt - The prompt text to generate the completion for.
 * @param {string} model - The OpenAI model to use for text generation.
 * @param {number} maxTokens - The maximum number of tokens to generate in the completion.
 * @param {number} n - The number of completions to generate.
 * @param {number} [temperature=0.7] - Controls the randomness of the generated output.
 * @returns {Promise<string[]>} - A promise that resolves to an array of generated text completions.
 */
async function generateMultipleTexts(prompt, model, maxTokens, n, temperature = 0.7) {
    try {
        const response = await openaiApi.post('/completions', {
            model,
            prompt,
            max_tokens: maxTokens,
            n,
            temperature
        });
        return response.data.choices.map(choice => choice.text.trim());
    } catch (error) {
        console.error('Error generating multiple texts:', error.message, error.response.data);
        throw new Error('Failed to generate multiple text completions.');
    }
}

// Export functions for use in other modules
module.exports = {
    generateText,
    generateMultipleTexts
};
```
