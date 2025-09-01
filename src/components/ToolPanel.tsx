import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MousePointer,
  Move,
  Brush,
  Eraser,
  Square,
  Circle,
  Type
} from "lucide-react";
import type { Tool } from "./PhotoEditor";
import { cn } from "@/lib/utils";

interface ToolPanelProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
}

const tools = [
  { id: "select" as Tool, icon: MousePointer, label: "Select & Move", shortcut: "V" },
  { id: "move" as Tool, icon: Move, label: "Pan Canvas", shortcut: "M" },
  { id: "brush" as Tool, icon: Brush, label: "Brush", shortcut: "B" },
  { id: "eraser" as Tool, icon: Eraser, label: "Eraser", shortcut: "E" },
  { id: "rectangle" as Tool, icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "circle" as Tool, icon: Circle, label: "Circle", shortcut: "C" },
  { id: "text" as Tool, icon: Type, label: "Text", shortcut: "T" },
];

export const ToolPanel = ({ currentTool, onToolChange }: ToolPanelProps) => {
  return (
    <>
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;
        
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-10 h-10 p-0 transition-all duration-200",
                  isActive
                    ? "bg-gradient-primary shadow-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                )}
                onClick={() => onToolChange(tool.id)}
              >
                <Icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>{tool.label}</span>
              <kbd className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                {tool.shortcut}
              </kbd>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
};
