// server/testKey.ts
console.log("בודק אם המפתח של OpenAI קיים במשתני סביבה (env)...");

if (process.env.OPENAI_API_KEY) {
  console.log("✔️ נמצא מפתח");
  console.log("חלק מהמפתח (לבדיקה בלבד):", process.env.OPENAI_API_KEY.slice(0, 10) + "...");
} else {
  console.log("❌ לא נמצא מפתח בשם OPENAI_API_KEY");
}