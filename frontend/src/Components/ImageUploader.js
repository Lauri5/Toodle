import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import bin from '../assets/bin.png';
import uploadIcon from '../assets/upload.png';

const ImageUploader = ({ onSave, disabled, onSubmitCreation, onNotReady }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  // Offscreen canvas for handling image rendering
  const offscreenCanvasRef = useRef(null);
  const offscreenContextRef = useRef(null);

  const baseWidthRef = useRef(null);
  const baseHeightRef = useRef(null);

  const [imageLoaded, setImageLoaded] = useState(false);

  // Hidden file input reference
  const fileInputRef = useRef(null);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    contextRef.current = context;

    // Create offscreen canvas once
    if (!offscreenCanvasRef.current) {
      const rect = canvas.getBoundingClientRect();
      // Use the initial size as our "base" resolution
      const scale = window.devicePixelRatio || 1;
      const baseWidth = Math.floor(rect.width * scale);
      const baseHeight = Math.floor(rect.height * scale);
      baseWidthRef.current = baseWidth;
      baseHeightRef.current = baseHeight;

      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = baseWidth;
      offscreenCanvasRef.current.height = baseHeight;
      offscreenContextRef.current = offscreenCanvasRef.current.getContext('2d');
      offscreenContextRef.current.fillStyle = "#ffffff";
      offscreenContextRef.current.fillRect(0, 0, baseWidth, baseHeight);
      // Initially save the blank state
      if (onSave) {
        const dataURL = offscreenCanvasRef.current.toDataURL();
        onSave(dataURL);
      }
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
  }, [onSave]);

  // Redraw offscreen canvas to visible canvas
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

  // Handle image upload from file input
  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const offscreenContext = offscreenContextRef.current;
        if (!offscreenContext) return;
        offscreenContext.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
        // Calculate scaling to fit the image within the canvas
        const canvasWidth = offscreenCanvasRef.current.width;
        const canvasHeight = offscreenCanvasRef.current.height;
        const imgAspect = img.width / img.height;
        const canvasAspect = canvasWidth / canvasHeight;
        let drawWidth, drawHeight, offsetX, offsetY;
        if (imgAspect > canvasAspect) {
          drawWidth = canvasWidth;
          drawHeight = canvasWidth / imgAspect;
          offsetX = 0;
          offsetY = (canvasHeight - drawHeight) / 2;
        } else {
          drawHeight = canvasHeight;
          drawWidth = canvasHeight * imgAspect;
          offsetX = (canvasWidth - drawWidth) / 2;
          offsetY = 0;
        }
        offscreenContext.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        redrawToVisibleCanvas();
        setImageLoaded(true);
        if (onSave) {
          const dataURL = offscreenCanvasRef.current.toDataURL();
          onSave(dataURL);
        }
      };
    };
    reader.readAsDataURL(file);
  }, [onSave, redrawToVisibleCanvas]);

  // Handle paste events
  const handlePaste = useCallback((e) => {
    if (disabled) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.src = reader.result;
          img.onload = () => {
            const offscreenContext = offscreenContextRef.current;
            if (!offscreenContext) return;
            offscreenContext.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
            // Calculate scaling to fit the image within the canvas
            const canvasWidth = offscreenCanvasRef.current.width;
            const canvasHeight = offscreenCanvasRef.current.height;
            const imgAspect = img.width / img.height;
            const canvasAspect = canvasWidth / canvasHeight;
            let drawWidth, drawHeight, offsetX, offsetY;
            if (imgAspect > canvasAspect) {
              drawWidth = canvasWidth;
              drawHeight = canvasWidth / imgAspect;
              offsetX = 0;
              offsetY = (canvasHeight - drawHeight) / 2;
            } else {
              drawHeight = canvasHeight;
              drawWidth = canvasHeight * imgAspect;
              offsetX = (canvasWidth - drawWidth) / 2;
              offsetY = 0;
            }
            offscreenContext.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            redrawToVisibleCanvas();
            setImageLoaded(true);
            if (onSave) {
              const dataURL = offscreenCanvasRef.current.toDataURL();
              onSave(dataURL);
            }
          };
        };
        reader.readAsDataURL(blob);
        e.preventDefault();
        break; // Only handle first image
      }
    }
  }, [disabled, onSave, redrawToVisibleCanvas]);

  useEffect(() => {
      if (disabled) {
        const dataURL = offscreenCanvasRef.current.toDataURL();
        onSave(dataURL);
      }
    }, [disabled, onSave]); 
    
  // Add paste event listener
  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  // Initialize canvas on mount
  useEffect(() => {
    const cleanup = initializeCanvas();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeCanvas]);

  // Hidden file input setup
  useEffect(() => {
    const fileInput = fileInputRef.current;
    if (!fileInput) return;
    fileInput.addEventListener('change', handleFileChange);
    return () => {
      fileInput.removeEventListener('change', handleFileChange);
    };
  }, [handleFileChange]);

  // Clear the canvas
  const clearCanvas = useCallback(() => {
    if (disabled) return;
    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;
    offscreenContext.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
    offscreenContext.fillStyle = "#ffffff";
    offscreenContext.fillRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
    redrawToVisibleCanvas();
    setImageLoaded(false);
    if (onSave) {
      const dataURL = offscreenCanvasRef.current.toDataURL();
      onSave(dataURL);
    }
  }, [disabled, onSave, redrawToVisibleCanvas]);

  // Upload button click handler
  const handleUploadClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current.click();
  }, [disabled]);

  // Canvas styling similar to GameCanvas
  const canvasStyle = useMemo(
    () => ({
      cursor: "default", // Changed from "pointer" to "default" as clicking does nothing
      width: "100%",
      height: "100%",
      border: "1px solid #ccc",
    }),
    []
  );

  const disableSelectionStyle = {
    userSelect: "none",
    MozUserSelect: "none",
    WebkitUserSelect: "none",
    MsUserSelect: "none",
  };

  return (
    <div style={disableSelectionStyle} className="game-canvas-container">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <div className="action-buttons">
        <button onClick={handleUploadClick} disabled={disabled} className="action-button" title="Upload Image">
          <img src={uploadIcon} alt="Upload" className="action-icon" />
        </button>
        <button onClick={clearCanvas} disabled={disabled || !imageLoaded} className="action-button" title="Clear Canvas">
          <img src={bin} alt="Clear" className="action-icon" />
        </button>
        {!disabled && (
          <button className="button ready" onClick={onSubmitCreation} title="Ready">
            Ready
          </button>
        )}
        {disabled && (
          <button className="button unready" onClick={onNotReady} title="Not Ready">
            Ready
          </button>
        )}
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          style={canvasStyle}
        ></canvas>
      </div>
    </div>
  );
};

export default ImageUploader;
