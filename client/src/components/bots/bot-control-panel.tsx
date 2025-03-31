import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { Bot } from "./bot-interface-types";

interface BotControlPanelProps {
  botId: number;
  isRunning: boolean;
}

export function BotControlPanel({ botId, isRunning }: BotControlPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const response = await fetch(`/api/bots/${botId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start bot");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "בוט הופעל בהצלחה",
        description: "הבוט החל לפעול במערכת",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בהפעלת הבוט",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const response = await fetch(`/api/bots/${botId}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to stop bot");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "בוט הופסק בהצלחה",
        description: "הבוט הופסק במערכת",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעצירת הבוט",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="flex justify-center">
      {isRunning ? (
        <Button 
          onClick={() => stopBotMutation.mutate(botId)} 
          disabled={stopBotMutation.isPending}
          variant="destructive"
          className="w-full"
        >
          <Square className="h-4 w-4 mr-2" />
          {stopBotMutation.isPending ? "Stopping..." : "Stop Bot"}
        </Button>
      ) : (
        <Button 
          onClick={() => startBotMutation.mutate(botId)} 
          disabled={startBotMutation.isPending}
          className="w-full"
        >
          <Play className="h-4 w-4 mr-2" />
          {startBotMutation.isPending ? "Starting..." : "Start Bot"}
        </Button>
      )}
    </div>
  );
}