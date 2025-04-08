```javascript
// ES module export
export function parseDateTime(datetimeStr) {
    const dateTime = new Date(datetimeStr);
    
    // Extract date parts
    const year = dateTime.getFullYear();
    const month = dateTime.getMonth() + 1; // Note: Month is zero-based
    const day = dateTime.getDate();
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const second = dateTime.getSeconds();
    
    return { year, month, day, hour, minute, second };
}
```