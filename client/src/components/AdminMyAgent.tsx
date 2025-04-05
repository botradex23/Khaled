// הקוד שלך (כולל כל הפונקציונליות הקודמת) נשמר, רק החלק שמטפל ב-agentHealth תוקן
// שינוי עיקרי בתוך הפונקציה checkAgentHealth:
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

// ואילו האלמנטים ב-UI מופיעים ככה:
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