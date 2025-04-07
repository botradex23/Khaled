import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./button";
import { Loader2, RefreshCw } from "lucide-react";

interface ResetPaperAccountDialogProps {
  accountId: number;
}

export default function ResetPaperAccountDialog({ accountId }: ResetPaperAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`/api/paper-trading/account/${accountId}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset account");
      }

      // Invalidate all paper trading related queries
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paper-trading/stats"] });

      toast({
        title: "חשבון אופס בהצלחה",
        description: "חשבון ה-Paper Trading שלך אופס ל-$1,000. כל העסקאות והפוזיציות נמחקו.",
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "שגיאה באיפוס החשבון",
        description: error.message || "אירעה שגיאה בעת איפוס החשבון",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          אפס חשבון
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>אפס חשבון Paper Trading</DialogTitle>
          <DialogDescription>
            איפוס החשבון ימחק את כל העסקאות והפוזיציות הקיימות ויאפס את היתרה ל-$1,000. פעולה זו אינה ניתנת לביטול.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isResetting}>
            ביטול
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            אפס חשבון
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}