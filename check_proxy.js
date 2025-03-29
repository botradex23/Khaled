import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// רשימת פרוקסי שרתים לבדיקה - מדינות שבהן ביננס לא חסום
const proxies = [
  { ip: "38.154.227.167", port: 5868 }, // הפרוקסי הנוכחי
  { ip: "38.153.152.244", port: 9594 }, // פרוקסי אחר
  { ip: "185.199.228.220", port: 7300 }, // בריטניה
  { ip: "185.199.231.45", port: 8382 },  // סינגפור
  { ip: "188.74.210.207", port: 6286 },  // גרמניה
  { ip: "188.74.183.10", port: 8279 },   // גרמניה 
  { ip: "188.74.210.21", port: 6100 }    // גרמניה
];

// פרטי אימות של Webshare
const username = "ahjqspco";
const password = "dzx3r1prpz9k";

// פונקציה שבודקת אם פרוקסי מסוים יכול להתחבר ל-Binance
async function checkProxy(proxy) {
  const proxyUrl = `http://${username}:${password}@${proxy.ip}:${proxy.port}`;
  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  
  console.log(`בודק פרוקסי: ${proxy.ip}:${proxy.port}`);
  
  try {
    // ניסיון לבצע בקשה פשוטה ל-Binance API
    const response = await axios.get('https://api.binance.com/api/v3/ping', {
      httpsAgent,
      timeout: 5000, // 5 שניות לטיימאאוט
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json'
      }
    });
    
    // אם הגענו לכאן, הבקשה הצליחה
    console.log(`✅ הצלחה: ${proxy.ip}:${proxy.port} - סטטוס: ${response.status}`);
    return { success: true, proxy, status: response.status };
  } catch (error) {
    // ניתוח השגיאה
    let errorMessage = 'שגיאה לא ידועה';
    let statusCode = null;
    
    if (error.response) {
      // השרת הגיב, אבל עם קוד שגיאה
      statusCode = error.response.status;
      errorMessage = `קוד שגיאה: ${statusCode}`;
      if (error.response.data && error.response.data.msg) {
        errorMessage += `, הודעה: ${error.response.data.msg}`;
      }
    } else if (error.code) {
      // שגיאת רשת/פרוקסי
      errorMessage = `שגיאת רשת: ${error.code}`;
      if (error.message) {
        errorMessage += ` - ${error.message}`;
      }
    }
    
    console.log(`❌ נכשל: ${proxy.ip}:${proxy.port} - ${errorMessage}`);
    return { success: false, proxy, error: errorMessage, statusCode };
  }
}

// פונקציה ראשית שבודקת את כל הפרוקסי ומציגה תוצאות
async function checkAllProxies() {
  console.log('התחלת בדיקת פרוקסי לחיבור ל-Binance API...');
  console.log('===================================================');
  
  const results = [];
  
  for (const proxy of proxies) {
    const result = await checkProxy(proxy);
    results.push(result);
    // המתנה קצרה בין בקשות
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // הצגת סיכום התוצאות
  console.log('\n===================================================');
  console.log('סיכום תוצאות:');
  
  const successfulProxies = results.filter(r => r.success);
  console.log(`\nסה"כ פרוקסי שהצליחו: ${successfulProxies.length} מתוך ${proxies.length}`);
  
  if (successfulProxies.length > 0) {
    console.log('\nפרוקסי שעובדים:');
    successfulProxies.forEach(result => {
      console.log(`- ${result.proxy.ip}:${result.proxy.port}`);
    });
    
    // המלצה להחלפת הפרוקסי הנוכחי
    if (successfulProxies[0].proxy.ip !== proxies[0].ip) {
      console.log(`\nהמלצה: להחליף את הפרוקסי הנוכחי ל-${successfulProxies[0].proxy.ip}:${successfulProxies[0].proxy.port}`);
    }
  } else {
    console.log('\nלא נמצאו פרוקסי שעובדים. יש להמשיך עם מצב הגיבוי.');
  }
}

// הרצת הבדיקה
checkAllProxies().catch(error => {
  console.error('שגיאה בתהליך הבדיקה:', error);
});