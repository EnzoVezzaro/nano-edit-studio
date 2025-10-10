import { useState, useRef, useCallback, useEffect } from "react";

// Extend Window interface for AdSense
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle: any[];
  }
}

// AdSense Ad Component
const AdSenseAd = ({ client, slot, format = 'auto', responsive = true, style = {} }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    ></ins>
  );
};
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
import { CanvasEditor, AnnotationData } from "./CanvasEditor";
import { ImageUpload } from "./ImageUpload";
import { ToolPanel } from "./ToolPanel";
import { PromptPanel } from "./PromptPanel";
import { HistoryPanel } from "./HistoryPanel";
import { LayersPanel } from "./LayersPanel";
import { toast } from "sonner";
import { generateImageWithGemini } from "@/lib/gemini";

export type Tool = "select" | "brush" | "eraser" | "rectangle" | "circle" | "text" | "move";

export interface EditHistory {
  id: string;
  prompt: string;
  timestamp: number;
  thumbnail: string;
  imageData: string;
}

export const PhotoEditor = () => {
  const [currentTool, setCurrentTool] = useState<Tool>("select");

  // Refresh annotations from canvas
  const refreshAnnotations = useCallback(() => {
    if (canvasRef.current) {
      const updatedAnnotations = canvasRef.current.getAnnotationsData();
      setAnnotations(updatedAnnotations);
    }
  }, []);

  // Handle tool changes and refresh annotations
  const handleToolChange = useCallback(async (tool: Tool) => {
    setCurrentTool(tool);

    // Special handling for text tool - prompt for text input first
    if (tool === "text") {
      const userInput = window.prompt("Enter the text you want to add to the canvas:");

      if (userInput && userInput.trim()) {
        // Add text to canvas with user input
        if (canvasRef.current) {
          canvasRef.current.addText(userInput.trim());
        }
      }

      // Reset tool to select after adding text
      setCurrentTool("select");
    } else {
      // Refresh annotations after a short delay to allow canvas to update
      setTimeout(refreshAnnotations, 100);
    }
  }, [refreshAnnotations]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [baseImageIndex, setBaseImageIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [showLayers, setShowLayers] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("photobanana-api-key") || "";
  });
  const [provider, setProvider] = useState<"google" | "openrouter">(() => {
    return (localStorage.getItem("photobanana-provider") as "google" | "openrouter") || "google";
  });
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  
  // Define a type for the canvas ref to satisfy ESLint and TypeScript errors
  interface CanvasEditorRef {
    getCanvasDataURL: () => string;
    getCurrentImageDataURL: () => string;
    getOriginalImageDataURL: () => string;
    getAnnotationsData: () => AnnotationData[];
    loadGeneratedImage: (imageData: string, isHistoryLoad?: boolean) => void;
    exportImage: () => void; // Added exportImage method
    clear: () => void; // Added clear method to resolve TS error
    toggleAnnotationVisibility: (annotationId: number) => void;
    removeAnnotation: (annotationId: number) => void;
    setOnAnnotationsChange: (callback: (annotations: AnnotationData[]) => void) => void;
    addText: (text: string) => void;
  }
  
  // Use the defined ref type
  const canvasRef = useRef<CanvasEditorRef>(null);

  // Save API key to localStorage whenever it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("photobanana-api-key", apiKey);
    } else {
      localStorage.removeItem("photobanana-api-key");
    }
  }, [apiKey]);

  // Save provider to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("photobanana-provider", provider);
  }, [provider]);

  const handleImageUpload = useCallback((files: File[]) => {
    setUploadedImages(prev => [...prev, ...files]);
    toast.success(`Uploaded ${files.length} image(s)`);
  }, []);

  const handleRunEdit = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!apiKey.trim()) {
      toast.error(`Please enter your ${provider === "google" ? "Google" : "OpenRouter"} API key`);
      return;
    }

    if (!canvasRef.current) {
      toast.error("Canvas not ready");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Real progress tracking
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Get current image loaded in canvas (without annotations) for AI processing
      const currentImage = canvasRef.current.getCurrentImageDataURL();

      // Get annotations data
      const annotations = canvasRef.current.getAnnotationsData();

      // Create enhanced prompt with ONLY visible annotations
      let enhancedPrompt = prompt;

      // Filter to only visible annotations
      const visibleAnnotations = annotations.filter(annotation => annotation.visible !== false);

      console.log('Sending to AI:', {
        imageDataLength: currentImage.length,
        annotationCount: visibleAnnotations.length,
        annotations: visibleAnnotations
      });

      if (visibleAnnotations.length > 0) {
        enhancedPrompt += "\n\nCanvas Annotations (Visible Only):\n";

        visibleAnnotations.forEach(annotation => {
          switch (annotation.type) {
            case 'rect':
              enhancedPrompt += `• Rectangle ${annotation.id}: Position (${annotation.position.x}%, ${annotation.position.y}%), Size ${annotation.width}x${annotation.height}px`;
              if (annotation.stroke && typeof annotation.stroke === 'string') {
                enhancedPrompt += `, Color: ${annotation.stroke}`;
              }
              enhancedPrompt += "\n";
              break;
            case 'circle':
              enhancedPrompt += `• Circle ${annotation.id}: Position (${annotation.position.x}%, ${annotation.position.y}%), Radius ${annotation.radius}px`;
              if (annotation.stroke && typeof annotation.stroke === 'string') {
                enhancedPrompt += `, Color: ${annotation.stroke}`;
              }
              enhancedPrompt += "\n";
              break;
            case 'text':
            case 'textbox':
              enhancedPrompt += `• Text ${annotation.id}: "${annotation.text}" at position (${annotation.position.x}%, ${annotation.position.y}%)`;
              if (annotation.fill && typeof annotation.fill === 'string') {
                enhancedPrompt += `, Color: ${annotation.fill}`;
              }
              if (annotation.fontSize) {
                enhancedPrompt += `, Size: ${annotation.fontSize}px`;
              }
              enhancedPrompt += "\n";
              break;
          }
        });

        enhancedPrompt += "\n\n⚠️ CRITICAL INSTRUCTION: The annotations on the canvas are for REFERENCE ONLY!";
        enhancedPrompt += "\n• DO NOT draw or include any rectangles, circles, arrows, or text annotations in your output";
        enhancedPrompt += "\n• These are temporary drawing tools to show you WHERE to make changes";
        enhancedPrompt += "\n• Generate a clean, natural image WITHOUT any annotation shapes or marks";
        enhancedPrompt += "\n• Focus only on the requested modifications to the original image content";
        enhancedPrompt += "\n• The final result should look like a normal photograph without any drawing overlays";
      }

      // Call Gemini API with current canvas image and enhanced prompt
      const result = await generateImageWithGemini({
        prompt: enhancedPrompt,
        baseImage: uploadedImages.length > 0 ? currentImage : undefined,
        apiKey,
        provider // Pass the selected provider
      });

      if (!result.success) {
        // Handle specific content filter errors
        if (result.error?.includes("content_filter") || result.error?.includes("PROHIBITED_CONTENT")) {
          throw new Error("The content was flagged by the AI safety filter. Please try a different prompt or image.");
        }
        throw new Error(result.error || "Failed to generate image");
      }

      // Apply the generated image to canvas
      if (canvasRef.current && result.imageData) {
        canvasRef.current.loadGeneratedImage(result.imageData);

        // Save the generated image to history AFTER successful generation
        const historyEntry: EditHistory = {
          id: Date.now().toString(),
          prompt: prompt,
          timestamp: Date.now(),
          thumbnail: result.imageData,
          imageData: result.imageData
        };

        setEditHistory(prev => [historyEntry, ...prev]);
      }

      setProgress(100);
      toast.success("AI edit completed!");
      
    } catch (error) {
      console.error("Edit error:", error);
      toast.error(error instanceof Error ? error.message : "Edit failed. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
    }
  }, [prompt, apiKey, uploadedImages.length]);

  const handleExport = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.exportImage();
    }
  }, []);

  const handleToggleAnnotationVisibility = useCallback((annotationId: number) => {
    if (canvasRef.current) {
      canvasRef.current.toggleAnnotationVisibility(annotationId);
      // Refresh annotations data
      const updatedAnnotations = canvasRef.current.getAnnotationsData();
      setAnnotations(updatedAnnotations);
    }
  }, []);

  const handleRemoveAnnotation = useCallback((annotationId: number) => {
    if (canvasRef.current) {
      canvasRef.current.removeAnnotation(annotationId);
      // Refresh annotations data
      const updatedAnnotations = canvasRef.current.getAnnotationsData();
      setAnnotations(updatedAnnotations);
      toast.success("Annotation removed");
    }
  }, []);

  // Manual refresh function for layers panel
  const handleRefreshLayers = useCallback(() => {
    refreshAnnotations();
    toast.success("Layers refreshed");
  }, [refreshAnnotations]);

  // Save original image to history when uploaded
  useEffect(() => {
    if (uploadedImages.length > 0 && canvasRef.current && editHistory.length === 0) {
      // Small delay to ensure image is fully loaded
      const timeoutId = setTimeout(() => {
        if (canvasRef.current) {
          const originalImageData = canvasRef.current.getCanvasDataURL();
          const historyEntry: EditHistory = {
            id: Date.now().toString(),
            prompt: "Original image",
            timestamp: Date.now(),
            thumbnail: originalImageData,
            imageData: originalImageData
          };
          setEditHistory([historyEntry]);
          console.log('Original image saved to history');
        }
      }, 1500); // Increased delay to ensure image is fully loaded

      return () => clearTimeout(timeoutId);
    }
  }, [uploadedImages, canvasRef.current, editHistory.length]);

  // Update annotations when canvas changes
  useEffect(() => {
    if (canvasRef.current) {
      const updatedAnnotations = canvasRef.current.getAnnotationsData();
      setAnnotations(updatedAnnotations);

      // Set up callback for real-time updates
      canvasRef.current.setOnAnnotationsChange((newAnnotations) => {
        setAnnotations(newAnnotations);
      });
    }
  }, [uploadedImages, baseImageIndex]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img
            src="/assets/img/logo-icon.png"
            alt="PhotoBanana Logo"
            className="w-8 h-8 rounded-lg"
          />
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
        <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4">
          <ToolPanel
            currentTool={currentTool}
            onToolChange={handleToolChange}
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {uploadedImages.length === 0 ? (
            <div className="w-screen h-screen flex items-center justify-center">
              <ImageUpload onImageUpload={handleImageUpload} />
            </div>
          ) : (
            <>
              {/* Canvas */}
              <div className="w-full h-full bg-canvas-bg relative overflow-hidden">
                <CanvasEditor
                  ref={canvasRef}
                  images={uploadedImages}
                  baseImageIndex={baseImageIndex}
                  currentTool={currentTool}
                  onBaseImageIndexChange={setBaseImageIndex}
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
        <div className="w-80 bg-card border-l border-border flex flex-col overflow-y-auto">
          {/* AdSense Rectangular Ad */}
          <div className="p-4 border-b border-border">
            <div className="adsense-container text-center">
              <AdSenseAd
                client="ca-pub-7913108748890536"
                slot="7387984787"
                format="auto"
                responsive={true}
              />
            </div>
          </div>

          {/* API Key Input */}
          <div className="p-4 border-b border-border">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {provider === "google" ? "Google" : "OpenRouter"} API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${provider === "google" ? "Google" : "OpenRouter"} API key...`}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="text-xs text-muted-foreground mt-1">
              <p className="mb-2">You can plug your own API keys or use our test key for quick testing.</p>

              <div className="flex items-center gap-2 mb-2">
                <Button
                  onClick={() => {
                    const testKey = import.meta.env.VITE_PUBLIC_API_KEY;
                    if (!testKey) {
                      toast.error("Test API key not configured");
                      return;
                    }
                    setProvider("openrouter");
                    setApiKey(testKey);
                    toast.success("Test key loaded and provider set to OpenRouter");
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Use Test Key
                </Button>
              </div>

              <p>
                {provider === "google" ? (
                  <>
                    Google: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://aistudio.google.com/app/apikey</a>
                  </>
                ) : (
                  <>
                    OpenRouter: <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://openrouter.ai/settings/keys</a>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="p-4 border-b border-border">
            <label htmlFor="provider-select" className="text-sm font-medium text-muted-foreground mb-2 block">
              AI Provider
            </label>
            <select
              id="provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "google" | "openrouter")}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="google">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          
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
              annotations={annotations}
              onToggleAnnotationVisibility={handleToggleAnnotationVisibility}
              onRemoveAnnotation={handleRemoveAnnotation}
              onRefresh={handleRefreshLayers}
            />
          )}
          
          {showHistory && editHistory.length > 0 && (
            <HistoryPanel
              history={editHistory}
              onHistorySelect={(edit) => {
                // Restore the selected image to canvas
                if (canvasRef.current && edit.imageData) {
                  canvasRef.current.loadGeneratedImage(edit.imageData, true); // Pass true for isHistoryLoad
                  toast.success(`Reverted to: ${edit.prompt}`);
                }
              }}
            />
          )}

          <AdSenseAd
            client="ca-pub-7913108748890536"
            slot="2225682663"
            format="auto"
            responsive={true}
          />
        </div>
      </div>
    </div>
  );
};
