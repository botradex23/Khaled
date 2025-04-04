// server/utils/openai.ts

let openaiApiKey: string | null = null;

export function initializeOpenAI() {
  console.log('Initializing OpenAI API key from environment...');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set in environment variables.');
    return null;
  }

  openaiApiKey = apiKey;
  console.log('✅ OpenAI API key found:', apiKey.slice(0, 5) + '...');
  return true;
}

export function getOpenAIApiKey() {
  return openaiApiKey;
}