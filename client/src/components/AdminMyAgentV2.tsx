import { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { useAgent } from '../hooks/use-agent';
import { ScrollArea } from "./ui/scroll-area";

export default function AdminMyAgentV2() {
  const [prompt, setPrompt] = useState('');
  const [responseText, setResponseText] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  
  // Use our new agent hook
  const { 
    isLoading, 
    error, 
    response, 
    checkAgentStatus, 
    sendChatMessage, 
    performTask, 
    searchContent 
  } = useAgent();

  // Check agent status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      const isAvailable = await checkAgentStatus();
      setAgentStatus(isAvailable ? 'online' : 'offline');
    };
    
    checkStatus();
  }, []);

  // Format response when it changes
  useEffect(() => {
    if (response) {
      if (typeof response === 'string') {
        setResponseText(response);
        addAssistantMessage(response);
      } else if (response.content) {
        setResponseText(response.content);
        addAssistantMessage(response.content);
      } else if (response.message) {
        setResponseText(response.message);
        addAssistantMessage(response.message);
      } else {
        const formattedResponse = JSON.stringify(response, null, 2);
        setResponseText(formattedResponse);
        addAssistantMessage(formattedResponse);
      }
    }
  }, [response]);

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
  };

  const addAssistantMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  };

  const handleChatSubmit = async () => {
    if (!prompt.trim()) return;
    
    addUserMessage(prompt);
    
    const result = await sendChatMessage(
      prompt,
      'You are a helpful AI assistant specializing in cryptocurrency trading and market analysis.'
    );
    
    if (!result.success) {
      console.error('Chat submission failed:', result.error);
      addAssistantMessage(`Error: ${result.error || 'Failed to communicate with the agent'}`);
    }
    
    setPrompt('');
  };

  const runAgentTask = async () => {
    if (!prompt.trim()) return;
    
    addUserMessage(`Task: ${prompt}`);
    
    const result = await performTask(prompt);
    
    if (!result.success) {
      console.error('Task execution failed:', result.error);
      addAssistantMessage(`Error: ${result.error || 'Failed to execute the task'}`);
    }
    
    setPrompt('');
  };
  
  const runContentSearch = async () => {
    if (!prompt.trim()) return;
    
    addUserMessage(`Search: ${prompt}`);
    
    const result = await searchContent(prompt);
    
    if (!result.success) {
      console.error('Content search failed:', result.error);
      addAssistantMessage(`Error: ${result.error || 'Failed to search content'}`);
    }
    
    setPrompt('');
  };

  const clearConversation = () => {
    setPrompt('');
    setResponseText(null);
    setMessages([]);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Trading Assistant</h1>
      
      {/* Agent Status Alerts */}
      {agentStatus === 'checking' && (
        <Alert className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Checking Assistant Status</AlertTitle>
          <AlertDescription>
            Verifying the availability of the AI assistant...
          </AlertDescription>
        </Alert>
      )}

      {agentStatus === 'offline' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Assistant Unavailable</AlertTitle>
          <AlertDescription>
            The AI assistant is currently unavailable. Please check server status.
          </AlertDescription>
        </Alert>
      )}

      {agentStatus === 'online' && (
        <Alert className="mb-4" variant="default">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Assistant Ready</AlertTitle>
          <AlertDescription>
            AI assistant is connected and ready to help with your trading questions.
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full mx-auto">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Trading Assistant</CardTitle>
            <Badge 
              variant={agentStatus === 'online' ? 'default' : 'destructive'}
              className="ml-2"
            >
              {agentStatus === 'checking' ? 'Checking...' : 
               agentStatus === 'online' ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <CardDescription>
            Ask questions about trading strategies, market analysis, or get help with the platform.
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="chat" onValueChange={setActiveTab} className="w-full">
          <TabsList className="mx-6 mb-2">
            <TabsTrigger value="chat">Chat Mode</TabsTrigger>
            <TabsTrigger value="task">Task Mode</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px] pr-4 mb-4">
              {messages.map((msg, index) => (
                <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'}`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
            </ScrollArea>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Textarea
              placeholder={
                activeTab === 'chat' 
                  ? "Ask about trading strategies, technical analysis, or market trends..." 
                  : activeTab === 'task'
                  ? "Specify a task like 'Analyze recent BTC price movements' or 'Compare trading strategies'"
                  : "Search for content in project files, e.g., 'binance api error handling'"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-y"
              disabled={isLoading || agentStatus !== 'online'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (activeTab === 'chat') {
                    handleChatSubmit();
                  } else if (activeTab === 'task') {
                    runAgentTask();
                  } else {
                    runContentSearch();
                  }
                }
              }}
            />
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={clearConversation}>
              Clear
            </Button>
            <Button 
              onClick={
                activeTab === 'chat' 
                  ? handleChatSubmit 
                  : activeTab === 'task' 
                  ? runAgentTask 
                  : runContentSearch
              } 
              disabled={isLoading || !prompt.trim() || agentStatus !== 'online'}
            >
              {isLoading 
                ? 'Processing...' 
                : activeTab === 'chat' 
                ? 'Send' 
                : activeTab === 'task' 
                ? 'Execute Task' 
                : 'Search Content'}
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
}