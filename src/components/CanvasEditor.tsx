import { forwardRef, useEffect, useRef, useImperativeHandle, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, FabricImage, FabricObject, Point } from "fabric";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Move } from "lucide-react";
import type { Tool } from "./PhotoEditor";
import { toast } from "sonner";

interface CanvasEditorProps {
  images: File[];
  baseImageIndex: number;
  currentTool: Tool;
}

export interface AnnotationData {
  id: number;
  type: string;
  position: {
    x: number;
    y: number;
    absolute: {
      left: number;
      top: number;
    };
  };
  // Rectangle properties
  width?: number;
  height?: number;
  // Circle properties
  radius?: number;
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string | object;
  // Common properties
  stroke?: string | object;
  strokeWidth?: number;
  // Visibility property
  visible?: boolean;
  // Reference to the actual fabric object
  fabricObject?: FabricObject;
}

export interface CanvasEditorRef {
  exportImage: () => void;
  clear: () => void;
  getCanvasDataURL: () => string;
  getCurrentImageDataURL: () => string;
  getOriginalImageDataURL: () => string;
  getAnnotationsData: () => AnnotationData[];
  loadGeneratedImage: (imageDataUrl: string) => void;
  toggleAnnotationVisibility: (annotationId: number) => void;
  removeAnnotation: (annotationId: number) => void;
  setOnAnnotationsChange: (callback: (annotations: AnnotationData[]) => void) => void;
  addText: (text: string) => void;
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ images, baseImageIndex, currentTool }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [zoom, setZoom] = useState(1);
    const [baseImage, setBaseImage] = useState<FabricImage | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const onAnnotationsChangeRef = useRef<((annotations: AnnotationData[]) => void) | undefined>();

    useImperativeHandle(ref, () => ({
      setOnAnnotationsChange: (callback) => {
        onAnnotationsChangeRef.current = callback;
      },
      exportImage: () => {
        if (fabricCanvas) {
          const objects = fabricCanvas.getObjects();
          const imageObjects = objects.filter(obj => obj.type === 'image') as FabricImage[];

          if (imageObjects.length > 0) {
            const baseImage = imageObjects[imageObjects.length - 1];
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d')!;

            const imgWidth = baseImage.getScaledWidth();
            const imgHeight = baseImage.getScaledHeight();
            tempCanvas.width = imgWidth;
            tempCanvas.height = imgHeight;

            const imgElement = baseImage.getElement() as HTMLImageElement;
            tempCtx.drawImage(imgElement, 0, 0, imgWidth, imgHeight);

            // Draw annotations on top
            objects.forEach(obj => {
              if (obj !== baseImage && obj.visible) {
                const relativeLeft = obj.left! - baseImage.left!;
                const relativeTop = obj.top! - baseImage.top!;

                if (obj.type === 'rect') {
                  const rect = obj as Rect;
                  tempCtx.strokeStyle = (rect.stroke as string) || '#000000';
                  tempCtx.lineWidth = (rect.strokeWidth || 1) * (imgWidth / baseImage.width!);
                  tempCtx.strokeRect(relativeLeft, relativeTop, rect.width!, rect.height!);
                } else if (obj.type === 'circle') {
                  const circle = obj as Circle;
                  tempCtx.strokeStyle = (circle.stroke as string) || '#000000';
                  tempCtx.lineWidth = (circle.strokeWidth || 1) * (imgWidth / baseImage.width!);
                  tempCtx.beginPath();
                  tempCtx.arc(
                    relativeLeft + circle.radius!,
                    relativeTop + circle.radius!,
                    circle.radius!,
                    0,
                    2 * Math.PI
                  );
                  tempCtx.stroke();
                } else if (obj.type === 'textbox' || obj.type === 'text') {
                  const text = obj as FabricText;
                  tempCtx.fillStyle = (text.fill as string) || '#000000';
                  tempCtx.font = `${text.fontSize! * (imgWidth / baseImage.width!)}px ${text.fontFamily || 'Arial'}`;
                  tempCtx.fillText(text.text!, relativeLeft, relativeTop + text.fontSize!);
                }
              }
            });

            const dataURL = tempCanvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `photobanana-edit-${Date.now()}.png`;
            link.href = dataURL;
            link.click();
            toast.success("Image exported successfully!");
          } else {
            toast.error("No image found to export");
          }
        }
      },
      clear: () => {
        if (fabricCanvas) {
          fabricCanvas.clear();
          fabricCanvas.backgroundColor = '#1a1a1a';
          fabricCanvas.renderAll();
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
      getCurrentImageDataURL: () => {
        if (!fabricCanvas) return '';

        // Get all objects on canvas
        const objects = fabricCanvas.getObjects();

        // Find the base image (the last image object, which should be the current one)
        const imageObjects = objects.filter(obj => obj.type === 'image') as FabricImage[];

        if (imageObjects.length === 0) return '';

        const currentImage = imageObjects[imageObjects.length - 1];

        // Create a temporary canvas to extract just the image data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = currentImage.width!;
        tempCanvas.height = currentImage.height!;

        // Get the image element and draw it to the temp canvas
        const imgElement = currentImage.getElement() as HTMLImageElement;
        tempCtx.drawImage(imgElement, 0, 0, currentImage.width!, currentImage.height!);

        return tempCanvas.toDataURL('image/png', 1.0);
      },
      getOriginalImageDataURL: () => {
        if (!baseImage) return '';
        const imgElement = baseImage.getElement() as HTMLImageElement;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = baseImage.width!;
        tempCanvas.height = baseImage.height!;
        tempCtx.drawImage(imgElement, 0, 0, baseImage.width!, baseImage.height!);
        return tempCanvas.toDataURL('image/png', 1.0);
      },
      getAnnotationsData: () => {
        if (!fabricCanvas || !baseImage) return [];

        const objects = fabricCanvas.getObjects();
        const annotations = objects.filter(obj =>
          obj !== baseImage &&
          (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'textbox' || obj.type === 'text')
        );

        return annotations.map((obj, index) => {
          const relativeLeft = obj.left! - baseImage.left!;
          const relativeTop = obj.top! - baseImage.top!;
          const imgWidth = baseImage.getScaledWidth();
          const imgHeight = baseImage.getScaledHeight();

          // Convert to percentage positions relative to the original image
          const xPercent = (relativeLeft / imgWidth) * 100;
          const yPercent = (relativeTop / imgHeight) * 100;

          const baseData = {
            id: index + 1,
            type: obj.type,
            visible: obj.visible !== false, // Default to true if not set
            position: {
              x: Math.round(xPercent),
              y: Math.round(yPercent),
              absolute: {
                left: Math.round(relativeLeft),
                top: Math.round(relativeTop)
              }
            }
          };

          if (obj.type === 'rect') {
            const rect = obj as Rect;
            return {
              ...baseData,
              width: Math.round(rect.width!),
              height: Math.round(rect.height!),
              stroke: rect.stroke,
              strokeWidth: rect.strokeWidth
            };
          } else if (obj.type === 'circle') {
            const circle = obj as Circle;
            return {
              ...baseData,
              radius: Math.round(circle.radius!),
              stroke: circle.stroke,
              strokeWidth: circle.strokeWidth
            };
          } else if (obj.type === 'textbox' || obj.type === 'text') {
            const text = obj as FabricText;
            return {
              ...baseData,
              text: text.text,
              fontSize: text.fontSize,
              fontFamily: text.fontFamily,
              fill: text.fill
            };
          }

          return baseData;
        });
      },
      loadGeneratedImage: async (imageDataUrl: string) => {
        if (!fabricCanvas) return;

        try {
          const objects = fabricCanvas.getObjects();
          const annotations = objects.filter(obj =>
            (obj.type === 'rect' && obj.stroke) ||
            (obj.type === 'circle' && obj.stroke) ||
            obj.type === 'textbox' ||
            obj.type === 'text'
          );

          fabricCanvas.clear();
          fabricCanvas.backgroundColor = '#1a1a1a';

          const img = await FabricImage.fromURL(imageDataUrl);
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
          setBaseImage(img); // Update baseImage to the newly loaded image

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
      toggleAnnotationVisibility: (annotationId: number) => {
        if (!fabricCanvas || !baseImage) return;

        const objects = fabricCanvas.getObjects();
        let annotationIndex = 0;

        for (const obj of objects) {
          if (obj !== baseImage &&
              (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'textbox' || obj.type === 'text')) {
            annotationIndex++;
            if (annotationIndex === annotationId) {
              obj.visible = !obj.visible;
              fabricCanvas.renderAll();
              break;
            }
          }
        }
      },
      removeAnnotation: (annotationId: number) => {
        if (!fabricCanvas || !baseImage) return;

        const objects = fabricCanvas.getObjects();
        let annotationIndex = 0;

        for (const obj of objects) {
          if (obj !== baseImage &&
              (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'textbox' || obj.type === 'text')) {
            annotationIndex++;
            if (annotationIndex === annotationId) {
              fabricCanvas.remove(obj);
              fabricCanvas.renderAll();
              break;
            }
          }
        }
      },
      addText: (text: string) => {
        if (!fabricCanvas) return;

        const textObj = new FabricText(text || 'Your text here', {
          left: fabricCanvas.width! / 2,
          top: fabricCanvas.height! / 2,
          fontFamily: 'Arial',
          fontSize: 20,
          fill: '#8b5cf6',
          selectable: true,
          evented: true,
          originX: 'center',
          originY: 'center',
        });

        fabricCanvas.add(textObj);
        fabricCanvas.setActiveObject(textObj);
        fabricCanvas.renderAll();
      }
    }));

    // Initialize canvas
    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const updateCanvasSize = () => {
        if (!containerRef.current || !fabricCanvas || !canvasRef.current) return;

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        try {
          // Check if canvas is still valid before updating
          if (fabricCanvas.disposed || !fabricCanvas.getElement()) {
            return;
          }

          fabricCanvas.setWidth(containerWidth);
          fabricCanvas.setHeight(containerHeight);
          fabricCanvas.renderAll();
        } catch (error) {
          console.error('Error updating canvas size:', error);
        }
      };

      const canvas = new FabricCanvas(canvasRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        backgroundColor: '#1a1a1a',
      });

      canvas.isDrawingMode = false;
      setFabricCanvas(canvas);
      updateCanvasSize();

      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(containerRef.current);

      return () => {
        try {
          canvas.dispose();
          if (containerRef.current) {
            resizeObserver.unobserve(containerRef.current);
          }
        } catch (error) {
          console.error('Error cleaning up canvas:', error);
        }
      };
    }, []); // Remove baseImage dependency to prevent infinite re-renders

    // Set up event listeners when canvas and baseImage are ready
    useEffect(() => {
      if (!fabricCanvas || !baseImage) return;

      // Notify parent component when annotations change
      const notifyAnnotationsChange = () => {
        if (onAnnotationsChangeRef.current && baseImage && fabricCanvas) {
          const objects = fabricCanvas.getObjects();
          const annotations = objects.filter(obj =>
            obj !== baseImage &&
            (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'textbox' || obj.type === 'text')
          );

          const annotationsData = annotations.map((obj, index) => {
            const relativeLeft = obj.left! - baseImage.left!;
            const relativeTop = obj.top! - baseImage.top!;
            const imgWidth = baseImage.getScaledWidth();
            const imgHeight = baseImage.getScaledHeight();

            // Convert to percentage positions relative to the original image
            const xPercent = (relativeLeft / imgWidth) * 100;
            const yPercent = (relativeTop / imgHeight) * 100;

            const baseData = {
              id: index + 1,
              type: obj.type,
              visible: obj.visible !== false,
              position: {
                x: Math.round(xPercent),
                y: Math.round(yPercent),
                absolute: {
                  left: Math.round(relativeLeft),
                  top: Math.round(relativeTop)
                }
              }
            };

            if (obj.type === 'rect') {
              const rect = obj as Rect;
              return {
                ...baseData,
                width: Math.round(rect.width!),
                height: Math.round(rect.height!),
                stroke: rect.stroke,
                strokeWidth: rect.strokeWidth
              };
            } else if (obj.type === 'circle') {
              const circle = obj as Circle;
              return {
                ...baseData,
                radius: Math.round(circle.radius!),
                stroke: circle.stroke,
                strokeWidth: circle.strokeWidth
              };
            } else if (obj.type === 'textbox' || obj.type === 'text') {
              const text = obj as FabricText;
              return {
                ...baseData,
                text: text.text,
                fontSize: text.fontSize,
                fontFamily: text.fontFamily,
                fill: text.fill
              };
            }

            return baseData;
          });

          onAnnotationsChangeRef.current(annotationsData);
        }
      };

      // Listen for canvas object changes
      fabricCanvas.on('object:added', (e) => {
        if (e.target && e.target.type !== 'image') {
          // Delay to ensure object is fully added
          setTimeout(notifyAnnotationsChange, 10);
        }
      });

      fabricCanvas.on('object:removed', (e) => {
        if (e.target && e.target.type !== 'image') {
          // Delay to ensure object is fully removed
          setTimeout(notifyAnnotationsChange, 10);
        }
      });

      fabricCanvas.on('object:modified', (e) => {
        if (e.target && e.target.type !== 'image') {
          // Delay to ensure object is fully modified
          setTimeout(notifyAnnotationsChange, 10);
        }
      });

      return () => {
        // Clean up event listeners
        fabricCanvas.off('object:added');
        fabricCanvas.off('object:removed');
        fabricCanvas.off('object:modified');
      };
    }, [fabricCanvas, baseImage]); // This effect runs when either canvas or baseImage changes

    // Set up callback when component mounts - this will be overridden by parent
    useEffect(() => {
      // This effect ensures the component is ready for the parent to set the callback
    }, []);

    // Load base image
    useEffect(() => {
      if (!fabricCanvas || !images[baseImageIndex]) return;

      const file = images[baseImageIndex];
      const reader = new FileReader();

      reader.onload = async (e) => {
        const imgUrl = e.target?.result as string;

        try {
          const img = await FabricImage.fromURL(imgUrl);

          if (baseImage) {
            fabricCanvas.remove(baseImage);
          }

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

      fabricCanvas.getObjects().forEach(obj => {
        if (obj.type === 'image') {
          obj.selectable = false;
          obj.evented = false;
        } else {
          obj.selectable = currentTool === "select";
          obj.evented = currentTool === "select";
        }
      });

      fabricCanvas.isDrawingMode = currentTool === "brush";
      fabricCanvas.selection = currentTool === "select";

      if (currentTool === "brush" && fabricCanvas.isDrawingMode) {
        const brush = fabricCanvas.freeDrawingBrush;
        if (brush) {
          brush.color = '#8b5cf6';
          brush.width = 3;
        }
      }

      switch (currentTool) {
        case "brush":
          fabricCanvas.defaultCursor = 'crosshair';
          break;
        case "eraser":
          fabricCanvas.defaultCursor = 'crosshair';
          break;
        case "select":
          fabricCanvas.defaultCursor = 'default';
          break;
        case "move":
          fabricCanvas.defaultCursor = 'grab';
          break;
        default:
          fabricCanvas.defaultCursor = 'default';
      }

      fabricCanvas.renderAll();
    }, [currentTool, fabricCanvas]);

    // Handle zoom
    const handleZoom = (delta: number) => {
      if (!fabricCanvas) return;

      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
      setZoom(newZoom);
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    };

    // Handle mouse interactions
    useEffect(() => {
      if (!fabricCanvas) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleMouseDown = (event: any) => {
        const pointer = fabricCanvas.getPointer(event);

        if (currentTool === "move") {
          setIsPanning(true);
          fabricCanvas.isDrawingMode = false;
          fabricCanvas.selection = false;
          fabricCanvas.defaultCursor = 'grab';
        } else if (currentTool === "eraser") {
          const target = fabricCanvas.findTarget(event);
          if (target && target.type !== 'image') {
            fabricCanvas.remove(target);
            fabricCanvas.renderAll();
          }
        } else if (currentTool === "select") {
          const target = fabricCanvas.findTarget(event);
          if (!target) {
            // Clicked on empty space, deselect all
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
          }
        } else if (currentTool === "rectangle") {
          const rect = new Rect({
            left: fabricCanvas.width! / 2,
            top: fabricCanvas.height! / 2,
            width: 100,
            height: 100,
            fill: 'transparent',
            stroke: '#8b5cf6',
            strokeWidth: 2,
            selectable: true,
            evented: true,
            originX: 'center',
            originY: 'center',
          });
          fabricCanvas.add(rect);
          fabricCanvas.setActiveObject(rect);
        } else if (currentTool === "circle") {
          const circle = new Circle({
            left: fabricCanvas.width! / 2,
            top: fabricCanvas.height! / 2,
            radius: 50,
            fill: 'transparent',
            stroke: '#8b5cf6',
            strokeWidth: 2,
            selectable: true,
            evented: true,
            originX: 'center',
            originY: 'center',
          });
          fabricCanvas.add(circle);
          fabricCanvas.setActiveObject(circle);
        } else if (currentTool === "text") {
          // Don't add text directly - let the parent handle text input prompt
          // The parent component will call a method to add text with user input
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleMouseMove = (event: any) => {
        if (isPanning) {
          fabricCanvas.relativePan(new Point(event.e.movementX || 0, event.e.movementY || 0));
          fabricCanvas.renderAll();
        }
      };

      const handleMouseUp = () => {
        if (isPanning) {
          setIsPanning(false);
          switch (currentTool) {
            case "brush":
              fabricCanvas.defaultCursor = 'crosshair';
              break;
            case "eraser":
              fabricCanvas.defaultCursor = 'crosshair';
              break;
            case "select":
              fabricCanvas.defaultCursor = 'default';
              break;
            case "move":
              fabricCanvas.defaultCursor = 'grab';
              break;
            default:
              fabricCanvas.defaultCursor = 'default';
          }
        }
      };

      fabricCanvas.on('mouse:down', handleMouseDown);
      fabricCanvas.on('mouse:move', handleMouseMove);
      fabricCanvas.on('mouse:up', handleMouseUp);

      return () => {
        fabricCanvas.off('mouse:down', handleMouseDown);
        fabricCanvas.off('mouse:move', handleMouseMove);
        fabricCanvas.off('mouse:up', handleMouseUp);
      };
    }, [fabricCanvas, currentTool, isPanning]);

    // Handle keyboard events for select tool
    useEffect(() => {
      if (!fabricCanvas) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (currentTool === "select") {
          if (event.key === 'Delete' || event.key === 'Backspace') {
            const activeObject = fabricCanvas.getActiveObject();
            if (activeObject && activeObject.type !== 'image') {
              fabricCanvas.remove(activeObject);
              fabricCanvas.renderAll();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [fabricCanvas, currentTool]);

    return (
      <div className="relative w-full h-full flex items-center justify-center" ref={containerRef}>
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

        <div className="border border-border rounded-lg shadow-panel">
          <canvas
            ref={canvasRef}
          />
        </div>
      </div>
    );
  }
);
