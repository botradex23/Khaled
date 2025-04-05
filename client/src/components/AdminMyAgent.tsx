import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { DatabaseHealth } from './DatabaseHealth';

/**
 * AdminMyAgent - A component for the admin-only AI agent that can chat, analyze code, and suggest changes
 */
export default function AdminMyAgent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Chat state
  const [chatPrompt, setChatPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant that helps with software development tasks.');
  const [chatResponse, setChatResponse] = useState('');
  
  // Analyze state
  const [analyzeTask, setAnalyzeTask] = useState('');
  const [analyzeFilePaths, setAnalyzeFilePaths] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  
  // Suggest state
  const [suggestTask, setSuggestTask] = useState('');
  const [suggestFilePath, setSuggestFilePath] = useState('');
  const [suggestResult, setSuggestResult] = useState('');
  
  // File browser state
  const [directoryPath, setDirectoryPath] = useState('');
  const [fileList, setFileList] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [agentHealth, setAgentHealth] = useState<'available' | 'unavailable' | 'loading'>('loading');
  
  // Check agent health on component mount
  useEffect(() => {
    checkAgentHealth();
  }, []);
  
  // Test the integrated agent API
  const testAuthFix = async () => {
    try {
      console.log('Testing integrated agent API...');
      console.log('Current URL:', window.location.href);
      
      // Use the proper health endpoint for the integrated agent API
      console.log('Attempting agent API health check at: /api/agent/health');
      
      // Try agent API with the test header
      const response = await fetch('/api/agent/health', {
        headers: {
          'Accept': 'application/json',
          'X-Test-Admin': 'true'
        }
      });
      
      console.log('Response status:', response.status);
      
      // Create a simple object from headers to avoid iterator issues
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);
      
      const data = await response.json();
      console.log('Agent API response:', data);
      
      toast({
        title: response.ok ? 'Agent API Success' : 'Agent API Failed',
        description: response.ok 
          ? 'Successfully connected to the integrated agent API' 
          : `Connection failed: ${data.message || 'Unknown error'}`,
        variant: response.ok ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Agent API test error:', error);
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during the test',
        variant: 'destructive',
      });
    }
  };
  
  // Check if the agent is available and functioning
  const checkAgentHealth = async () => {
    try {
      console.log('Fetching agent health status...');
      console.log('Current URL:', window.location.href);
      
      // Try the agent health endpoint
      console.log('Attempting to connect to agent API at: /api/agent/health');
      
      // Try agent API with the test header
      const response = await fetch('/api/agent/health', {
        headers: {
          'Accept': 'application/json',
          'X-Test-Admin': 'true'
        }
      });
      
      console.log('Response status:', response.status);
      
      // Create a simple object from headers to avoid iterator issues
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);
      
      const data = await response.json();
      console.log('Agent health response:', data);
      
      if (response.ok && data.success === true) {
        console.log('Agent is available (direct endpoint) - OpenAI service functioning properly');
        setAgentHealth('available');
      } else {
        console.error('Agent is unavailable:', data.message || 'Unknown error');
        console.error('Error details:', data.error || 'No detailed error provided');
        console.error('Authentication info:', data.authentication || 'No authentication info provided');
        setAgentHealth('unavailable');
        
        // Show error toast with specific information
        toast({
          title: 'Agent Unavailable',
          description: data.message || 'The AI agent is currently unavailable. Please check your OpenAI API key.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to check agent health:', error);
      setAgentHealth('unavailable');
      
      toast({
        title: 'Agent Health Check Failed',
        description: 'Could not connect to the agent health endpoint. Please check your network connection.',
        variant: 'destructive',
      });
    }
  };
  
  // Chat handler
  const handleChat = async () => {
    if (!chatPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setChatResponse('');
    
    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true',
        },
        body: JSON.stringify({
          prompt: chatPrompt,
          systemPrompt: systemPrompt,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.response) {
        setChatResponse(data.response);
      } else {
        throw new Error(data.message || 'Failed to get chat response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while chatting with the AI',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Analyze handler
  const handleAnalyze = async () => {
    if (!analyzeTask.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task description',
        variant: 'destructive',
      });
      return;
    }
    
    if (!analyzeFilePaths.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter at least one file path',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setAnalysisResult('');
    
    try {
      // Split the file paths by commas or new lines
      const filePaths = analyzeFilePaths
        .split(/[,\n]/)
        .map(path => path.trim())
        .filter(path => path.length > 0);
      
      const response = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({
          task: analyzeTask,
          filePaths: filePaths,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        throw new Error(data.message || 'Failed to analyze code');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while analyzing code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Suggest handler
  const handleSuggest = async () => {
    if (!suggestTask.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task description',
        variant: 'destructive',
      });
      return;
    }
    
    if (!suggestFilePath.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a file path',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setSuggestResult('');
    
    try {
      const response = await fetch('/api/agent/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({
          task: suggestTask,
          filePath: suggestFilePath,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.suggestions) {
        setSuggestResult(data.suggestions);
      } else {
        throw new Error(data.message || 'Failed to get suggestions');
      }
    } catch (error: any) {
      console.error('Suggestion error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while getting suggestions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // List files handler
  const handleListFiles = async () => {
    if (!directoryPath.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a directory path',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    setFileList([]);
    
    try {
      const response = await fetch('/api/agent/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({
          directory: directoryPath,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.files)) {
        setFileList(data.files);
      } else {
        throw new Error(data.message || 'Failed to list files');
      }
    } catch (error: any) {
      console.error('File listing error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while listing files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Read file handler
  const handleReadFile = async (filePath: string) => {
    setLoading(true);
    setFileContent('');
    setEditedContent('');
    setIsEditing(false);
    
    try {
      const response = await fetch('/api/agent/read-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({
          filePath: filePath,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.content !== undefined) {
        setFileContent(data.content);
        setEditedContent(data.content);
        setSelectedFile(filePath);
      } else {
        throw new Error(data.message || 'Failed to read file');
      }
    } catch (error: any) {
      console.error('File reading error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while reading file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Write file handler
  const handleWriteFile = async () => {
    if (!selectedFile.trim()) {
      toast({
        title: 'Error',
        description: 'No file selected',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/agent/write-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({
          filePath: selectedFile,
          content: editedContent,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: 'File saved successfully',
        });
        setFileContent(editedContent);
        setIsEditing(false);
      } else {
        throw new Error(data.message || 'Failed to write file');
      }
    } catch (error: any) {
      console.error('File writing error:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while writing file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto my-8">
      <Card>
        <CardHeader>
          <CardTitle>My Agent</CardTitle>
          <CardDescription>
            AI-powered assistant for administration and development tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentHealth === 'unavailable' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Agent Unavailable</AlertTitle>
              <AlertDescription className="flex flex-col space-y-2">
                <span>The AI agent is currently unavailable. This might be due to:</span>
                <ul className="list-disc pl-6">
                  <li>Missing or invalid OpenAI API key</li>
                  <li>OpenAI API quota exceeded</li>
                  <li>Network connectivity issues to OpenAI</li>
                </ul>
                <span>Please contact an administrator to check and configure the API key settings.</span>
              </AlertDescription>
            </Alert>
          )}

          {agentHealth === 'loading' && (
            <Alert className="mb-4">
              <AlertTitle>Checking Agent Status</AlertTitle>
              <AlertDescription>
                Verifying the availability of the AI agent...
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
          
          <div className="mb-4 flex space-x-2">
            <Button onClick={checkAgentHealth} variant="outline" size="sm">
              Refresh Status
            </Button>
            <Button onClick={testAuthFix} variant="secondary" size="sm">
              Test Authentication Fix
            </Button>
          </div>
          
          {/* Database Health Status */}
          <div className="mb-6">
            <DatabaseHealth />
          </div>
          
          <Tabs defaultValue="chat">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="analyze">Analyze Code</TabsTrigger>
              <TabsTrigger value="suggest">Suggest Changes</TabsTrigger>
              <TabsTrigger value="files">File Browser</TabsTrigger>
            </TabsList>
            
            {/* Chat Tab */}
            <TabsContent value="chat">
              <Card>
                <CardHeader>
                  <CardTitle>Chat with AI</CardTitle>
                  <CardDescription>
                    Ask questions or get help with coding tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      placeholder="You are a helpful assistant that helps with software development tasks."
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="chatPrompt">Your Question</Label>
                    <Textarea
                      id="chatPrompt"
                      placeholder="Ask me anything about the project or for coding help..."
                      value={chatPrompt}
                      onChange={e => setChatPrompt(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleChat} 
                    disabled={loading || !chatPrompt.trim()}
                    className="w-full"
                  >
                    {loading ? 'Thinking...' : 'Ask AI'}
                  </Button>
                  
                  {chatResponse && (
                    <div className="mt-4 space-y-2">
                      <Label>Response</Label>
                      <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900 whitespace-pre-wrap">
                        {chatResponse}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Analyze Tab */}
            <TabsContent value="analyze">
              <Card>
                <CardHeader>
                  <CardTitle>Analyze Code</CardTitle>
                  <CardDescription>
                    Analyze files to understand implementation or identify issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="analyzeTask">Task Description</Label>
                    <Textarea
                      id="analyzeTask"
                      placeholder="Describe what you want to analyze or understand, e.g. 'Understand the authentication flow'"
                      value={analyzeTask}
                      onChange={e => setAnalyzeTask(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="analyzeFilePaths">File Paths (one per line or comma-separated)</Label>
                    <Textarea
                      id="analyzeFilePaths"
                      placeholder="server/auth/index.ts, server/routes/auth.ts"
                      value={analyzeFilePaths}
                      onChange={e => setAnalyzeFilePaths(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={loading || !analyzeTask.trim() || !analyzeFilePaths.trim()}
                    className="w-full"
                  >
                    {loading ? 'Analyzing...' : 'Analyze Files'}
                  </Button>
                  
                  {analysisResult && (
                    <div className="mt-4 space-y-2">
                      <Label>Analysis Result</Label>
                      <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900 whitespace-pre-wrap">
                        {analysisResult}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Suggest Tab */}
            <TabsContent value="suggest">
              <Card>
                <CardHeader>
                  <CardTitle>Suggest Changes</CardTitle>
                  <CardDescription>
                    Get suggestions for implementing specific tasks in a file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="suggestTask">Task Description</Label>
                    <Textarea
                      id="suggestTask"
                      placeholder="Describe what you want to implement, e.g. 'Add error handling to this function'"
                      value={suggestTask}
                      onChange={e => setSuggestTask(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="suggestFilePath">File Path</Label>
                    <Input
                      id="suggestFilePath"
                      placeholder="server/routes/auth.ts"
                      value={suggestFilePath}
                      onChange={e => setSuggestFilePath(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSuggest} 
                    disabled={loading || !suggestTask.trim() || !suggestFilePath.trim()}
                    className="w-full"
                  >
                    {loading ? 'Generating...' : 'Get Suggestions'}
                  </Button>
                  
                  {suggestResult && (
                    <div className="mt-4 space-y-2">
                      <Label>Suggested Changes</Label>
                      <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900 whitespace-pre-wrap">
                        {suggestResult}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Files Tab */}
            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>File Browser</CardTitle>
                  <CardDescription>
                    Browse, view, and edit files in the project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Directory Browser */}
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="Enter directory path, e.g. server" 
                          value={directoryPath}
                          onChange={e => setDirectoryPath(e.target.value)}
                        />
                        <Button 
                          onClick={handleListFiles}
                          disabled={loading || !directoryPath.trim()}
                        >
                          List Files
                        </Button>
                      </div>
                      
                      <div className="border rounded-md p-2 h-96 overflow-y-auto">
                        {fileList.length > 0 ? (
                          <ul className="space-y-1">
                            {fileList.map((file, index) => (
                              <li 
                                key={index} 
                                className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded ${
                                  selectedFile === `${directoryPath}/${file.replace(/\/$/, '')}` ? 
                                  'bg-slate-200 dark:bg-slate-700' : ''
                                }`}
                                onClick={() => {
                                  const filePath = `${directoryPath}/${file.replace(/\/$/, '')}`;
                                  if (!file.endsWith('/')) {
                                    handleReadFile(filePath);
                                  } else {
                                    setDirectoryPath(filePath);
                                    handleListFiles();
                                  }
                                }}
                              >
                                {file.endsWith('/') ? '📁 ' : '📄 '}
                                {file}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-500">
                            {loading ? 'Loading...' : 'No files to display'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* File Viewer/Editor */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">
                          {selectedFile ? selectedFile : 'No file selected'}
                        </h3>
                        <div className="space-x-2">
                          {selectedFile && !isEditing && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsEditing(true)}
                            >
                              Edit
                            </Button>
                          )}
                          {isEditing && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setIsEditing(false);
                                  setEditedContent(fileContent);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={handleWriteFile}
                                disabled={loading}
                              >
                                Save
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="border rounded-md h-[calc(100vh-20rem)] overflow-y-auto">
                        {selectedFile ? (
                          isEditing ? (
                            <Textarea
                              className="w-full h-full resize-none font-mono text-sm p-4"
                              value={editedContent}
                              onChange={e => setEditedContent(e.target.value)}
                            />
                          ) : (
                            <pre className="p-4 whitespace-pre-wrap break-all text-sm font-mono">
                              {fileContent}
                            </pre>
                          )
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-500">
                            Select a file to view its contents
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}