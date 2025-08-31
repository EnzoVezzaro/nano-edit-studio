import { forwardRef, useEffect, useRef, useImperativeHandle, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, FabricImage, FabricObject, Textbox, Point } from "fabric";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Move } from "lucide-react";
import type { Tool } from "./PhotoEditor";
import { toast } from "sonner";

interface CanvasEditorProps {
  images: File[];
  baseImageIndex: number;
  currentTool: Tool;
}

export interface CanvasEditorRef {
  exportImage: () => void;
  clear: () => void;
  getCanvasDataURL: () => string;
  loadGeneratedImage: (imageDataUrl: string) => void;
  removeElement: (element: FabricObject) => void;
  getElements: () => FabricObject[];
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ images, baseImageIndex, currentTool }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); // Ref for the container
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [zoom, setZoom] = useState(1);
    const [baseImage, setBaseImage] = useState<FabricImage | null>(null);
    const [isPanning, setIsPanning] = useState(false); // State for panning
    const [isDrawingShape, setIsDrawingShape] = useState(false);
    const [shapeStartPoint, setShapeStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentShapeObject, setCurrentShapeObject] = useState<FabricObject | null>(null);
    const [elements, setElements] = useState<FabricObject[]>([]);
    const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
      exportImage: () => {
        if (fabricCanvas) {
          const dataURL = fabricCanvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
          });

          const link = document.createElement('a');
          link.download = `photobanana-edit-${Date.now()}.png`;
          link.href = dataURL;
          link.click();

          toast.success("Image exported successfully!");
        }
      },
      clear: () => {
        if (fabricCanvas) {
          fabricCanvas.clear();
          fabricCanvas.backgroundColor = '#1a1a1a';
          fabricCanvas.renderAll();
          setElements([]);
        }
      },
      getCanvasDataURL: () => {
        if (!fabricCanvas) return '';
        return fabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1
        });
      },
      loadGeneratedImage: async (imageDataUrl: string) => {
        if (!fabricCanvas) return;

        try {
          // Clear canvas except for annotations
          const objects = fabricCanvas.getObjects();
          const annotations = objects.filter(obj =>
            (obj.type === 'rect' && obj.stroke) ||
            (obj.type === 'circle' && obj.stroke) ||
            obj.type === 'textbox'
          );

          fabricCanvas.clear();
          fabricCanvas.backgroundColor = '#1a1a1a';

          // Load the generated image
          const img = await FabricImage.fromURL(imageDataUrl);

          // Scale to fit canvas
          const canvasWidth = fabricCanvas.width!;
          const canvasHeight = fabricCanvas.height!;
          const scale = Math.min(
            canvasWidth / img.width!,
            canvasHeight / img.height!
          ) * 0.8;

          img.scale(scale);
          img.set({
            left: (canvasWidth - img.getScaledWidth()) / 2,
            top: (canvasHeight - img.getScaledHeight()) / 2,
            selectable: false,
            evented: false
          });

          fabricCanvas.add(img);
          fabricCanvas.sendObjectToBack(img);

          // Re-add annotations on top
          annotations.forEach(annotation => {
            fabricCanvas.add(annotation);
          });

          fabricCanvas.renderAll();
          toast.success("Generated image loaded!");

        } catch (error) {
          console.error('Error loading generated image:', error);
          toast.error('Failed to load generated image');
        }
      },
      removeElement: (element: FabricObject) => {
        if (fabricCanvas) {
          fabricCanvas.remove(element);
          setElements(prev => prev.filter(el => el !== element));
          fabricCanvas.renderAll();
        }
      },
      getElements: () => {
        return elements;
      }
    }));

    // Initialize canvas and handle resizing
    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const updateCanvasSize = () => {
        const containerWidth = containerRef.current!.clientWidth;
        const containerHeight = containerRef.current!.clientHeight;
        
        if (fabricCanvas) {
          fabricCanvas.setWidth(containerWidth);
          fabricCanvas.setHeight(containerHeight);
          fabricCanvas.renderAll();
        }
      };

      const canvas = new FabricCanvas(canvasRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: '#1a1a1a',
      });

      // Configure canvas for drawing mode - Fabric.js v6 syntax
      canvas.isDrawingMode = false;
      
      setFabricCanvas(canvas);

      // Set initial size
      updateCanvasSize();

      // Observe container for size changes
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(containerRef.current);

      return () => {
        canvas.dispose();
        resizeObserver.unobserve(containerRef.current!);
      };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Load base image
    useEffect(() => {
      if (!fabricCanvas || !images[baseImageIndex]) return;

      const file = images[baseImageIndex];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const imgUrl = e.target?.result as string;
        
        try {
          const img = await FabricImage.fromURL(imgUrl);
          
          // Clear previous base image
          if (baseImage) {
            fabricCanvas.remove(baseImage);
          }
          
          // Scale image to fit canvas
          const canvasWidth = fabricCanvas.width!;
          const canvasHeight = fabricCanvas.height!;
          const scale = Math.min(
            canvasWidth / img.width!,
            canvasHeight / img.height!
          ) * 0.8;
          
          img.scale(scale);
          img.set({
            left: (canvasWidth - img.getScaledWidth()) / 2,
            top: (canvasHeight - img.getScaledHeight()) / 2,
            selectable: false,
            evented: false
          });
          
          fabricCanvas.add(img);
          fabricCanvas.sendObjectToBack(img);
          setBaseImage(img);
          fabricCanvas.renderAll();
        } catch (error) {
          console.error('Error loading image:', error);
          toast.error('Failed to load image');
        }
      };
      
      reader.readAsDataURL(file);
    }, [fabricCanvas, images, baseImageIndex, baseImage]);

    // Handle tool changes
    useEffect(() => {
      if (!fabricCanvas) return;

      fabricCanvas.isDrawingMode = currentTool === "brush";
      fabricCanvas.selection = currentTool === "select";
      
      // Configure brush properties when in drawing mode
      if (currentTool === "brush" && fabricCanvas.isDrawingMode) {
        // In Fabric.js v6, we need to configure the brush differently
        const brush = fabricCanvas.freeDrawingBrush;
        if (brush) {
          brush.color = '#8b5cf6';
          brush.width = 3;
        }
      }
    }, [currentTool, fabricCanvas]);

    // Handle zoom
    const handleZoom = (delta: number) => {
      if (!fabricCanvas) return;
      
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
      setZoom(newZoom);
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    };

    // Handle panning and tool interactions
    useEffect(() => {
      if (!fabricCanvas) return;

      const handleMouseDown = (event: any) => {
        const pointer = fabricCanvas.getPointer(event.e);

        if (currentTool === "move") {
          setIsPanning(true);
          fabricCanvas.isDrawingMode = false;
          fabricCanvas.selection = false;
          fabricCanvas.defaultCursor = 'grab';
          setLastPointer({ x: event.e.clientX, y: event.e.clientY });
        } else if (currentTool === "rectangle") {
          const rect = new Rect({
            left: pointer.x - 50,
            top: pointer.y - 50,
            width: 100,
            height: 100,
            fill: 'transparent',
            stroke: '#8b5cf6',
            strokeWidth: 2,
            selectable: true,
            evented: true
          });
          fabricCanvas.add(rect);
          setElements(prev => [...prev, rect]);
          fabricCanvas.setActiveObject(rect);
        } else if (currentTool === "circle") {
          const circle = new Circle({
            left: pointer.x - 50,
            top: pointer.y - 50,
            radius: 50,
            fill: 'transparent',
            stroke: '#8b5cf6',
            strokeWidth: 2,
            selectable: true,
            evented: true
          });
          fabricCanvas.add(circle);
          setElements(prev => [...prev, circle]);
          fabricCanvas.setActiveObject(circle);
        } else if (currentTool === "text") {
          const text = new Textbox('Click to edit', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Arial',
            fontSize: 20,
            fill: '#8b5cf6',
            width: 200,
            selectable: true,
            evented: true
          });
          fabricCanvas.add(text);
          setElements(prev => [...prev, text]);
          fabricCanvas.setActiveObject(text);
        } else if (currentTool === "eraser") {
          const target = fabricCanvas.findTarget(event.e);
          if (target && target !== baseImage) {
            fabricCanvas.remove(target);
            setElements(prev => prev.filter(el => el !== target));
          }
        }
      };

      const handleMouseMove = (event: any) => {
        if (isPanning && lastPointer) {
          const deltaX = event.e.clientX - lastPointer.x;
          const deltaY = event.e.clientY - lastPointer.y;
          fabricCanvas.relativePan(new Point(deltaX, deltaY));
          setLastPointer({ x: event.e.clientX, y: event.e.clientY });
          fabricCanvas.renderAll();
        }
      };

      const handleMouseUp = (event: any) => {
        if (isPanning) {
          setIsPanning(false);
          fabricCanvas.defaultCursor = currentTool === 'select' ? 'default' : 'crosshair';
          setLastPointer(null);
        }
      };

      // Handle object selection for removal
      const handleSelectionCreated = (event: fabric.IEvent) => {
        if (currentTool === "eraser" && event.selected && event.selected.length > 0) {
          event.selected.forEach((obj: FabricObject) => {
            if (obj !== baseImage) {
              fabricCanvas.remove(obj);
              setElements(prev => prev.filter(el => el !== obj));
            }
          });
        }
      };

      fabricCanvas.on('mouse:down', handleMouseDown);
      fabricCanvas.on('mouse:move', handleMouseMove);
      fabricCanvas.on('mouse:up', handleMouseUp);
      fabricCanvas.on('selection:created', handleSelectionCreated);

      return () => {
        fabricCanvas.off('mouse:down', handleMouseDown);
        fabricCanvas.off('mouse:move', handleMouseMove);
        fabricCanvas.off('mouse:up', handleMouseUp);
        fabricCanvas.off('selection:created', handleSelectionCreated);
      };
    }, [fabricCanvas, currentTool, isPanning, lastPointer, baseImage]);

    return (
      <div className="relative w-full h-full flex items-center justify-center" ref={containerRef}>
        {/* Canvas Controls */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleZoom(-0.2)}
            disabled={zoom <= 0.1}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleZoom(0.2)}
            disabled={zoom >= 5}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm font-medium">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Canvas */}
        <div className="border border-border rounded-lg shadow-panel">
          <canvas 
            ref={canvasRef} 
          />
        </div>
      </div>
    );
  }
);
