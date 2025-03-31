import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, TrendingUp, ArrowDownUp, BarChart3, HelpCircle, AlertCircle, Check, Zap } from "lucide-react";

interface BotExplanationGuideProps {
  botType: 'ai-grid' | 'dca' | 'macd';
}

export default function BotExplanationGuide({ botType }: BotExplanationGuideProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <HelpCircle className="h-5 w-5 mr-2 text-primary" />
          מדריך למשתמש - {
            botType === 'ai-grid' ? 'בוט AI Grid' :
            botType === 'dca' ? 'בוט DCA' :
            'בוט MACD'
          }
        </CardTitle>
        <CardDescription>
          מידע על אופן פעולת הבוט והסבר על הפרמטרים השונים
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {botType === 'ai-grid' && (
            <>
              <AccordionItem value="what-is">
                <AccordionTrigger>מהו בוט AI Grid?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p>
                      בוט AI Grid הוא כלי מסחר אוטומטי המשלב אסטרטגיית גריד קלאסית עם טכנולוגיית בינה מלאכותית. 
                      הבוט מחלק את טווח המחירים שהגדרת לרשת של רמות מחיר, ומבצע קניות כאשר המחיר יורד לרמה נמוכה יותר, 
                      ומכירות כאשר המחיר עולה לרמה גבוהה יותר. כך הבוט רוכש בזול ומוכר ביוקר בצורה אוטומטית.
                    </p>
                    <div className="flex items-start mt-2">
                      <Brain className="h-5 w-5 mr-2 mt-0.5 text-primary" />
                      <p>
                        <strong>תוספת AI:</strong> המערכת משתמשת באלגוריתמים מתקדמים כדי לייעל את רמות הגריד, 
                        ולהתאים אותן בזמן אמת לתנאי השוק המשתנים, מה שמשפר את הביצועים לעומת גריד סטטי.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works">
                <AccordionTrigger>כיצד הבוט פועל?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2 mt-0.5">1</div>
                      <p>
                        <strong>יצירת רשת:</strong> הבוט יוצר רשת של רמות מחיר בין המחיר העליון והתחתון שהגדרת.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2 mt-0.5">2</div>
                      <p>
                        <strong>אופטימיזציה ע"י AI:</strong> המערכת מנתחת נתוני שוק היסטוריים וזמן אמת כדי למקם את רמות הגריד באופן אופטימלי.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2 mt-0.5">3</div>
                      <p>
                        <strong>ביצוע עסקאות:</strong> כאשר המחיר חוצה רמת גריד כלפי מטה, הבוט מבצע רכישה. כאשר המחיר חוצה רמת גריד כלפי מעלה, הבוט מבצע מכירה.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2 mt-0.5">4</div>
                      <p>
                        <strong>התאמה דינמית:</strong> ככל שתנאי השוק משתנים, המערכת מתאימה את רמות הגריד, רוחב הרשת, וסטרטגיית המסחר.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2 mt-0.5">5</div>
                      <p>
                        <strong>ניהול סיכונים:</strong> הבוט מיישם את הגדרות ניהול הסיכונים שהגדרת, כולל Stop Loss ו-Take Profit.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ideal-conditions">
                <AccordionTrigger>באילו תנאי שוק הבוט אפקטיבי במיוחד?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <ArrowDownUp className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>שווקים תנודתיים ללא כיוון ברור:</strong> בוט AI Grid מצטיין בשווקים שנעים בטווח יציב, כשהמחיר נע מעלה ומטה בטווח מחירים מוגדר.
                      </p>
                    </div>
                    <div className="flex items-start mt-2">
                      <TrendingUp className="h-5 w-5 mr-2 mt-0.5 text-amber-500" />
                      <p>
                        <strong>מגמות מתונות עם תיקונים:</strong> הבוט יכול להרוויח גם במגמות עולות או יורדות מתונות, תוך ניצול התיקונים בדרך.
                      </p>
                    </div>
                    <div className="flex items-start mt-2">
                      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500" />
                      <p>
                        <strong>פחות אפקטיבי במצבים של:</strong> קפיצות מחיר חדות ופתאומיות, או מגמות חזקות מאוד בכיוון אחד ללא תיקונים.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="parameters">
                <AccordionTrigger>הסברים על הפרמטרים העיקריים</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">מחיר עליון ותחתון</p>
                      <p className="text-sm text-muted-foreground">
                        מגדירים את טווח המחירים שבו הבוט יפעל. מומלץ לקבוע טווח ריאליסטי על בסיס התנודתיות ההיסטורית.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">מספר רמות ברשת</p>
                      <p className="text-sm text-muted-foreground">
                        מספר גבוה יותר של רמות מאפשר יותר עסקאות אך בהיקף קטן יותר. מספר נמוך יותר מאפשר עסקאות גדולות יותר אך תדירות נמוכה יותר.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">סכום השקעה כולל</p>
                      <p className="text-sm text-muted-foreground">
                        הסכום הכולל שיוקדש לבוט. הסכום יחולק בין רמות הגריד השונות.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">רמת סיכון AI</p>
                      <p className="text-sm text-muted-foreground">
                        קובעת את מידת האגרסיביות של המערכת. רמה גבוהה יותר עשויה להניב תשואות גבוהות יותר, אך גם סיכון גבוה יותר.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="risk-management">
                <AccordionTrigger>טיפים לניהול סיכונים אפקטיבי</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>הגדר Stop Loss:</strong> תמיד השתמש בהגדרת Stop Loss כדי להגביל הפסדים אפשריים במקרה של ירידת מחיר חדה.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>התחל בהשקעה קטנה:</strong> התחל עם סכום קטן עד שאתה מבין היטב את התנהגות הבוט בתנאי שוק שונים.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>בחר טווח מחירים ריאליסטי:</strong> הסתמך על נתונים היסטוריים לקביעת טווח שבו הנכס נוטה לנוע.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>הפעל מספר בוטים קטנים:</strong> במקום להפעיל בוט אחד גדול, שקול להפעיל מספר בוטים קטנים עם אסטרטגיות שונות.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </>
          )}

          {botType === 'dca' && (
            <>
              <AccordionItem value="what-is">
                <AccordionTrigger>מהו בוט DCA?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p>
                      בוט DCA (Dollar Cost Averaging) הוא כלי מסחר אוטומטי המבצע רכישות תקופתיות בסכומים קבועים,
                      ללא תלות במחיר השוק הנוכחי. אסטרטגיה זו מסייעת למשקיעים להימנע מעיתוי שוק ומקטינה את ההשפעה של תנודתיות קצרת טווח.
                    </p>
                    <div className="flex items-start mt-2">
                      <Zap className="h-5 w-5 mr-2 mt-0.5 text-blue-500" />
                      <p>
                        <strong>העיקרון:</strong> במקום לנסות לתזמן את השוק, אתה משקיע סכום קבוע בפרקי זמן קבועים,
                        כך שאתה רוכש יותר יחידות כשהמחיר נמוך, ופחות יחידות כשהמחיר גבוה.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works">
                <AccordionTrigger>כיצד הבוט פועל?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 mr-2 mt-0.5">1</div>
                      <p>
                        <strong>קביעת לוח זמנים:</strong> הבוט מתוכנת לבצע רכישות בפרקי זמן קבועים (שעתי, יומי, שבועי וכו').
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 mr-2 mt-0.5">2</div>
                      <p>
                        <strong>השקעה אוטומטית:</strong> בכל מועד מתוכנן, הבוט משקיע סכום קבוע בנכס שהגדרת.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 mr-2 mt-0.5">3</div>
                      <p>
                        <strong>מעקב אחר ביצועים:</strong> המערכת מנהלת מעקב אחר העסקאות, העלות הממוצעת, והערך הכולל של ההשקעה.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 mr-2 mt-0.5">4</div>
                      <p>
                        <strong>התאמה דינמית (אופציונלי):</strong> אם מופעלת האופציה "DCA דינמי", הבוט יתאים את גודל הרכישות בהתאם לתנודות המחיר.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ideal-conditions">
                <AccordionTrigger>באילו תנאי שוק הבוט אפקטיבי במיוחד?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>שווקים לטווח ארוך:</strong> בוט DCA אידיאלי להשקעות ארוכות טווח, ופחות מתאים למסחר אקטיבי.
                      </p>
                    </div>
                    <div className="flex items-start mt-2">
                      <ArrowDownUp className="h-5 w-5 mr-2 mt-0.5 text-amber-500" />
                      <p>
                        <strong>שווקים תנודתיים:</strong> הבוט אפקטיבי במיוחד בשווקים תנודתיים, שכן הוא מנטרל את ההשפעה של תנודות קצרות טווח.
                      </p>
                    </div>
                    <div className="flex items-start mt-2">
                      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500" />
                      <p>
                        <strong>פחות אפקטיבי במצבים של:</strong> ירידות שוק ממושכות וארוכות ללא התאוששות, כאשר אין אמונה בערך הנכס לטווח הארוך.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="parameters">
                <AccordionTrigger>הסברים על הפרמטרים העיקריים</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">השקעה התחלתית</p>
                      <p className="text-sm text-muted-foreground">
                        הסכום שיושקע מיד עם הפעלת הבוט. ניתן להגדיר אפס אם מעוניינים להתחיל רק עם השקעות תקופתיות.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">סכום השקעה כולל</p>
                      <p className="text-sm text-muted-foreground">
                        מגביל את סך כל ההשקעה שהבוט יבצע לאורך זמן. הבוט יפסיק לבצע רכישות כשמגיע לסכום זה.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">סכום לכל רכישה</p>
                      <p className="text-sm text-muted-foreground">
                        הסכום שיושקע בכל פעם שהבוט מבצע רכישה.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">תדירות רכישה</p>
                      <p className="text-sm text-muted-foreground">
                        התדירות שבה הבוט יבצע רכישות (שעתי, יומי, שבועי וכו').
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="risk-management">
                <AccordionTrigger>טיפים לניהול סיכונים אפקטיבי</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>התחל בסכומים קטנים:</strong> התחל עם סכומי השקעה קטנים יחסית וגדל אותם עם הזמן.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>בחר נכסים יציבים לטווח ארוך:</strong> DCA יעיל יותר עם נכסים שיש להם סיכוי טוב לצמיחה לטווח ארוך.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>שלב סכומים:</strong> במקום להשקיע סכום גדול בבת אחת, פרוס אותו לאורך זמן.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>שמור על תדירות קבועה:</strong> אל תשנה את התדירות בתגובה לתנודות שוק - זה מנוגד לעיקרון של DCA.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </>
          )}

          {botType === 'macd' && (
            <>
              <AccordionItem value="what-is">
                <AccordionTrigger>מהו בוט MACD?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p>
                      בוט MACD הוא כלי מסחר אוטומטי המבוסס על אינדיקטור MACD (Moving Average Convergence Divergence),
                      שהוא אחד האינדיקטורים הטכניים הפופולריים ביותר לזיהוי מומנטום ושינויי מגמה בשוק.
                    </p>
                    <div className="flex items-start mt-2">
                      <BarChart3 className="h-5 w-5 mr-2 mt-0.5 text-amber-600" />
                      <p>
                        <strong>העיקרון:</strong> הבוט מזהה התכנסות והתבדרות של ממוצעים נעים, ומשתמש בחיתוכים ביניהם
                        כדי לקבוע נקודות כניסה ויציאה מהשוק.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works">
                <AccordionTrigger>כיצד הבוט פועל?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 mr-2 mt-0.5">1</div>
                      <p>
                        <strong>חישוב MACD:</strong> הבוט מחשב את ערכי ה-MACD על בסיס הממוצעים הנעים של המחיר.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 mr-2 mt-0.5">2</div>
                      <p>
                        <strong>זיהוי חיתוכים:</strong> הבוט מחפש חיתוכים בין קו ה-MACD לקו האות (Signal Line), שמעידים על שינוי מגמה אפשרי.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 mr-2 mt-0.5">3</div>
                      <p>
                        <strong>מסחר על פי אותות:</strong> כאשר קו ה-MACD חותך את קו האות כלפי מעלה, הבוט מבצע רכישה (אות קנייה).
                        כאשר קו ה-MACD חותך את קו האות כלפי מטה, הבוט מבצע מכירה (אות מכירה).
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 mr-2 mt-0.5">4</div>
                      <p>
                        <strong>ניהול סיכונים:</strong> הבוט מיישם את הגדרות ה-Stop Loss ו-Take Profit שהגדרת לכל עסקה.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 mr-2 mt-0.5">5</div>
                      <p>
                        <strong>אימות אותות (אופציונלי):</strong> אם האפשרות מופעלת, הבוט ישתמש באינדיקטורים נוספים כמו RSI כדי לאמת אותות ולמנוע אותות שווא.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ideal-conditions">
                <AccordionTrigger>באילו תנאי שוק הבוט אפקטיבי במיוחד?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>שווקים עם מגמות ברורות:</strong> בוט MACD מצטיין בזיהוי ומסחר במגמות חזקות, ארוכות וברורות.
                      </p>
                    </div>
                    <div className="flex items-start mt-2">
                      <BarChart3 className="h-5 w-5 mr-2 mt-0.5 text-amber-500" />
                      <p>
                        <strong>נקודות מפנה במגמה:</strong> הבוט יעיל בזיהוי נקודות מפנה ושינויי כיוון במגמות.
                      </p>
                    </div>
                    <div className="flex items-start mt-2">
                      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500" />
                      <p>
                        <strong>פחות אפקטיבי במצבים של:</strong> שווקים ללא כיוון ברור או שווקים עם תנודתיות גבוהה מאוד וללא מגמה.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="parameters">
                <AccordionTrigger>הסברים על הפרמטרים העיקריים</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">תקופה מהירה (Fast Period)</p>
                      <p className="text-sm text-muted-foreground">
                        מספר נרות הזמן עבור הממוצע הנע המהיר. ערך נמוך יותר מגיב מהר יותר לשינויי מחיר, אך עשוי להוביל ליותר אותות שווא.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">תקופה איטית (Slow Period)</p>
                      <p className="text-sm text-muted-foreground">
                        מספר נרות הזמן עבור הממוצע הנע האיטי. ערך גבוה יותר מספק תמונה רחבה יותר של המגמה, אך מגיב לאט יותר לשינויים.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">תקופת אות (Signal Period)</p>
                      <p className="text-sm text-muted-foreground">
                        מספר נרות הזמן עבור קו האות. קו זה מחליק את קו ה-MACD כדי לסנן רעש ולספק אותות מסחר ברורים יותר.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">סכום השקעה</p>
                      <p className="text-sm text-muted-foreground">
                        הסכום שיושקע בכל עסקה שהבוט מבצע.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="risk-management">
                <AccordionTrigger>טיפים לניהול סיכונים אפקטיבי</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>השתמש ב-Stop Loss:</strong> תמיד הגדר Stop Loss לכל עסקה כדי להגביל הפסדים אפשריים.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>אימות אותות:</strong> הפעל את אפשרות אימות האותות כדי להקטין אותות שווא.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>בחן מסגרות זמן שונות:</strong> כוון את הפרמטרים למסגרת הזמן שבה אתה מעוניין לסחור (קצר, בינוני או ארוך טווח).
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Check className="h-5 w-5 mr-2 mt-0.5 text-green-500" />
                      <p>
                        <strong>בדוק ביצועים היסטוריים:</strong> בחן את ביצועי האסטרטגיה בתקופות שוק שונות לפני שאתה משקיע סכומים גדולים.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}