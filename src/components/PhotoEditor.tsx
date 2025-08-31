import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Download, 
  RotateCcw, 
  RotateCw, 
  ZoomIn, 
  ZoomOut,
  Square,
  Circle,
  Brush,
  Eraser,
  Type,
  Move,
  Sparkles,
  History,
  Eye,
  EyeOff,
  Layers,
  Palette
} from "lucide-react";
import { CanvasEditor } from "./CanvasEditor";
import { ImageUpload } from "./ImageUpload";
import { ToolPanel } from "./ToolPanel";
import { PromptPanel } from "./PromptPanel";
import { HistoryPanel } from "./HistoryPanel";
import { LayersPanel } from "./LayersPanel";
import { toast } from "sonner";

export type Tool = "select" | "brush" | "eraser" | "rectangle" | "circle" | "text";

export interface EditHistory {
  id: string;
  prompt: string;
  timestamp: number;
  thumbnail: string;
  imageData: string;
}

export const PhotoEditor = () => {
  const [currentTool, setCurrentTool] = useState<Tool>("select");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [baseImageIndex, setBaseImageIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [showLayers, setShowLayers] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  
  const canvasRef = useRef<any>(null);

  const handleImageUpload = useCallback((files: File[]) => {
    setUploadedImages(prev => [...prev, ...files]);
    toast.success(`Uploaded ${files.length} image(s)`);
  }, []);

  const handleRunEdit = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Simulate AI processing
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock edit result
      const newEdit: EditHistory = {
        id: Date.now().toString(),
        prompt,
        timestamp: Date.now(),
        thumbnail: "/placeholder.svg",
        imageData: "/placeholder.svg"
      };
      
      setEditHistory(prev => [newEdit, ...prev]);
      setProgress(100);
      toast.success("Edit completed!");
      
    } catch (error) {
      toast.error("Edit failed. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
    }
  }, [prompt]);

  const handleExport = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.exportImage();
    }
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            PhotoBanana
          </h1>
          <Badge variant="secondary" className="ml-2">
            AI Photo Editor
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowLayers(!showLayers)}>
            <Layers className="w-4 h-4 mr-2" />
            Layers
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
          <ToolPanel 
            currentTool={currentTool} 
            onToolChange={setCurrentTool}
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {uploadedImages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <ImageUpload onImageUpload={handleImageUpload} />
            </div>
          ) : (
            <>
              {/* Canvas */}
              <div className="flex-1 bg-canvas-bg relative overflow-hidden">
                <CanvasEditor
                  ref={canvasRef}
                  images={uploadedImages}
                  baseImageIndex={baseImageIndex}
                  currentTool={currentTool}
                />
              </div>
              
              {/* Processing Progress */}
              {isProcessing && (
                <div className="p-4 bg-card border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Processing with Nano Banana...</span>
                    <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar - Panels */}
        <div className="w-80 bg-card border-l border-border flex flex-col">
          {/* Prompt Panel */}
          <PromptPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onRunEdit={handleRunEdit}
            isProcessing={isProcessing}
          />
          
          {/* Conditional Panels */}
          {showLayers && uploadedImages.length > 0 && (
            <LayersPanel
              images={uploadedImages}
              baseImageIndex={baseImageIndex}
              onBaseImageChange={setBaseImageIndex}
            />
          )}
          
          {showHistory && editHistory.length > 0 && (
            <HistoryPanel
              history={editHistory}
              onHistorySelect={(edit) => {
                toast.success(`Reverted to: ${edit.prompt}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};