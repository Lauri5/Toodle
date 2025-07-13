import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import bin from '../assets/bin.png';
import redoIcon from '../assets/redo.png';
import undoIcon from '../assets/undo.png';
import brushSizeIcon from '../assets/brush-size.png';
import eyedropper from '../assets/eyedropper.png';
import bucket from '../assets/bucket.png';
import circle from '../assets/circle.png';
import ellipse from '../assets/ellipse.png';
import rect from '../assets/rect.png';
import eraser from '../assets/eraser.png';
import brush from '../assets/brush.png';
import lineIcon from '../assets/line.png'; 

const predefinedColors = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080"
];

const GameCanvas = ({ onSave, disabled, onSubmitCreation, onNotReady }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  // Offscreen canvas for high-resolution storage
  const offscreenCanvasRef = useRef(null);
  const offscreenContextRef = useRef(null);

  const creationRef = useRef(false);
  const toolRef = useRef("brush");
  const colorRef = useRef("#000000");
  const brushSizeRef = useRef(5);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const savedCanvasRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const drawBool = useRef(true);
  const mobileTouch = useRef(false);
  const isCreationStartedInside = useRef(false);
  const isMouseInCanvas = useRef(true);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const movementOccurredRef = useRef(false);

  // Base resolution at which we store creation in the offscreen canvas
  const baseWidthRef = useRef(null);
  const baseHeightRef = useRef(null);

  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState("brush");

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button === 0 && isMouseInCanvas.current) {
        drawBool.current = true;
        isCreationStartedInside.current = true; // Mousedown inside canvas
      } else {
        drawBool.current = false;
        isCreationStartedInside.current = false; // Mousedown outside canvas
      }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) {
        drawBool.current = false;
        isCreationStartedInside.current = false; // Reset on mouseup
      }
    };
  
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
  
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const hexToRgba = useCallback((hex) => {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split("");
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = "0x" + c.join("");
      return {
        r: (c >> 16) & 255,
        g: (c >> 8) & 255,
        b: c & 255,
        a: 255,
      };
    }
    throw new Error("Bad Hex");
  }, []);

  const getColorAtPixel = useCallback((data, pos) => {
    return {
      r: data[pos],
      g: data[pos + 1],
      b: data[pos + 2],
      a: data[pos + 3],
    };
  }, []);

  const colorsMatch = useCallback((a, b) => {
    const tolerance = 50;
    return (
      Math.abs(a.r - b.r) < tolerance &&
      Math.abs(a.g - b.g) < tolerance &&
      Math.abs(a.b - b.b) < tolerance &&
      Math.abs(a.a - b.a) < tolerance
    );
  }, []);

  const getBrushIconSize = (size) => {
    const minSize = 2;
    const maxSize = 60;
    const minVmin = 0.1;
    const maxVmin = 4;
    const clampedSize = Math.min(Math.max(size, minSize), maxSize);
    const vminSize = minVmin + ((clampedSize - minSize) / (maxSize - minSize)) * (maxVmin - minVmin);
    return `${vminSize}vmin`;
  };

  const restoreState = useCallback((dataURL) => {
    const offscreenContext = offscreenContextRef.current;
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
      offscreenContext.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
      offscreenContext.drawImage(img, 0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
      redrawToVisibleCanvas();
    };
  }, []);

  const saveState = useCallback(() => {
    // Save offscreenCanvas data
    const dataURL = offscreenCanvasRef.current.toDataURL();
    undoStackRef.current.push(dataURL);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const redrawToVisibleCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    const ow = offscreenCanvasRef.current.width;
    const oh = offscreenCanvasRef.current.height;
    const vw = canvas.width;
    const vh = canvas.height;
    context.clearRect(0, 0, vw, vh);
    // Draw the offscreen at the visible canvas size
    context.drawImage(offscreenCanvasRef.current, 0, 0, ow, oh, 0, 0, vw, vh);
  }, []);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    contextRef.current = context;

    // Create offscreen canvas once
    if (!offscreenCanvasRef.current) {
      const rect = canvas.getBoundingClientRect();
      // Use the initial size as our "base" resolution
      const baseWidth = Math.floor(rect.width * (window.devicePixelRatio || 1));
      const baseHeight = Math.floor(rect.height * (window.devicePixelRatio || 1));
      baseWidthRef.current = baseWidth;
      baseHeightRef.current = baseHeight;

      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = baseWidth;
      offscreenCanvasRef.current.height = baseHeight;
      offscreenContextRef.current = offscreenCanvasRef.current.getContext('2d');
      offscreenContextRef.current.fillStyle = "#ffffff";
      offscreenContextRef.current.fillRect(0, 0, baseWidth, baseHeight);
      saveState();
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      redrawToVisibleCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [redrawToVisibleCanvas, saveState]);

  const fillArea = useCallback((x, y) => {
    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;
    const width = offscreenCanvasRef.current.width;
    const height = offscreenCanvasRef.current.height;

    const imageData = offscreenContext.getImageData(0, 0, width, height);
    const data = imageData.data;
    const stack = [];
    const pos = (Math.floor(y) * width + Math.floor(x)) * 4;
    const startColor = {
      r: data[pos],
      g: data[pos + 1],
      b: data[pos + 2],
      a: data[pos + 3],
    };
    const fillColor = hexToRgba(colorRef.current);
    if (colorsMatch(startColor, fillColor)) {
      return;
    }
    stack.push({ x: Math.floor(x), y: Math.floor(y) });
    while (stack.length) {
      const { x: currentX, y: currentY } = stack.pop();
      const currentPos = (currentY * width + currentX) * 4;
      if (!colorsMatch(getColorAtPixel(data, currentPos), startColor)) {
        continue;
      }
      data[currentPos] = fillColor.r;
      data[currentPos + 1] = fillColor.g;
      data[currentPos + 2] = fillColor.b;
      data[currentPos + 3] = fillColor.a;
      if (currentX + 1 < width) stack.push({ x: currentX + 1, y: currentY });
      if (currentX - 1 >= 0) stack.push({ x: currentX - 1, y: currentY });
      if (currentY + 1 < height) stack.push({ x: currentX, y: currentY + 1 });
      if (currentY - 1 >= 0) stack.push({ x: currentX, y: currentY - 1 });
    }
    offscreenContext.putImageData(imageData, 0, 0);
    saveState();
    redrawToVisibleCanvas();
  }, [colorsMatch, getColorAtPixel, hexToRgba, redrawToVisibleCanvas, saveState]);

  const setCreationStyle = useCallback((context) => {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = toolRef.current === "eraser" ? "#ffffff" : colorRef.current;
    context.lineWidth = brushSizeRef.current;
  }, []);

  const drawShape = useCallback((isPreview, x, y) => {
    if (!isCreationStartedInside.current && !mobileTouch.current) return; // Ensure creation started inside
    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;
    setCreationStyle(offscreenContext);

    if (!savedCanvasRef.current) return;

    offscreenContext.putImageData(savedCanvasRef.current, 0, 0);

    if (toolRef.current === "rectangle") {
      offscreenContext.strokeRect(startXRef.current, startYRef.current, x - startXRef.current, y - startYRef.current);
    } else if (toolRef.current === "circle") {
      const radius = Math.sqrt((x - startXRef.current) ** 2 + (y - startYRef.current) ** 2);
      offscreenContext.beginPath();
      offscreenContext.arc(startXRef.current, startYRef.current, radius, 0, 2 * Math.PI);
      offscreenContext.stroke();
    } else if (toolRef.current === "ellipse") {
      const radiusX = Math.abs(x - startXRef.current) / 2;
      const radiusY = Math.abs(y - startYRef.current) / 2;
      const centerX = (x + startXRef.current) / 2;
      const centerY = (y + startYRef.current) / 2;
      offscreenContext.beginPath();
      offscreenContext.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      offscreenContext.stroke();
    } else if (toolRef.current === "line") {
      offscreenContext.beginPath();
      offscreenContext.moveTo(startXRef.current, startYRef.current);
      offscreenContext.lineTo(x, y);
      offscreenContext.stroke();
    }

    if (!isPreview) {
      redrawToVisibleCanvas();
    }
  }, [redrawToVisibleCanvas, setCreationStyle]);

  const getEventCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return {};
    const rect = canvas.getBoundingClientRect();
    const scaleX = offscreenCanvasRef.current.width / (rect.width * (window.devicePixelRatio || 1));
    const scaleY = offscreenCanvasRef.current.height / (rect.height * (window.devicePixelRatio || 1));
    let cx, cy;
    if (e.type.startsWith('touch')) {
      if (e.touches.length !== 1) return {};
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * (window.devicePixelRatio || 1);
      const y = (touch.clientY - rect.top) * (window.devicePixelRatio || 1);
      cx = x * scaleX;
      cy = y * scaleY;
    } else {
      const x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
      const y = (e.clientY - rect.top) * (window.devicePixelRatio || 1);
      cx = x * scaleX;
      cy = y * scaleY;
    }
    return { x: cx, y: cy };
  }, []);

  const draw = useCallback((e) => {
    if (!mobileTouch.current && (!creationRef.current || disabled || !drawBool.current)) return;
    const { x, y } = getEventCoords(e);
    if (x === undefined || y === undefined) return;

    lastXRef.current = x;
    lastYRef.current = y;

    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;

    if (toolRef.current === "brush" || toolRef.current === "eraser") {
      movementOccurredRef.current = true;
      setCreationStyle(offscreenContext);
      offscreenContext.lineTo(x, y);
      offscreenContext.stroke();
      offscreenContext.beginPath();
      offscreenContext.moveTo(x, y);
      redrawToVisibleCanvas();
    } else if (["circle", "rectangle", "ellipse", "line"].includes(toolRef.current)) {
      // preview shape
      if (savedCanvasRef.current) {
        offscreenContext.putImageData(savedCanvasRef.current, 0, 0);
        drawShape(true, x, y);
        redrawToVisibleCanvas();
      }
    }
  }, [disabled, drawShape, getEventCoords, redrawToVisibleCanvas, setCreationStyle]);

  const endCreation = useCallback((e) => {
    if (!mobileTouch.current && (!creationRef.current || disabled || !isCreationStartedInside.current)) return;
    creationRef.current = false;
    isCreationStartedInside.current = false;
    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;

    if (["brush", "eraser"].includes(toolRef.current)) {
      if (!movementOccurredRef.current) {
        // Draw a single dot
        const x = lastXRef.current;
        const y = lastYRef.current;
        setCreationStyle(offscreenContext);
        offscreenContext.beginPath();
        offscreenContext.arc(x, y, brushSizeRef.current / 2, 0, Math.PI * 2);
        offscreenContext.fillStyle = toolRef.current === 'eraser' ? '#ffffff' : colorRef.current;
        offscreenContext.fill();
      }
      offscreenContext.beginPath();
      saveState();
      redrawToVisibleCanvas();
      if (onSave) {
        const dataURL = offscreenCanvasRef.current.toDataURL();
        onSave(dataURL);
      }
    } else if (["circle", "rectangle", "ellipse", "line"].includes(toolRef.current)) {
      const { x, y } = e.type.startsWith("touch") ? { x: lastXRef.current, y: lastYRef.current } : getEventCoords(e);
      drawShape(false, x, y);
      saveState();
      if (onSave) {
        const dataURL = offscreenCanvasRef.current.toDataURL();
        onSave(dataURL);
      }
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
      window.removeEventListener('touchcancel', handleGlobalMouseUp);
    }
  }, [disabled, drawShape, getEventCoords, onSave, redrawToVisibleCanvas, saveState, setCreationStyle]);

  const handleGlobalMouseMove = useCallback(
    (e) => {
      draw(e);
    },
    [draw]
  );

  const handleGlobalMouseUp = useCallback(
    (e) => {
      endCreation(e);
      if (!isMouseInCanvas.value)
        saveState();
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalMouseMove);
      window.removeEventListener("touchend", handleGlobalMouseUp);
      window.removeEventListener("touchcancel", handleGlobalMouseUp);
    },
    [endCreation, handleGlobalMouseMove]
  );

  const startCreating = useCallback(
    (e) => {
      if (e.button !== 0 || disabled) return;
      const { x, y } = getEventCoords(e);
      if (x === undefined || y === undefined) return;
      const offscreenContext = offscreenContextRef.current;
      if (!offscreenContext) return;

      if (toolRef.current === "fill") {
        creationRef.current = false; // No creation state needed
        saveState();
        fillArea(x, y);
        if (onSave) {
          const dataURL = offscreenCanvasRef.current.toDataURL();
          onSave(dataURL);
        }
        return;
      }

      if (toolRef.current === "eyedropper") {
        const imageData = offscreenContext.getImageData(x, y, 1, 1).data;
        const pickedColor = `#${((1 << 24) + (imageData[0] << 16) + (imageData[1] << 8) + imageData[2]).toString(16).slice(1)}`;
        setColor(pickedColor);
        setTool("brush");
        return;
      }

      // Existing handling for brush, eraser, and shapes
      if (e.button === 0 && isMouseInCanvas.current) {
        creationRef.current = true;
        isCreationStartedInside.current = true; // Set flag when starting to draw
        movementOccurredRef.current = false;
        if (["brush", "eraser"].includes(toolRef.current)) {
          setCreationStyle(offscreenContext);
          offscreenContext.beginPath();
          offscreenContext.moveTo(x, y);
          lastXRef.current = x;
          lastYRef.current = y;
        } else if (["circle", "rectangle", "ellipse", "line"].includes(toolRef.current)) {
          startXRef.current = x;
          startYRef.current = y;
          try {
            savedCanvasRef.current = offscreenContext.getImageData(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
          } catch (err) {
            console.warn("Failed to get ImageData in startCreating:", err);
            savedCanvasRef.current = null;
          }
          window.addEventListener("mousemove", handleGlobalMouseMove);
          window.addEventListener("mouseup", handleGlobalMouseUp);
          window.addEventListener("touchmove", handleGlobalMouseMove, { passive: false });
          window.addEventListener("touchend", handleGlobalMouseUp);
          window.addEventListener("touchcancel", handleGlobalMouseUp);
        }
      }
    },
    [disabled, fillArea, getEventCoords, handleGlobalMouseMove, handleGlobalMouseUp, onSave, saveState, setCreationStyle]
  );

  const startCreatingTouch = useCallback((e) => {
    mobileTouch.current = true;
    e.preventDefault();
    if (e.touches.length !== 1 || disabled) return;
    movementOccurredRef.current = false;
    const { x, y } = getEventCoords(e);
    if (x === undefined || y === undefined) return;
    const offscreenContext = offscreenContextRef.current;
    creationRef.current = true;

    if (toolRef.current === "brush" || toolRef.current === "eraser") {
      setCreationStyle(offscreenContext);
      offscreenContext.beginPath();
      offscreenContext.moveTo(x, y);
      lastXRef.current = x;
      lastYRef.current = y;
      isCreationStartedInside.current = true; // Creation started inside
    } else if (["circle", "rectangle", "ellipse", "line"].includes(toolRef.current)) {
      startXRef.current = x;
      startYRef.current = y;
      try {
        savedCanvasRef.current = offscreenContext.getImageData(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
      } catch (err) {
        console.warn("Failed to get ImageData in startCreatingTouch:", err);
        savedCanvasRef.current = null;
      }
      window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
      window.addEventListener('touchend', handleGlobalMouseUp);
      window.addEventListener('touchcancel', handleGlobalMouseUp);
      isCreationStartedInside.current = true; // Creation started inside
    } else if (toolRef.current === "fill") {
      saveState();
      fillArea(x, y);
    } else if (toolRef.current === "eyedropper") {
      const imageData = offscreenContext.getImageData(x, y, 1, 1).data;
      const pickedColor = `#${((1 << 24) + (imageData[0] << 16) + (imageData[1] << 8) + imageData[2]).toString(16).slice(1)}`;
      setColor(pickedColor);
      setTool("brush");
    }
  }, [disabled, fillArea, getEventCoords, handleGlobalMouseMove, handleGlobalMouseUp, saveState, setCreationStyle]);

  const handleMouseLeave = useCallback(() => {
    isMouseInCanvas.current = false;
    if (creationRef.current && !["circle", "rectangle", "ellipse", "line"].includes(toolRef.current)) {
      offscreenContextRef.current.beginPath();
      creationRef.current = false;
      isCreationStartedInside.current = false; // Reset flag
      saveState();
    }
  }, []);

  const handleMouseEnter = useCallback((e) => {
    isMouseInCanvas.current = true;
    if (e.buttons === 1 && !creationRef.current && !disabled) {
      const { x, y } = getEventCoords(e);
      if (x === undefined || y === undefined) return;
      const offscreenContext = offscreenContextRef.current;
      setCreationStyle(offscreenContext);
      offscreenContext.beginPath();
      offscreenContext.moveTo(x, y);
      creationRef.current = true;
      movementOccurredRef.current = false;
      isCreationStartedInside.current = true; // Creation started inside

      if (["circle", "rectangle", "ellipse", "line"].includes(toolRef.current)) {
        try {
          savedCanvasRef.current = offscreenContext.getImageData(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
          window.addEventListener('mousemove', handleGlobalMouseMove);
          window.addEventListener('mouseup', handleGlobalMouseUp);
        } catch (err) {
          console.warn("Failed to get ImageData in handleMouseEnter:", err);
          savedCanvasRef.current = null;
        }
      }
    }
  }, [disabled, getEventCoords, handleGlobalMouseMove, handleGlobalMouseUp, setCreationStyle]);

  const undo = useCallback(() => {
    if (disabled) return;
    const undoStack = undoStackRef.current;
    const redoStack = redoStackRef.current;
    if (undoStack.length > 1) {
      const dataURL = undoStack.pop();
      redoStack.push(dataURL);
      const previousState = undoStack[undoStack.length - 1];
      restoreState(previousState);
      if (onSave) {
        onSave(previousState);
      }
    }
  }, [disabled, onSave, restoreState]);

  const redo = useCallback(() => {
    if (disabled) return;
    const undoStack = undoStackRef.current;
    const redoStack = redoStackRef.current;
    if (redoStack.length > 0) {
      const dataURL = redoStack.pop();
      undoStack.push(dataURL);
      restoreState(dataURL);
      if (onSave) {
        onSave(dataURL);
      }
    }
  }, [disabled, onSave, restoreState]);

  const clearCanvas = useCallback(() => {
    if (disabled) return;
    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;
    offscreenContext.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
    offscreenContext.fillStyle = "#ffffff";
    offscreenContext.fillRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
    saveState();
    redrawToVisibleCanvas();
    if (onSave) {
      const dataURL = offscreenCanvasRef.current.toDataURL();
      onSave(dataURL);
    }
  }, [disabled, onSave, redrawToVisibleCanvas, saveState]);

  useEffect(() => {
    if (disabled) {
      const dataURL = offscreenCanvasRef.current.toDataURL();
      onSave(dataURL);
    }
  }, [disabled, onSave]);  

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, disabled]);

  useEffect(() => {
    const cleanup = initializeCanvas();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeCanvas]);

  const canvasStyle = useMemo(
    () => ({
      cursor:
        tool === "brush" ||
        tool === "eraser" ||
        tool === "circle" ||
        tool === "rectangle" ||
        tool === "ellipse" ||
        tool === "line" ||
        tool === "eyedropper"
          ? "crosshair"
          : "default",
      width: "100%",
      height: "100%",
    }),
    [tool]
  );

  const disableSelectionStyle = {
    userSelect: "none",
    MozUserSelect: "none",
    WebkitUserSelect: "none",
    MsUserSelect: "none",
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
  };

  return (
    <div style={disableSelectionStyle} className="game-canvas-container">
      <div className="toolbar">
        <div className="tool-section">
          <div className="tool-buttons">
            {[
              { name: "brush", icon: brush },
              { name: "eraser", icon: eraser },
              { name: "line", icon: lineIcon },
              { name: "circle", icon: circle },
              { name: "rectangle", icon: rect },
              { name: "ellipse", icon: ellipse },
              { name: "fill", icon: bucket },
              { name: "eyedropper", icon: eyedropper }
            ].map((toolItem) => (
              <button
                key={toolItem.name}
                className={`tool-button ${tool === toolItem.name ? "active" : ""}`}
                onClick={() => !disabled && setTool(toolItem.name)}
                disabled={disabled}
                title={toolItem.name.charAt(0).toUpperCase() + toolItem.name.slice(1)}
              >
                <img src={toolItem.icon} alt={toolItem.name} className="tool-icon" />
              </button>
            ))}
          </div>
        </div>
        <div className="brush-size-section">
          <div className="brush-size-buttons">
            {[2, 5, 10, 15, 30, 50].map((size) => (
              <button
                key={size}
                className={`brush-size-button ${brushSize === size ? "active" : ""}`}
                onClick={() => !disabled && setBrushSize(size)}
                disabled={disabled}
                title={`${size}px`}
              >
                <img 
                  src={brushSizeIcon} 
                  alt={`${size}px`} 
                  className="brush-size-icon"
                  style={{
                    width: getBrushIconSize(size),
                    height: getBrushIconSize(size),
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="color-section">
        <div className="predefined-colors">
          {predefinedColors.map((colorItem) => (
            <button
              key={colorItem}
              className={`predefined-color-button ${color === colorItem ? "active" : ""}`}
              style={{ backgroundColor: colorItem }}
              onClick={() => !disabled && setColor(colorItem)}
              title={colorItem}
            />
          ))}
        </div>
      </div>
      <div className="action-buttons">
        <button onClick={undo} disabled={disabled} className="action-button" title="Undo (Ctrl+Z)">
          <img src={undoIcon} alt="Undo" className="action-icon" />
        </button>
        <button onClick={redo} disabled={disabled} className="action-button" title="Redo (Ctrl+Y)">
          <img src={redoIcon} alt="Redo" className="action-icon" />
        </button>
        <button onClick={clearCanvas} disabled={disabled} className="action-button" title="Clear Canvas">
          <img src={bin} alt="Clear" className="action-icon" />
        </button>
      </div>
      <input
        type="color"
        value={color}
        onChange={handleColorChange}
        className="default-color-picker"
        disabled={disabled}
      />
      <div className="ready-container">
        {!disabled && (
          <button className="button ready" onClick={onSubmitCreation}>
            Ready
          </button>
        )}
        {disabled && (
          <button className="button unready" onClick={onNotReady}>
            Ready
          </button>
        )}
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onMouseDown={startCreating}
          onMouseMove={draw}
          onMouseUp={endCreation}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
          onTouchStart={startCreatingTouch}
          onTouchMove={draw}
          onTouchEnd={endCreation}
          onTouchCancel={endCreation}
          style={canvasStyle}
        ></canvas>
      </div>
    </div>
  );
};

export default GameCanvas;
