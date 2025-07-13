import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
  PanResponder,
} from 'react-native';
import Modal from "react-native-modal";
import Svg, { Path, Rect, Circle, Ellipse, Line } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import bin from '../assets/bin.png';
import redoIcon from '../assets/redo.png';
import undoIcon from '../assets/undo.png';
import brushSizeIcon from '../assets/brush-size.png';
import circleIcon from '../assets/circle.png';
import ellipseIcon from '../assets/ellipse.png';
import rectIcon from '../assets/rect.png';
import eraserIcon from '../assets/eraser.png';
import brushIcon from '../assets/brush.png';
import lineIcon from '../assets/line.png';
import paletteIcon from '../assets/palette.png';

import CustomColorPicker from './CustomColorPicker';

const predefinedColors = [
  "#000000", // Black
  "#FFFFFF", // White
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFA500", // Orange
  "#800080", // Purple
  "#808080", // Gray
  "#A52A2A", // Brown
  "#FFC0CB", // Pink
  "#808000", // Olive
  "#008080", // Teal
  "#000080", // Navy
];

const { width: screenWidth } = Dimensions.get('window');
const canvasWidth = screenWidth * 0.85;
const canvasHeight = canvasWidth * (3 / 4);

const theme = {
  tintColorButton: 'rgb(75, 236, 42)',
  tintColorBorder: 'rgba(41, 131, 23, 0.5)',
  tintColorBack: 'rgba(138, 240, 118, 0.5)',
  tintColorText: 'rgb(26, 100, 12)',
};

// Helper to compute a size (in vmin units) based on the brush size value
const getBrushIconSize = (size) => {
  const minIconSize = 2;
  const maxIconSize = 50;
  const minBrushSize = 2;
  const maxBrushSize = 50;
  const clampedSize = Math.min(Math.max(size, minBrushSize), maxBrushSize);
  const iconSize =
    minIconSize +
    ((clampedSize - minBrushSize) / (maxBrushSize - minBrushSize)) *
      (maxIconSize - minIconSize);
  return iconSize;
};

const generateSmoothPath = (points) => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`;
    return d;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const currentPoint = points[i];
    const nextPoint = points[i + 1];
    const midPointX = (currentPoint.x + nextPoint.x) / 2;
    const midPointY = (currentPoint.y + nextPoint.y) / 2;
    d += ` Q ${currentPoint.x} ${currentPoint.y} ${midPointX} ${midPointY}`;
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
};

const GameCanvas = ({ onSave, disabled, onSubmitCreation, onNotReady, timer }) => {
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [strokes, setStrokes] = useState([]);
  const [undoneStrokes, setUndoneStrokes] = useState([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  const currentStrokeRef = useRef(null);
  const creationAreaRef = useRef(null);

  const commitStroke = (stroke) => {
    setStrokes(prev => [...prev, stroke]);
    setUndoneStrokes([]);
    saveImage();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const initialStroke = {
          tool: toolRef.current,
          color: toolRef.current === "eraser" ? "#ffffff" : colorRef.current,
          brushSize: brushSizeRef.current,
          points: [{ x: locationX, y: locationY }],
          start: { x: locationX, y: locationY },
          end: { x: locationX, y: locationY },
        };
        currentStrokeRef.current = initialStroke;
        setRenderTrigger(r => r + 1);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (
          locationX < 0 || locationY < 0 ||
          locationX > canvasWidth || locationY > canvasHeight
        ) {
          if (currentStrokeRef.current) {
            commitStroke(currentStrokeRef.current);
            currentStrokeRef.current = null;
          }
          return;
        }
        if (!currentStrokeRef.current) return;
        if (currentStrokeRef.current.tool === "brush" || currentStrokeRef.current.tool === "eraser") {
          currentStrokeRef.current.points.push({ x: locationX, y: locationY });
        } else if (["line", "rectangle", "circle", "ellipse"].includes(currentStrokeRef.current.tool)) {
          currentStrokeRef.current.end = { x: locationX, y: locationY };
        }
        setRenderTrigger(r => r + 1);
      },
      onPanResponderRelease: () => {
        if (currentStrokeRef.current) {
          commitStroke(currentStrokeRef.current);
          currentStrokeRef.current = null;
          setRenderTrigger(r => r + 1);
        }
      },
      onPanResponderTerminate: () => {
        if (currentStrokeRef.current) {
          commitStroke(currentStrokeRef.current);
          currentStrokeRef.current = null;
          setRenderTrigger(r => r + 1);
        }
      },
    })
  ).current;

  const renderStroke = (stroke, index) => {
    if (stroke.tool === "brush" || stroke.tool === "eraser") {
      const d = generateSmoothPath(stroke.points);
      return (
        <Path
          key={index}
          d={d}
          stroke={stroke.color}
          strokeWidth={stroke.brushSize}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    } else if (stroke.tool === "line") {
      return (
        <Line
          key={index}
          x1={stroke.start.x}
          y1={stroke.start.y}
          x2={stroke.end.x}
          y2={stroke.end.y}
          stroke={stroke.color}
          strokeWidth={stroke.brushSize}
          strokeLinecap="round"
        />
      );
    } else if (stroke.tool === "rectangle") {
      const x = Math.min(stroke.start.x, stroke.end.x);
      const y = Math.min(stroke.start.y, stroke.end.y);
      const width = Math.abs(stroke.end.x - stroke.start.x);
      const height = Math.abs(stroke.end.y - stroke.start.y);
      return (
        <Rect
          key={index}
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={stroke.color}
          strokeWidth={stroke.brushSize}
          fill="none"
        />
      );
    } else if (stroke.tool === "circle") {
      const dx = stroke.end.x - stroke.start.x;
      const dy = stroke.end.y - stroke.start.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return (
        <Circle
          key={index}
          cx={stroke.start.x}
          cy={stroke.start.y}
          r={radius}
          stroke={stroke.color}
          strokeWidth={stroke.brushSize}
          fill="none"
        />
      );
    } else if (stroke.tool === "ellipse") {
      const cx = (stroke.start.x + stroke.end.x) / 2;
      const cy = (stroke.start.y + stroke.end.y) / 2;
      const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
      const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;
      return (
        <Ellipse
          key={index}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={stroke.color}
          strokeWidth={stroke.brushSize}
          fill="none"
        />
      );
    }
    return null;
  };

  async function saveImage() {
    const uri = await captureRef(creationAreaRef, {
      result: 'base64',
      quality: 1,
    });
    const dataUrl = `data:image/png;base64,${uri}`;
    onSave(dataUrl);
  }

  const handleUndo = () => {
    if (strokes.length === 0 || disabled) return;
    const newStrokes = [...strokes];
    const last = newStrokes.pop();
    setStrokes(newStrokes);
    setUndoneStrokes(prev => [...prev, last]);
  };

  const handleRedo = () => {
    if (undoneStrokes.length === 0 || disabled) return;
    const newUndone = [...undoneStrokes];
    const redoStroke = newUndone.pop();
    setStrokes(prev => [...prev, redoStroke]);
    setUndoneStrokes(newUndone);
  };

  const handleClear = () => {
    if (disabled) return;
    const clearStroke = {
      tool: "rectangle",
      color: "#fff",
      brushSize: 10000,
      start: { x: 0, y: 0 },
      end: { x: canvasWidth, y: canvasHeight },
    };

    if (onSave) {
      const blank =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+73BzaQAAAABJRU5ErkJggg==';
      onSave(blank);
    }
  
    setStrokes(prev => [...prev, clearStroke]);
  };

  const handleOpenCustomColorPicker = () => {
    setShowCustomColorPicker(true);
  };

  const handleCustomColorSelected = (selectedColor) => {
    setColor(selectedColor);
    setShowCustomColorPicker(false);
  };

  return (
    <>
      <Modal visible={showCustomColorPicker} animationType="slide">
        <CustomColorPicker
          visible={showCustomColorPicker}
          initialColor={color}
          onColorSelected={handleCustomColorSelected}
        />
      </Modal>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          {timer !== undefined && (
                              <View>
                                <Text style={styles.title}>Creation Phase</Text>
                                <Text style={styles.timerText}>
                                  Remaining time: {'\n' + timer} second{timer === 1 ? '' : 's'}
                                </Text>
                              </View>
                            )}
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => !disabled && setTool("brush")}
              style={[styles.actionButton, tool === "brush" && styles.activeTool]}
            >
              <Image source={brushIcon} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !disabled && setTool("eraser")}
              style={[styles.actionButton, tool === "eraser" && styles.activeTool]}
            >
              <Image source={eraserIcon} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !disabled && setTool("line")}
              style={[styles.actionButton, tool === "line" && styles.activeTool]}
            >
              <Image source={lineIcon} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !disabled && setTool("rectangle")}
              style={[styles.actionButton, tool === "rectangle" && styles.activeTool]}
            >
              <Image source={rectIcon} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !disabled && setTool("circle")}
              style={[styles.actionButton, tool === "circle" && styles.activeTool]}
            >
              <Image source={circleIcon} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !disabled && setTool("ellipse")}
              style={[styles.actionButton, tool === "ellipse" && styles.activeTool]}
            >
              <Image source={ellipseIcon} style={styles.icon} />
            </TouchableOpacity>
          </View>

          <View style={styles.brushSizeSection}>
            {[1, 5, 10, 15, 30, 40].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.brushSizeButton,
                  brushSize === size && styles.activeBrushSize
                ]}
                onPress={() => !disabled && setBrushSize(size)}
              >
                <Image
                  source={brushSizeIcon}
                  style={
                    [styles.actionIcon,
                    {width: getBrushIconSize(size),
                    height: getBrushIconSize(size),}]
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.colorSection}>
            {predefinedColors.map((col) => (
              <TouchableOpacity
                key={col}
                style={[styles.colorCircle, { backgroundColor: col }, col === color && styles.activeColor]}
                onPress={() => !disabled && setColor(col)}
              />
            ))}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleOpenCustomColorPicker}
            >
              <Image source={paletteIcon} style={styles.actionIcon} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButtonFunction, (disabled || strokes.length === 0) && styles.actionButtonDisabled]}
              onPress={handleUndo}
              disabled={disabled || strokes.length === 0}
            >
              <Image source={undoIcon} style={styles.actionIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonFunction, (disabled || undoneStrokes.length === 0) && styles.actionButtonDisabled]}
              onPress={handleRedo}
              disabled={disabled || undoneStrokes.length === 0}
            >
              <Image source={redoIcon} style={styles.actionIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonFunction, disabled && styles.actionButtonDisabled]}
              onPress={handleClear}
              disabled={disabled}
            >
              <Image source={bin} style={styles.actionIcon} />
            </TouchableOpacity>

            {!disabled ? (
              <TouchableOpacity style={styles.actionButtonFunction} onPress={onSubmitCreation}>
                <Text style={styles.buttonText}>Ready</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.unreadyButton} onPress={onNotReady}>
                <Text style={styles.buttonText}>Ready</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.creationContainer}>
            <View ref={creationAreaRef} style={styles.creationArea} {...panResponder.panHandlers}>
              <View style={styles.captureArea}>
                <Svg style={styles.svg}>
                  {strokes.map((stroke, index) => renderStroke(stroke, index))}
                  {currentStrokeRef.current && renderStroke(currentStrokeRef.current, 'current')}
                </Svg>
              </View>
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

export default GameCanvas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.tintColorBack,
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth,
    padding: 16,
  },
  mainContent: {
    backgroundColor: theme.tintColorBack,
    borderWidth: 2,
    borderColor: theme.tintColorBorder,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    width: screenWidth * 0.9,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 25,
  },
  activeTool: {
    borderColor: 'black',
    borderWidth: 2,
  },
  icon: {
    width: 30,
    height: 30,
  },
  brushSizeSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 25,
  },
  brushSizeButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.tintColorButton,
    padding: 8,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center'
  },
  activeBrushSize: {
    borderColor: 'black',
    borderWidth: 2,
  },
  colorSection: {
    width: '110%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
    alignItems: 'center',
    alignSelf: 'center'
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 4,
  },
  activeColor: {
    borderWidth: 2,
    borderColor: 'black',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginVertical: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.tintColorButton,
    padding: 8,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionButtonFunction: {
    backgroundColor: theme.tintColorButton,
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  unreadyButton: {
    backgroundColor: '#39ff1e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  creationContainer: {
    alignSelf: 'center',
    width: canvasWidth,
    aspectRatio: 4 / 3,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.tintColorBorder,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    color: theme.tintColorText,
    marginBottom: 8,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  timerText: {
    fontSize: 18,
    color: theme.tintColorText,
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  creationArea: {
    alignSelf: 'center',
    width: canvasWidth,
    aspectRatio: 4 / 3,
    backgroundColor: '#fff',
    borderWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  captureArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  svg: {
    flex: 1,
  },
});
