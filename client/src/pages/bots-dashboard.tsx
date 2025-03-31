import React from "react";
import { Link } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, LineChart, DollarSign, Zap, Bot, Plus, ChevronRight, BadgeInfo } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BotsDashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-16 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center">
              <Bot className="mr-2 h-8 w-8 text-primary" />
              בוטים למסחר אוטומטי
            </h1>
            <p className="text-muted-foreground text-lg">
              מערכת בוטים מתקדמת המאפשרת מסחר אוטומטי על פי אסטרטגיות מובנות, עם ניהול סיכונים וביצועים מעולים
            </p>
          </div>

          <Tabs defaultValue="bots" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bots">
                <Bot className="h-4 w-4 mr-2" />
                בוטים זמינים
              </TabsTrigger>
              <TabsTrigger value="benefits">
                <BadgeInfo className="h-4 w-4 mr-2" />
                יתרונות מסחר אוטומטי
              </TabsTrigger>
              <TabsTrigger value="start">
                <Plus className="h-4 w-4 mr-2" />
                איך להתחיל
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bots" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Grid Bot */}
                <Card className="border-2 border-primary/70 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">בוט AI Grid</CardTitle>
                      <div className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-500">
                        מתקדם
                      </div>
                    </div>
                    <CardDescription>
                      בוט המשתמש בינה מלאכותית לקביעת רמות גריד אופטימליות
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Brain className="h-4 w-4 mr-2 text-primary" />
                        <span>אופטימיזציה אוטומטית של רמות הגריד</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <LineChart className="h-4 w-4 mr-2 text-primary" />
                        <span>מתואם לתנודתיות השוק בזמן אמת</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Zap className="h-4 w-4 mr-2 text-primary" />
                        <span>יכולת ביצוע משופרת בתנאי שוק משתנים</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href="/ai-grid-bot">
                      <Button className="w-full">
                        צור בוט AI Grid
                        <ChevronRight className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>

                {/* DCA Bot */}
                <Card className="border-2 border-sky-500/70 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">בוט DCA</CardTitle>
                      <div className="text-xs px-2 py-1 rounded-full bg-sky-500/10 text-sky-500">
                        קל לשימוש
                      </div>
                    </div>
                    <CardDescription>
                      בוט המבצע רכישות תקופתיות של מטבע בסכומים קבועים
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 mr-2 text-sky-500" />
                        <span>השקעה מדורגת להקטנת סיכונים</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <LineChart className="h-4 w-4 mr-2 text-sky-500" />
                        <span>עלות ממוצעת נמוכה לאורך זמן</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Zap className="h-4 w-4 mr-2 text-sky-500" />
                        <span>אידיאלי למשקיעים לטווח ארוך</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href="/dca-bot">
                      <Button variant="outline" className="w-full border-sky-500 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950">
                        צור בוט DCA
                        <ChevronRight className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>

                {/* MACD Bot */}
                <Card className="border-2 border-amber-500/70 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">בוט MACD</CardTitle>
                      <div className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">
                        טכני
                      </div>
                    </div>
                    <CardDescription>
                      בוט המסתמך על אינדיקטור MACD לזיהוי נקודות כניסה ויציאה
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <LineChart className="h-4 w-4 mr-2 text-amber-600" />
                        <span>זיהוי היפוכי מגמה בשוק</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Zap className="h-4 w-4 mr-2 text-amber-600" />
                        <span>פרמטרים מותאמים אישית</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Bot className="h-4 w-4 mr-2 text-amber-600" />
                        <span>פילטרים למניעת אותות שווא</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href="/macd-bot">
                      <Button variant="outline" className="w-full border-amber-600 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950">
                        צור בוט MACD
                        <ChevronRight className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>יתרונות מסחר אוטומטי עם בוטים</CardTitle>
                  <CardDescription>
                    מדוע כדאי לך להשתמש בבוטים למסחר במטבעות קריפטו
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">חיסכון בזמן</h3>
                      <p className="text-muted-foreground mb-2">
                        הבוטים פועלים 24/7 ללא צורך בהשגחה מתמדת, מה שמאפשר לך להתמקד בדברים החשובים לך.
                      </p>
                    </div>
                    
                    <div className="flex flex-col p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">הסרת רגשות מהמסחר</h3>
                      <p className="text-muted-foreground mb-2">
                        בוטים פועלים על פי אסטרטגיה מוגדרת מראש, ללא השפעת פחד, חמדנות או רגשות אחרים.
                      </p>
                    </div>
                    
                    <div className="flex flex-col p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">ביצוע מדויק</h3>
                      <p className="text-muted-foreground mb-2">
                        הבוטים מבצעים עסקאות בדיוק רב ובמהירות גבוהה, באופן שלא ניתן להשיג בעסקאות ידניות.
                      </p>
                    </div>
                    
                    <div className="flex flex-col p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">ניהול סיכונים מובנה</h3>
                      <p className="text-muted-foreground mb-2">
                        כל בוט מגיע עם כלי ניהול סיכונים מובנים שעוזרים להגן על ההון שלך ולהגביל הפסדים.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="start" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>איך להתחיל עם בוטים למסחר</CardTitle>
                  <CardDescription>
                    מדריך פשוט להתחלת עבודה עם בוטים אוטומטיים
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex border-b pb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mr-4">
                        1
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-1">בחר אסטרטגיה</h3>
                        <p className="text-muted-foreground">
                          בחר את האסטרטגיה המתאימה לסגנון המסחר שלך ולמטרותיך:
                          <ul className="list-disc ml-6 mt-2">
                            <li><strong>AI Grid</strong> - לשווקים תנודתיים ללא כיוון ברור</li>
                            <li><strong>DCA</strong> - לצבירה הדרגתית לטווח ארוך</li>
                            <li><strong>MACD</strong> - למסחר טכני על סמך מומנטום ומגמות</li>
                          </ul>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex border-b pb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mr-4">
                        2
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-1">הגדר פרמטרים</h3>
                        <p className="text-muted-foreground">
                          התאם את הפרמטרים של הבוט לפי העדפותיך:
                          <ul className="list-disc ml-6 mt-2">
                            <li>בחר זוג מסחר (למשל BTC-USDT)</li>
                            <li>קבע את סכום ההשקעה</li>
                            <li>הגדר רמות Stop Loss ו-Take Profit</li>
                            <li>התאם הגדרות ספציפיות לאסטרטגיה שבחרת</li>
                          </ul>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex border-b pb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mr-4">
                        3
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-1">הפעל את הבוט</h3>
                        <p className="text-muted-foreground">
                          לאחר הגדרת כל הפרמטרים, לחץ על "הפעל" כדי להתחיל את פעילות הבוט.
                          הבוט יתחיל לבצע עסקאות באופן אוטומטי לפי האסטרטגיה שהגדרת.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mr-4">
                        4
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-1">נטר ביצועים</h3>
                        <p className="text-muted-foreground">
                          עקוב אחר ביצועי הבוט באמצעות כלי הניתוח וההפעלה בדף הבוט.
                          תמיד תוכל להתאים את ההגדרות או להפסיק את פעילות הבוט בכל עת.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex justify-between w-full">
                    <Link href="/#bots">
                      <Button variant="outline">
                        קרא עוד על בוטים
                      </Button>
                    </Link>
                    <Link href="/ai-grid-bot">
                      <Button>
                        התחל עכשיו עם AI Grid
                        <ChevronRight className="mr-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}