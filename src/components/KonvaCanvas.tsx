import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Rect, Circle, Line, Transformer } from 'react-konva';
import Konva from 'konva';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

export interface ItemProp {
  type: 'rect' | 'circle' | 'text' | 'textbox' | 'image' | 'line' | 'path' | 'shape';
  value?: string;
  fill?: string;
  id: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  skewX?: number;
  skewY?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
}

interface KonvaCanvasProps {
  backgroundStyle?: React.CSSProperties;
  width: number;
  height: number;
  backgroundColor?: string;
  images?: File[];
  baseImageIndex?: number;
  currentTool?: string;
  addItem?: ItemProp;
  onChangeSelected?: (item: ItemProp | null) => void;
  selectedItemChange?: Partial<ItemProp>;
  maxStep?: number;
  stepInfo: ItemProp[];
  onChangeStep: (steps: ItemProp[]) => void;
  setWithdraw?: () => void;
  setRedo?: () => void;
  bindRef?: (ref: React.RefObject<any>) => void;
}

export const KonvaCanvas: React.FC<KonvaCanvasProps> = ({
  backgroundStyle = {},
  width,
  height,
  backgroundColor = '#1a1a1a',
  images = [],
  baseImageIndex = 0,
  currentTool = 'select',
  addItem,
  onChangeSelected,
  selectedItemChange,
  maxStep = 10,
  stepInfo,
  onChangeStep,
  setWithdraw,
  setRedo,
  bindRef
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const canvasMethodsRef = useRef<any>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<ItemProp[]>(stepInfo);
  const [history, setHistory] = useState<ItemProp[][]>([stepInfo]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [baseImage, setBaseImage] = useState<Konva.Image | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);

  // Bind ref
  useEffect(() => {
    if (bindRef && canvasMethodsRef.current) {
      bindRef(canvasMethodsRef);
    }
  }, [bindRef]);

  // Update items when stepInfo changes
  useEffect(() => {
    setItems(stepInfo);
  }, [stepInfo]);

  // Handle adding new items
  useEffect(() => {
    if (addItem) {
      const newItems = [...items, addItem];
      setItems(newItems);
      onChangeStep(newItems);
      addToHistory(newItems);
    }
  }, [addItem]);

  // Handle selected item changes
  useEffect(() => {
    if (selectedItemChange && selectedId !== null) {
      const updatedItems = items.map(item =>
        item.id === selectedId ? { ...item, ...selectedItemChange } : item
      );
      setItems(updatedItems);
      onChangeStep(updatedItems);
      addToHistory(updatedItems);
    }
  }, [selectedItemChange, selectedId]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current) {
      if (selectedId !== null) {
        // Find the selected node
        const selectedNode = stageRef.current?.findOne(`#${selectedId}`);
        if (selectedNode) {
          transformerRef.current.nodes([selectedNode]);
        }
      } else {
        // Clear transformer when nothing is selected
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedId]);

  // Load base image
  useEffect(() => {
    if (!images[baseImageIndex]) {
      setBaseImage(null);
      return;
    }

    const file = images[baseImageIndex];
    const reader = new FileReader();

    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;

      const img = new window.Image();
      img.onload = () => {
        const konvaImage = new Konva.Image({
          image: img,
          width: img.width,
          height: img.height,
          x: (width - img.width) / 2,
          y: (height - img.height) / 2,
          draggable: false,
        });
        setBaseImage(konvaImage);
      };
      img.src = imgUrl;
    };

    reader.readAsDataURL(file);
  }, [images, baseImageIndex, width, height]);

  const addToHistory = useCallback((newItems: ItemProp[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    if (newHistory.length > maxStep) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, maxStep]);

  const handleSelect = useCallback((item: ItemProp | null) => {
    setSelectedId(item?.id || null);
    onChangeSelected?.(item);
  }, [onChangeSelected]);

  const handleTextClick = useCallback((item: ItemProp, e: any) => {
    if (item.type === 'text') {
      const textPosition = e.target.getAbsolutePosition();
      const stageBox = stageRef.current?.container().getBoundingClientRect();
      if (stageBox) {
        setTextInputPosition({
          x: stageBox.left + textPosition.x,
          y: stageBox.top + textPosition.y
        });
        setTextInputValue(item.value || '');
        setEditingTextId(item.id);
        setIsEditingText(true);
      }
    }
  }, []);

  const handleTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextInputValue(newValue);

    // Update the text element in real-time
    if (editingTextId !== null) {
      const updatedItems = items.map(item =>
        item.id === editingTextId
          ? { ...item, value: newValue }
          : item
      );
      setItems(updatedItems);
      onChangeStep(updatedItems);
    }
  }, [editingTextId, items, onChangeStep]);

  const handleTextInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      finishTextEditing();
    } else if (e.key === 'Escape') {
      setIsEditingText(false);
      setEditingTextId(null);
    }
  }, []);

  const finishTextEditing = useCallback(() => {
    if (editingTextId !== null) {
      const updatedItems = items.map(item =>
        item.id === editingTextId
          ? { ...item, value: textInputValue }
          : item
      );
      setItems(updatedItems);
      onChangeStep(updatedItems);
      addToHistory(updatedItems);
    }
    setIsEditingText(false);
    setEditingTextId(null);
  }, [editingTextId, textInputValue, items, onChangeStep, addToHistory]);

  const handleDragEnd = useCallback((e: any, id: number) => {
    const updatedItems = items.map(item =>
      item.id === id
        ? { ...item, x: e.target.x(), y: e.target.y() }
        : item
    );
    setItems(updatedItems);
    onChangeStep(updatedItems);
    addToHistory(updatedItems);
  }, [items, onChangeStep, addToHistory]);

  const handleTransformEnd = useCallback((e: any, id: number) => {
    const node = e.target;
    const updatedItems = items.map(item =>
      item.id === id
        ? {
            ...item,
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation()
          }
        : item
    );
    setItems(updatedItems);
    onChangeStep(updatedItems);
    addToHistory(updatedItems);
  }, [items, onChangeStep, addToHistory]);

  const withdraw = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      setItems(previousState);
      setHistoryIndex(newIndex);
      onChangeStep(previousState);
      setWithdraw?.();
    }
  }, [history, historyIndex, onChangeStep, setWithdraw]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setItems(nextState);
      setHistoryIndex(newIndex);
      onChangeStep(nextState);
      setRedo?.();
    }
  }, [history, historyIndex, onChangeStep, setRedo]);

  const deleteItem = useCallback(() => {
    if (selectedId !== null) {
      const updatedItems = items.filter(item => item.id !== selectedId);
      setItems(updatedItems);
      setSelectedId(null);
      onChangeStep(updatedItems);
      addToHistory(updatedItems);
      onChangeSelected?.(null);
    }
  }, [selectedId, items, onChangeStep, addToHistory, onChangeSelected]);

  const exportToImage = useCallback((fileName: string = 'canvas-export', options?: any) => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({
        mimeType: options?.fileType || 'image/png',
        quality: options?.quality || 1,
        pixelRatio: options?.scale || 1
      });

      const link = document.createElement('a');
      link.download = `${fileName}.${options?.fileType?.split('/')[1] || 'png'}`;
      link.href = dataURL;
      link.click();
    }
  }, []);

  const exportToBASE64 = useCallback(() => {
    if (stageRef.current) {
      return stageRef.current.toDataURL();
    }
    return '';
  }, []);

  const canvasScale = useCallback((ratio: number) => {
    setZoom(Math.max(0.1, Math.min(2.75, ratio)));
  }, []);

  // Expose methods to parent
  React.useImperativeHandle(canvasMethodsRef, () => ({
    withdraw,
    redo,
    deleteItem,
    exportToImage,
    exportToBASE64,
    canvasScale,
    getItems: () => items,
    setSelectedIndex: (id: number) => setSelectedId(id),
    clearSelected: () => setSelectedId(null)
  }));

  const renderItem = (item: ItemProp) => {
    const isSelected = selectedId === item.id;

    const commonProps = {
      id: item.id.toString(),
      x: item.x,
      y: item.y,
      scaleX: item.scaleX || 1,
      scaleY: item.scaleY || 1,
      rotation: item.rotation || 0,
      draggable: true, // Always allow dragging for better UX
      onClick: (e: any) => {
        if (currentTool === 'eraser') {
          // Handle eraser tool
          const targetId = parseInt(e.target.id());
          const newItems = items.filter(item => item.id !== targetId);
          setItems(newItems);
          onChangeStep(newItems);
          addToHistory(newItems);
          onChangeSelected?.(null); // Clear selection after erasing
          e.cancelBubble = true;
        } else {
          // Always allow selection
          handleSelect(item);

          // Handle special cases
          if (currentTool === 'text' && item.type === 'text') {
            // Allow text editing when text tool is selected
            handleTextClick(item, e);
          }
        }
      },
      onTap: (e: any) => {
        handleSelect(item);
      },
      onDragEnd: (e: any) => handleDragEnd(e, item.id),
      onTransformEnd: (e: any) => handleTransformEnd(e, item.id),
      ref: isSelected ? (node: any) => {
        if (node && transformerRef.current) {
          transformerRef.current.nodes([node]);
        }
      } : undefined
    };

    switch (item.type) {
      case 'text':
        return (
          <Text
            key={item.id}
            {...commonProps}
            text={item.value || 'Text'}
            fontSize={item.fontSize || 20}
            fontFamily={item.fontFamily || 'Arial'}
            fill={item.fill || '#8b5cf6'}
          />
        );

      case 'rect':
        return (
          <Rect
            key={item.id}
            {...commonProps}
            width={item.width || 100}
            height={item.height || 100}
            fill={item.fill || 'transparent'}
            stroke={item.stroke || '#8b5cf6'}
            strokeWidth={item.strokeWidth || 2}
          />
        );

      case 'circle':
        return (
          <Circle
            key={item.id}
            {...commonProps}
            radius={item.width || 50}
            fill={item.fill || 'transparent'}
            stroke={item.stroke || '#8b5cf6'}
            strokeWidth={item.strokeWidth || 2}
          />
        );

      case 'line':
        return (
          <Line
            key={item.id}
            {...commonProps}
            points={item.points || [0, 0, 100, 100]}
            stroke={item.stroke || '#8b5cf6'}
            strokeWidth={item.strokeWidth || 2}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
          />
        );

      case 'image':
        // For images, we'd need to load them first
        return null;

      default:
        return null;
    }
  };

  return (
    <div style={{ ...backgroundStyle, position: 'relative' }}>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}
          disabled={zoom <= 0.1}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setZoom(Math.min(2.75, zoom + 0.2))}
          disabled={zoom >= 2.75}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={zoom}
        scaleY={zoom}
        style={{ backgroundColor }}
        onMouseDown={(e) => {
          const pointer = stageRef.current?.getPointerPosition();
          if (!pointer) return;

          // Check if clicked on an existing element
          const clickedOnElement = e.target !== stageRef.current;

          if (currentTool === 'move') {
            setIsPanning(true);
            setLastPointer({ x: pointer.x, y: pointer.y });
          } else if (currentTool === 'select') {
            // Selection is handled by individual elements
            if (!clickedOnElement) {
              setSelectedId(null);
              onChangeSelected?.(null);
            }
          } else if (currentTool === 'brush' && !clickedOnElement) {
            setIsDrawing(true);
            setCurrentLine([pointer.x, pointer.y]);
          } else if (currentTool === 'rectangle' && !clickedOnElement) {
            const newItem: ItemProp = {
              type: 'rect',
              id: Date.now(),
              x: pointer.x - 50,
              y: pointer.y - 50,
              width: 100,
              height: 100,
              fill: 'transparent',
              stroke: '#8b5cf6',
              strokeWidth: 2,
              scaleX: 1,
              scaleY: 1,
              rotation: 0
            };
            const newItems = [...items, newItem];
            setItems(newItems);
            onChangeStep(newItems);
            addToHistory(newItems);
          } else if (currentTool === 'circle' && !clickedOnElement) {
            const newItem: ItemProp = {
              type: 'circle',
              id: Date.now(),
              x: pointer.x - 50,
              y: pointer.y - 50,
              width: 100,
              height: 100,
              fill: 'transparent',
              stroke: '#8b5cf6',
              strokeWidth: 2,
              scaleX: 1,
              scaleY: 1,
              rotation: 0
            };
            const newItems = [...items, newItem];
            setItems(newItems);
            onChangeStep(newItems);
            addToHistory(newItems);
          } else if (currentTool === 'text' && !clickedOnElement) {
            const newItem: ItemProp = {
              type: 'text',
              id: Date.now(),
              x: pointer.x,
              y: pointer.y,
              value: 'Click to edit',
              fontSize: 20,
              fontFamily: 'Arial',
              fill: '#8b5cf6',
              scaleX: 1,
              scaleY: 1,
              rotation: 0
            };
            const newItems = [...items, newItem];
            setItems(newItems);
            onChangeStep(newItems);
            addToHistory(newItems);
          } else if (currentTool === 'eraser' && clickedOnElement) {
            const target = e.target;
            if (target !== stageRef.current && target.id()) {
              const targetId = parseInt(target.id());
              const newItems = items.filter(item => item.id !== targetId);
              setItems(newItems);
              onChangeStep(newItems);
              addToHistory(newItems);
            }
          }
        }}
        onMouseMove={(e) => {
          if (isPanning && lastPointer) {
            const pointer = stageRef.current?.getPointerPosition();
            if (pointer) {
              const deltaX = pointer.x - lastPointer.x;
              const deltaY = pointer.y - lastPointer.y;
              stageRef.current?.x(stageRef.current.x() + deltaX);
              stageRef.current?.y(stageRef.current.y() + deltaY);
              setLastPointer({ x: pointer.x, y: pointer.y });
            }
          } else if (isDrawing) {
            const pointer = stageRef.current?.getPointerPosition();
            if (pointer) {
              setCurrentLine(prev => [...prev, pointer.x, pointer.y]);
            }
          }
        }}
        onMouseUp={() => {
          if (isDrawing && currentLine.length > 2) {
            const newItem: ItemProp = {
              type: 'line',
              id: Date.now(),
              x: 0,
              y: 0,
              points: currentLine,
              stroke: '#8b5cf6',
              strokeWidth: 3,
              scaleX: 1,
              scaleY: 1,
              rotation: 0
            };
            const newItems = [...items, newItem];
            setItems(newItems);
            onChangeStep(newItems);
            addToHistory(newItems);
            setCurrentLine([]);
            setIsDrawing(false);
          } else {
            setIsPanning(false);
            setLastPointer(null);
            setIsDrawing(false);
            setCurrentLine([]);
          }
        }}
      >
        {/* Main Layer */}
        <Layer>
          {/* Base Image - render first (behind everything) */}
          {baseImage && (
            <KonvaImage
              image={baseImage.image()}
              width={baseImage.width()}
              height={baseImage.height()}
              x={baseImage.x()}
              y={baseImage.y()}
              listening={false} // Don't capture mouse events
            />
          )}

          {/* Drawing elements - render on top of image */}
          {items.map(renderItem)}
          {isDrawing && currentLine.length > 2 && (
            <Line
              points={currentLine}
              stroke="#8b5cf6"
              strokeWidth={3}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation="source-over"
            />
          )}

          {/* Transformer - render last (on top of everything) */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      {/* Text Input for Editing */}
      {isEditingText && (
        <input
          type="text"
          value={textInputValue}
          onChange={handleTextInputChange}
          onKeyDown={handleTextInputKeyDown}
          onBlur={finishTextEditing}
          style={{
            position: 'absolute',
            top: textInputPosition.y,
            left: textInputPosition.x,
            fontSize: '16px',
            padding: '4px',
            border: '1px solid #8b5cf6',
            borderRadius: '4px',
            backgroundColor: 'white',
            color: 'black',
            zIndex: 1000,
            minWidth: '200px'
          }}
          autoFocus
        />
      )}
    </div>
  );
};
