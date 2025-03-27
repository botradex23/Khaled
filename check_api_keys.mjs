import { storage } from './server/storage.js';

async function checkUsers() {
  console.log('--- בדיקת משתמשים עם מפתחות API ---');
  
  const users = [];
  for (let i = 1; i <= 20; i++) {
    const user = await storage.getUser(i);
    if (user) {
      users.push(user);
    }
  }
  
  console.log('נמצאו ' + users.length + ' משתמשים במערכת');
  
  const usersWithApiKeys = [];
  for (const user of users) {
    const apiKeys = await storage.getUserApiKeys(user.id);
    if (apiKeys && 
        apiKeys.okxApiKey && 
        apiKeys.okxSecretKey && 
        apiKeys.okxPassphrase) {
      usersWithApiKeys.push({
        id: user.id,
        username: user.username,
        email: user.email,
        hasApiKey: true,
        keys: {
          okxApiKey: apiKeys.okxApiKey ? apiKeys.okxApiKey.substr(0, 4) + '...' : null,
          okxSecretKey: apiKeys.okxSecretKey ? apiKeys.okxSecretKey.substr(0, 4) + '...' : null,
          okxPassphrase: apiKeys.okxPassphrase ? apiKeys.okxPassphrase.substr(0, 4) + '...' : null,
          defaultBroker: apiKeys.defaultBroker,
          useTestnet: apiKeys.useTestnet
        }
      });
    } else {
      usersWithApiKeys.push({
        id: user.id,
        username: user.username,
        email: user.email,
        hasApiKey: false
      });
    }
  }
  
  console.log('נמצאו ' + usersWithApiKeys.filter(u => u.hasApiKey).length + ' משתמשים עם מפתחות API');
  console.log('פירוט המשתמשים:');
  console.log(JSON.stringify(usersWithApiKeys, null, 2));
}

checkUsers();