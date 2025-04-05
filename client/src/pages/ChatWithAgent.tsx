import React, { useState } from 'react';

export default function ChatWithAgent() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        },
        body: JSON.stringify({
          prompt: input,
          systemPrompt: "You are a fullstack assistant agent."
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        setMessages(prev => [...prev, `You: ${input}`, `Agent: ${data.response}`]);
      } else {
        setMessages(prev => [...prev, `You: ${input}`, `Agent: Error: ${data.message || 'Unknown error'}`]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, `You: ${input}`, `Agent: ${error.message || 'Failed to connect to agent'}`]);
    }

    setInput('');
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1>Chat with AI Agent</h1>
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'auto', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>{msg}</div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type a message..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        style={{ width: '80%', marginRight: '10px', padding: '8px' }}
      />
      <button onClick={sendMessage} disabled={loading} style={{ padding: '8px 16px' }}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}