// server/agent/project-analyzer.ts
import path from 'path';
import fs from 'fs/promises';
import { getChatCompletion } from './openai-service';

export async function analyzeEntireProject(rootDir: string, task: string): Promise<string | null> {
  const supportedExtensions = ['.ts', '.tsx', '.js', '.json'];

  async function listFilesRecursive(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(fullPath);
      else if (supportedExtensions.includes(path.extname(entry.name))) return [fullPath];
      else return [];
    }));
    return files.flat();
  }

  async function loadFilesContent(files: string[]): Promise<string> {
    const contents = await Promise.all(
      files.map(async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return `File: ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
        } catch {
          return '';
        }
      })
    );
    return contents.filter(Boolean).join('\n');
  }

  try {
    const allFiles = await listFilesRecursive(rootDir);
    const input = await loadFilesContent(allFiles);
    const prompt = `
Task: ${task}
Please analyze the following project files and report any problems, bugs, inconsistencies, or bad practices:
${input}
    `;
    return await getChatCompletion(prompt, 'You are a senior developer reviewing a full TypeScript backend project.');
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}