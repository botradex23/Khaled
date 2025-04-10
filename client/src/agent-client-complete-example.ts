/**
 * Complete Agent Client Example
 * 
 * This example demonstrates all the capabilities of the AgentApiClient
 * for direct file operations and OpenAI API access, bypassing the Vite middleware.
 */

import { AgentApiClient } from './agent-client';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Configure environment
config();

/**
 * Examples class with all agent client features
 */
class AgentClientExamples {
  private client: AgentApiClient;
  private outputDir: string;
  
  /**
   * Initialize the examples
   */
  constructor() {
    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    // Create the client
    this.client = new AgentApiClient(apiKey);
    
    // Set up output directory
    this.outputDir = path.join(process.cwd(), 'agent-examples-output');
    this.ensureOutputDir();
  }
  
  /**
   * Ensure the output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`Created output directory: ${this.outputDir}`);
    }
  }
  
  /**
   * Example 1: Reading files
   */
  async readFilesExample(): Promise<void> {
    console.log('\n--- Example 1: Reading Files ---');
    
    // Example 1.1: Read a markdown file
    const markdownFile = 'README.md';
    console.log(`Reading ${markdownFile}...`);
    
    const markdownResult = await this.client.readFile(markdownFile);
    if (markdownResult.success) {
      const preview = markdownResult.content?.substring(0, 150).replace(/\n/g, ' ') + '...';
      console.log(`✅ Successfully read ${markdownFile} (${markdownResult.content?.length} bytes)`);
      console.log(`Preview: ${preview}`);
    } else {
      console.error(`❌ Failed to read ${markdownFile}: ${markdownResult.message}`);
    }
    
    // Example 1.2: Read a non-existent file to demonstrate error handling
    const nonExistentFile = 'does-not-exist.txt';
    console.log(`\nReading non-existent file ${nonExistentFile}...`);
    
    const errorResult = await this.client.readFile(nonExistentFile);
    if (!errorResult.success) {
      console.log(`✅ Correctly handled non-existent file: ${errorResult.message}`);
    } else {
      console.error('❌ Expected an error but got success');
    }
  }
  
  /**
   * Example 2: Writing files
   */
  async writeFilesExample(): Promise<void> {
    console.log('\n--- Example 2: Writing Files ---');
    
    // Example 2.1: Write a simple text file
    const simpleFile = path.join(this.outputDir, 'simple-output.txt');
    const simpleContent = `This is a simple text file
Created at: ${new Date().toISOString()}
By: AgentClientExamples`;
    
    console.log(`Writing to ${simpleFile}...`);
    const simpleResult = await this.client.writeFile(simpleFile, simpleContent);
    
    if (simpleResult.success) {
      console.log(`✅ Successfully wrote to ${simpleFile}`);
      console.log(`Content length: ${simpleContent.length} bytes`);
    } else {
      console.error(`❌ Failed to write to ${simpleFile}: ${simpleResult.message}`);
    }
    
    // Example 2.2: Write a JSON file
    const jsonFile = path.join(this.outputDir, 'config.json');
    const jsonContent = JSON.stringify({
      name: 'agent-client-example',
      version: '1.0.0',
      description: 'Example configuration file',
      settings: {
        debugMode: true,
        logLevel: 'info',
        maxRetries: 3,
        timeoutMs: 5000
      },
      created: new Date().toISOString()
    }, null, 2);
    
    console.log(`\nWriting JSON to ${jsonFile}...`);
    const jsonResult = await this.client.writeFile(jsonFile, jsonContent);
    
    if (jsonResult.success) {
      console.log(`✅ Successfully wrote JSON to ${jsonFile}`);
      
      // Verify JSON by reading it back
      const readResult = await this.client.readFile(jsonFile);
      if (readResult.success) {
        const parsed = JSON.parse(readResult.content || '{}');
        console.log('Verified JSON structure:', Object.keys(parsed).join(', '));
      }
    } else {
      console.error(`❌ Failed to write JSON to ${jsonFile}: ${jsonResult.message}`);
    }
  }
  
  /**
   * Example 3: Listing directory contents
   */
  async listDirectoriesExample(): Promise<void> {
    console.log('\n--- Example 3: Listing Directories ---');
    
    // Example 3.1: List files in the src directory
    const srcDir = 'src';
    console.log(`Listing files in ${srcDir}...`);
    
    const srcResult = await this.client.listFiles(srcDir);
    if (srcResult.success && srcResult.files) {
      console.log(`✅ Found ${srcResult.files.length} items in ${srcDir}`);
      
      // Count files vs directories
      const fileCount = srcResult.files.filter(f => !f.isDirectory).length;
      const dirCount = srcResult.files.filter(f => f.isDirectory).length;
      console.log(`Files: ${fileCount}, Directories: ${dirCount}`);
      
      // Show the first 5 items
      console.log('First 5 items:');
      srcResult.files.slice(0, 5).forEach(item => {
        console.log(`- ${item.name} (${item.isDirectory ? 'Directory' : 'File'})`);
      });
    } else {
      console.error(`❌ Failed to list ${srcDir}: ${srcResult.message}`);
    }
    
    // Example 3.2: List files in a non-existent directory
    const nonExistentDir = 'does-not-exist-dir';
    console.log(`\nListing files in non-existent directory ${nonExistentDir}...`);
    
    const errorResult = await this.client.listFiles(nonExistentDir);
    if (!errorResult.success) {
      console.log(`✅ Correctly handled non-existent directory: ${errorResult.message}`);
    } else {
      console.error('❌ Expected an error but got success');
    }
  }
  
  /**
   * Example 4: Using OpenAI
   */
  async openAIExample(): Promise<void> {
    console.log('\n--- Example 4: OpenAI Integration ---');
    
    // Example 4.1: Simple completion
    const simplePrompt = 'Explain in one paragraph what an API client is.';
    console.log('Getting simple completion...');
    console.log(`Prompt: ${simplePrompt}`);
    
    const simpleResult = await this.client.getChatCompletion(
      simplePrompt,
      'You are a technical documentation expert. Be concise and clear.'
    );
    
    if (simpleResult.success) {
      console.log('✅ OpenAI Response:');
      console.log(simpleResult.completion);
    } else {
      console.error(`❌ Failed to get completion: ${simpleResult.message}`);
    }
    
    // Example 4.2: Generating code
    const codePrompt = 'Write a TypeScript function that takes an array of numbers and returns the average.';
    console.log('\nGenerating code with OpenAI...');
    console.log(`Prompt: ${codePrompt}`);
    
    const codeResult = await this.client.getChatCompletion(
      codePrompt,
      'You are a skilled TypeScript developer. Provide clean, well-documented code.'
    );
    
    if (codeResult.success) {
      console.log('✅ Generated Code:');
      console.log(codeResult.completion);
      
      // Save the generated code to a file
      const codeFile = path.join(this.outputDir, 'generated-function.ts');
      await this.client.writeFile(codeFile, codeResult.completion || '');
      console.log(`Code saved to ${codeFile}`);
    } else {
      console.error(`❌ Failed to generate code: ${codeResult.message}`);
    }
  }
  
  /**
   * Run all examples
   */
  async runAll(): Promise<void> {
    console.log('=== Agent Client Complete Examples ===');
    console.log('Running all examples to demonstrate the direct agent client capabilities');
    
    try {
      await this.readFilesExample();
      await this.writeFilesExample();
      await this.listDirectoriesExample();
      await this.openAIExample();
      
      console.log('\n=== All Examples Completed Successfully ===');
      console.log(`Output files are in: ${this.outputDir}`);
    } catch (error) {
      console.error('Error running examples:', error);
    }
  }
}

// Only execute if run directly
if (import.meta.url === new URL(import.meta.url).href) {
  console.log('Running Agent Client Complete Example...');
  const examples = new AgentClientExamples();
  examples.runAll().catch(console.error);
}