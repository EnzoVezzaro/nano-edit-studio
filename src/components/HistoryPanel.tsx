import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  RotateCcw,
  Clock,
  Sparkles
} from "lucide-react";
import type { EditHistory } from "./PhotoEditor";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  history: EditHistory[];
  onHistorySelect: (edit: EditHistory) => void;
}

export const HistoryPanel = ({ 
  history, 
  onHistorySelect 
}: HistoryPanelProps) => {
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <Card className="border-0 rounded-none border-t">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-primary" />
          Edit History
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No edits yet</p>
            <p className="text-xs text-muted-foreground">
              Your AI edits will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((edit, index) => (
              <div
                key={edit.id}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer group",
                  "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => onHistorySelect(edit)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(edit.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium line-clamp-2 mb-2">
                      {edit.prompt}
                    </p>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Revert
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* History Info */}
        {history.length > 0 && (
          <div className="mt-6 p-3 bg-gradient-surface rounded-lg border border-border/50">
            <h5 className="text-xs font-medium mb-2 text-primary">📚 History</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Click any edit to preview</li>
              <li>• Use revert to restore previous versions</li>
              <li>• History is saved locally</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};