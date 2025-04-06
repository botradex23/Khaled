import fs from 'fs';
import path from 'path';

// קובץ השרת שצריך לערוך
const filePath = path.join(__dirname, 'server.ts');

// קריאת תוכן הקובץ
let content = fs.readFileSync(filePath, 'utf8');

// בדיקה אם השורה כבר קיימת
if (content.includes('server.timeout = 60000')) {
  console.log('Timeout כבר נוסף. לא נעשה שינוי.');
  process.exit(0);
}

// חיפוש שורת app.listen כדי להוסיף אחריה
const listenRegex = /const\s+server\s*=\s*app\.listen\([^)]*\)\s*;/;
const match = content.match(listenRegex);

if (!match) {
  console.error('לא נמצאה שורת app.listen בקובץ server.ts');
  process.exit(1);
}

// יצירת תוכן חדש עם השורה המבוקשת
const newContent = content.replace(
  listenRegex,
  `${match[0]}\nserver.timeout = 60000; // timeout set automatically`
);

// כתיבה חזרה לקובץ
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('התווסף timeout = 60000 לקובץ server.ts בהצלחה!');