import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo
} from "react";
import bin from "../assets/bin.png";
import enter from "../assets/enter.png";

const AiImageGenerator = ({
  onSave,
  disabled,
  onSubmitCreation,
  onNotReady
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const offscreenCanvasRef = useRef(null);
  const offscreenContextRef = useRef(null);

  const baseWidthRef = useRef(null);
  const baseHeightRef = useRef(null);

  const [promptInput, setPromptInput] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Write a prompt");

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    contextRef.current = context;

    if (!offscreenCanvasRef.current) {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const baseWidth = Math.floor(rect.width * scale);
      const baseHeight = Math.floor(rect.height * scale);

      baseWidthRef.current = baseWidth;
      baseHeightRef.current = baseHeight;

      offscreenCanvasRef.current = document.createElement("canvas");
      offscreenCanvasRef.current.width = baseWidth;
      offscreenCanvasRef.current.height = baseHeight;

      offscreenContextRef.current = offscreenCanvasRef.current.getContext("2d");
      offscreenContextRef.current.fillStyle = "#ffffff";
      offscreenContextRef.current.fillRect(0, 0, baseWidth, baseHeight);

      if (onSave) {
        onSave(offscreenCanvasRef.current.toDataURL());
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

  const redrawToVisibleCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const ow = offscreenCanvasRef.current.width;
    const oh = offscreenCanvasRef.current.height;
    const vw = canvas.width;
    const vh = canvas.height;

    context.clearRect(0, 0, vw, vh);
    context.drawImage(offscreenCanvasRef.current, 0, 0, ow, oh, 0, 0, vw, vh);
  }, []);

  const clearCanvas = useCallback(() => {
    if (disabled) return;
    const offscreenContext = offscreenContextRef.current;
    if (!offscreenContext) return;

    offscreenContext.clearRect(
      0,
      0,
      offscreenCanvasRef.current.width,
      offscreenCanvasRef.current.height
    );
    offscreenContext.fillStyle = "#ffffff";
    offscreenContext.fillRect(
      0,
      0,
      offscreenCanvasRef.current.width,
      offscreenCanvasRef.current.height
    );

    redrawToVisibleCanvas();
    setImageLoaded(false);

    if (onSave) {
      onSave(offscreenCanvasRef.current.toDataURL());
    }
  }, [disabled, onSave, redrawToVisibleCanvas]);

  const handleGenerate = useCallback(() => {
    if (disabled) return;
    const trimmed = promptInput.trim();
    if (!trimmed) {
      setStatusMessage("Please write a valid prompt");
      return;
    }
    setStatusMessage(`Generating image "${trimmed}", waiting...`);

    const apiEndpoint = "http://localhost:7860/sdapi/v1/txt2img";

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: trimmed + "Highly detailed, vibrant colors, cinematic lighting, ultra-realistic textures, sharp focus, dynamic composition, 8K resolution, intricate details, masterpiece quality, professional rendering, clothed",
        negative_prompt: "low quality, blurry, pixelated, bad anatomy, extra limbs, mutated hands, watermark, text, logo, poor lighting, harsh shadows, overexposed, cluttered background, distracting elements, incorrect color palette, distorted perspective, out of focus, nsfw, nude",
        steps: 6,
        cfg_scale: 2,
        width: 512,
        height: 512,
        sampler_name: "DPM++ SDE Karras",
        sd_model_checkpoint: "dreamshaper_8.safetensors"
      })
    };

    fetch(apiEndpoint, options)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.images && data.images.length > 0) {
          setStatusMessage(`Image generated. Almost there...`);
          const imageBase64 = data.images[0];
          const imageDataUrl = `data:image/png;base64,${imageBase64}`;
          drawImageToCanvas(imageDataUrl);
        } else {
          setStatusMessage("No images sent from server");
        }
      })
      .catch((err) => {
        setStatusMessage(`Error: ${err.message}`);
      });
  }, [promptInput, disabled]);

  const drawImageToCanvas = useCallback(
    (url) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;

      img.onload = () => {
        if (!offscreenCanvasRef.current || !offscreenContextRef.current) return;
        const offscreenContext = offscreenContextRef.current;

        offscreenContext.clearRect(
          0,
          0,
          offscreenCanvasRef.current.width,
          offscreenCanvasRef.current.height
        );

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
        setImageLoaded(true);
        setStatusMessage("Image drawn");
        redrawToVisibleCanvas();

        if (onSave) {
          onSave(offscreenCanvasRef.current.toDataURL());
        }
      };

      img.onerror = () => {
        setStatusMessage("Error loading image from url");
      };
    },
    [onSave, redrawToVisibleCanvas]
  );

  useEffect(() => {
      if (disabled) {
        const dataURL = offscreenCanvasRef.current.toDataURL();
        onSave(dataURL);
      }
    }, [disabled, onSave]); 

  useEffect(() => {
    const cleanup = initializeCanvas();
    return () => cleanup && cleanup();
  }, [initializeCanvas]);

  const canvasStyle = useMemo(() => ({
    cursor: "default",
    width: "100%",
    height: "100%",
    border: "1px solid #ccc"
  }), []);

  const disableSelectionStyle = {
    userSelect: "none",
    MozUserSelect: "none",
    WebkitUserSelect: "none",
    MsUserSelect: "none"
  };

  return (
    <div style={disableSelectionStyle} className="game-canvas-container">
      <div className="action-buttons">
        <input
          type="text"
          placeholder="Write your prompt..."
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          disabled={disabled}
          className="name-edit-input ai-input"
        />

        <button
          onClick={handleGenerate}
          disabled={disabled}
          className="action-button"
          title="Generate Image"
        >
          <img src={enter} alt="Generate" className="action-icon" />
        </button>

        <button
          onClick={clearCanvas}
          disabled={disabled || !imageLoaded}
          className="action-button"
          title="Clear Canvas"
        >
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

      <div style={{ margin: "0.5rem 0" }}>
        <strong>Status: </strong>
        {statusMessage}
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="game-canvas" style={canvasStyle} />
      </div>
    </div>
  );
};

export default AiImageGenerator;
