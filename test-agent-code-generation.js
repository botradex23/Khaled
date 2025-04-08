/**
 * Test OpenAI Agent Code Generation
 * 
 * This script tests the OpenAI agent's ability to generate a functional
 * JavaScript utility file based on requirements.
 */

import { promises as fs } from 'fs';
import { config } from 'dotenv';
import https from 'https';

// Load environment variables
config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUTPUT_FILE = 'generateCurrencyUtility.js';

// Function to call OpenAI API
async function callOpenAI(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 2048
    });
    
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode === 200) {
            resolve(parsedData.choices[0].message.content);
          } else {
            reject(new Error(`OpenAI API returned status code ${res.statusCode}: ${JSON.stringify(parsedData)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Error calling OpenAI API: ${error.message}`));
    });
    
    req.write(data);
    req.end();
  });
}

// Function to write generated code to a file
async function writeGeneratedCode(filename, code) {
  try {
    await fs.writeFile(filename, code, 'utf8');
    console.log(`✅ Successfully wrote generated code to ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Error writing generated code: ${error.message}`);
    return false;
  }
}

// Main function to generate and save the utility
async function generateCurrencyUtility() {
  console.log('======================================');
  console.log('OpenAI Agent Code Generation Test');
  console.log('======================================');
  
  const prompt = `
Create a JavaScript utility file called formatCurrency.js that exports the following functions:

1. formatCurrency(amount, currency = 'USD', locale = 'en-US') - Formats a number as a currency string
   - amount: number - The amount to format
   - currency: string - The currency code (default: 'USD')
   - locale: string - The locale to use for formatting (default: 'en-US')
   - Returns: string - The formatted currency string

2. parseCurrency(currencyString, locale = 'en-US') - Parses a currency string back to a number
   - currencyString: string - The currency string to parse
   - locale: string - The locale to use for parsing (default: 'en-US')
   - Returns: number - The parsed number value

The utility should handle different currency symbols, decimal separators, and thousands separators based on the locale.

Make sure the code is well-commented, handles edge cases, and includes JSDoc comments for each function.
Also include several usage examples as comments at the end of the file.

Export the functions using ES modules format.
`;

  const systemPrompt = `
You are an expert JavaScript developer tasked with creating high-quality, well-documented utility functions.
Provide only the code with no additional explanation outside of code comments.
The code should be ready to use without modification.
`;

  try {
    console.log('Generating currency utility code...');
    const generatedCode = await callOpenAI(prompt, systemPrompt);
    
    if (generatedCode) {
      console.log('✅ Code generation successful');
      
      // Extract just the code if the model included additional text
      let finalCode = generatedCode;
      if (generatedCode.includes('```javascript')) {
        finalCode = generatedCode.split('```javascript')[1].split('```')[0].trim();
      } else if (generatedCode.includes('```js')) {
        finalCode = generatedCode.split('```js')[1].split('```')[0].trim();
      } else if (generatedCode.includes('```')) {
        finalCode = generatedCode.split('```')[1].split('```')[0].trim();
      }
      
      // Save the code to a file
      await writeGeneratedCode(OUTPUT_FILE, finalCode);
      
      console.log('\nGenerated code preview:');
      console.log('----------------------------------------');
      // Show just the first 20 lines of the code
      const codeLines = finalCode.split('\n');
      const previewLines = codeLines.slice(0, Math.min(20, codeLines.length));
      console.log(previewLines.join('\n'));
      
      if (codeLines.length > 20) {
        console.log('... (truncated for brevity)');
      }
      
      console.log('----------------------------------------');
    } else {
      console.error('❌ Failed to generate code');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  console.log('\n======================================');
}

// Run the test
generateCurrencyUtility().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
});