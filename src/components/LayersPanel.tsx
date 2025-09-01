import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Eye,
  EyeOff,
  Star,
  Image as ImageIcon,
  Plus,
  Square,
  Circle,
  Type,
  Trash2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnnotationData } from "./CanvasEditor";

interface LayersPanelProps {
  images: File[];
  baseImageIndex: number;
  onBaseImageChange: (index: number) => void;
  annotations?: AnnotationData[];
  onToggleAnnotationVisibility?: (annotationId: number) => void;
  onRemoveAnnotation?: (annotationId: number) => void;
  onRefresh?: () => void;
}

export const LayersPanel = ({
  images,
  baseImageIndex,
  onBaseImageChange,
  annotations = [],
  onToggleAnnotationVisibility,
  onRemoveAnnotation,
  onRefresh
}: LayersPanelProps) => {
  return (
    <Card className="border-0 rounded-none border-t">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="w-5 h-5 text-primary" />
            Layers
          </CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="w-8 h-8 p-0"
              title="Refresh layers"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Base Image Selection */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Images</h4>
          <div className="space-y-2">
            {images.map((image, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                  baseImageIndex === index 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => onBaseImageChange(index)}
              >
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {image.name}
                    </span>
                    {baseImageIndex === index && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Base
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(image.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Canvas Elements */}
        {annotations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Canvas Elements</h4>
            <div className="space-y-2">
              {annotations.map((annotation) => {
                const getIcon = () => {
                  switch (annotation.type) {
                    case 'rect':
                      return <Square className="w-4 h-4" />;
                    case 'circle':
                      return <Circle className="w-4 h-4" />;
                    case 'text':
                    case 'textbox':
                      return <Type className="w-4 h-4" />;
                    default:
                      return <Square className="w-4 h-4" />;
                  }
                };

                const getElementName = () => {
                  switch (annotation.type) {
                    case 'rect':
                      return `Rectangle ${annotation.id}`;
                    case 'circle':
                      return `Circle ${annotation.id}`;
                    case 'text':
                    case 'textbox':
                      return annotation.text ? `"${annotation.text.substring(0, 20)}${annotation.text.length > 20 ? '...' : ''}"` : `Text ${annotation.id}`;
                    default:
                      return `Element ${annotation.id}`;
                  }
                };

                const getElementDetails = () => {
                  switch (annotation.type) {
                    case 'rect':
                      return `${annotation.width}x${annotation.height}px`;
                    case 'circle':
                      return `Radius: ${annotation.radius}px`;
                    case 'text':
                    case 'textbox':
                      return `Size: ${annotation.fontSize}px`;
                    default:
                      return '';
                  }
                };

                return (
                  <div
                    key={annotation.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                  >
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-primary">
                      {getIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {getElementName()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getElementDetails()} • Pos: ({annotation.position.x}%, {annotation.position.y}%)
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => onToggleAnnotationVisibility?.(annotation.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onRemoveAnnotation?.(annotation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add More Images */}
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
          disabled
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reference Image (next release)
        </Button>
        
        {/* Layer Info 
        <div className="mt-6 p-3 bg-gradient-surface rounded-lg border border-border/50">
          <h5 className="text-xs font-medium mb-2 text-primary">ℹ️ Layer Tips</h5>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Base image is used as the main canvas</li>
            <li>• Reference images help with style transfer</li>
            <li>• Multiple images enable fusion effects</li>
          </ul>
        </div>
        */}
      </CardContent>
    </Card>
  );
};
