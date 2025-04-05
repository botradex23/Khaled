import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export default function AdminMyAgent() {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [agentHealth, setAgentHealth] = useState<'loading' | 'available' | 'unavailable'>('loading');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [currentDirectory, setCurrentDirectory] = useState<string>('./');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check agent health on load
  useEffect(() => {
    checkAgentHealth();
    loadDirectoryFiles('./');
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAgentHealth = async () => {
    setAgentHealth('loading');
    try {
      const response = await fetch('/api/agent/direct-health', {
        headers: {
          'Accept': 'application/json',
          'X-Test-Admin': 'true'
        }
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();

      if (data.success === true) {
        setAgentHealth('available');
      } else {
        throw new Error('Agent responded but status is not successful');
      }
    } catch (error) {
      console.error('Agent health error:', error);
      setAgentHealth('unavailable');
    }
  };

  const loadDirectoryFiles = async (directory: string) => {
    try {
      const response = await fetch('/api/agent/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({ directory })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      if (data.success && data.files) {
        setFiles(data.files);
        setCurrentDirectory(directory);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const loadFileContent = async (path: string) => {
    try {
      const response = await fetch('/api/agent/read-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({ filePath: path })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      if (data.success && data.content) {
        setFileContent(data.content);
        setSelectedFile(path);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  const sendMessageToAgent = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          systemMessage: 'You are a helpful AI assistant with access to the codebase.'
        })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      if (data.success && data.response) {
        const assistantMessage = { role: 'assistant', content: data.response };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin AI Agent</h1>
      
      {/* Agent Status Alerts */}
      {agentHealth === 'loading' && (
        <Alert className="mb-4">
          <AlertTitle>Checking Agent Status</AlertTitle>
          <AlertDescription>
            Verifying the availability of the AI agent...
          </AlertDescription>
        </Alert>
      )}

      {agentHealth === 'unavailable' && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Agent Unavailable</AlertTitle>
          <AlertDescription>
            The AI agent is currently unavailable. Please check your network or API key.
          </AlertDescription>
        </Alert>
      )}

      {agentHealth === 'available' && (
        <Alert className="mb-4" variant="default">
          <AlertTitle>Agent Ready</AlertTitle>
          <AlertDescription>
            AI agent is connected and ready to assist with your tasks.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        
        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Agent Chat</CardTitle>
              <CardDescription>
                Interact with the AI to help with tasks and questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Textarea 
                placeholder="Type your message here..." 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1"
                disabled={loading || agentHealth !== 'available'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessageToAgent();
                  }
                }}
              />
              <Button 
                onClick={sendMessageToAgent} 
                disabled={loading || !prompt.trim() || agentHealth !== 'available'}
              >
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Explorer</CardTitle>
              <CardDescription>
                Browse and view project files
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="w-1/3">
                <h3 className="font-semibold mb-2">Current Directory: {currentDirectory}</h3>
                <div className="border rounded-md h-[400px] overflow-auto p-2">
                  {files.map((file, index) => (
                    <div 
                      key={index} 
                      className="py-1 px-2 hover:bg-gray-100 cursor-pointer rounded"
                      onClick={() => {
                        if (file.endsWith('/')) {
                          loadDirectoryFiles(currentDirectory + file);
                        } else {
                          loadFileContent(currentDirectory + file);
                        }
                      }}
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-2/3">
                <h3 className="font-semibold mb-2">
                  {selectedFile ? `File: ${selectedFile}` : 'Select a file to view'}
                </h3>
                <ScrollArea className="border rounded-md h-[400px] p-2">
                  <pre className="whitespace-pre-wrap text-sm">{fileContent}</pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}