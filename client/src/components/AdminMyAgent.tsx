import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "./ui/card.tsx";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "../hooks/use-toast";

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
  const [editedContent, setEditedContent] = useState<string>('');
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
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
      const response = await fetch('/api/agent/health', {
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
        setEditedContent(data.content); // Also set the edited content for potential editing
        setSelectedFile(path);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };
  
  const openEditDialog = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to edit first.",
        variant: "destructive"
      });
      return;
    }
    setIsEditDialogOpen(true);
  };

  const saveFileChanges = async () => {
    if (!selectedFile) return;
    
    setSaveLoading(true);
    try {
      const response = await fetch('/api/agent/write-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({ 
          filePath: selectedFile,
          content: editedContent
        })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      if (data.success) {
        toast({
          title: "File Saved",
          description: "File has been updated successfully.",
        });
        setFileContent(editedContent);
        setIsEditDialogOpen(false);
      } else {
        throw new Error(data.message || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save file',
        variant: "destructive"
      });
    } finally {
      setSaveLoading(false);
    }
  };
  
  const createNewFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "File name is required",
        variant: "destructive"
      });
      return;
    }
    
    setCreateLoading(true);
    try {
      // Construct the full path for the new file
      const filePath = currentDirectory + (newFileName.startsWith('./') ? newFileName.substring(2) : newFileName);
      
      const response = await fetch('/api/agent/write-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({ 
          filePath,
          content: newFileContent
        })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      if (data.success) {
        toast({
          title: "File Created",
          description: `${filePath} has been created successfully.`,
        });
        setNewFileName('');
        setNewFileContent('');
        setIsCreateDialogOpen(false);
        // Reload the current directory to show the new file
        loadDirectoryFiles(currentDirectory);
      } else {
        throw new Error(data.message || 'Failed to create file');
      }
    } catch (error) {
      console.error('Error creating file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create file',
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const sendMessageToAgent = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      // The backend expects a 'prompt' parameter, not 'messages'
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({ 
          prompt: prompt,
          systemPrompt: 'You are a helpful AI assistant with access to the codebase.'
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
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>File Explorer</CardTitle>
                <CardDescription>
                  Browse, view, edit and create project files
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={agentHealth !== 'available'}
                >
                  Create File
                </Button>
                <Button 
                  variant="outline" 
                  onClick={openEditDialog}
                  disabled={!selectedFile || agentHealth !== 'available'}
                >
                  Edit File
                </Button>
              </div>
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
          
          {/* Edit File Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Edit File: {selectedFile}</DialogTitle>
                <DialogDescription>
                  Make changes to the file content below
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea 
                  className="font-mono text-sm min-h-[400px]" 
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={saveLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveFileChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Create File Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New File</DialogTitle>
                <DialogDescription>
                  Enter the file name and content
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name (relative to current directory)</Label>
                  <Input
                    id="fileName"
                    placeholder="e.g., example.js or subfolder/example.js"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current directory: {currentDirectory}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileContent">File Content</Label>
                  <Textarea 
                    id="fileContent"
                    className="font-mono text-sm min-h-[300px]" 
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    placeholder="Enter file content here..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createNewFile}
                  disabled={createLoading || !newFileName.trim()}
                >
                  {createLoading ? 'Creating...' : 'Create File'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}