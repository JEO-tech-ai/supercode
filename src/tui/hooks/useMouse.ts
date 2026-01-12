import { useState, useCallback, useEffect, useRef } from "react";

export interface MousePosition {
  x: number;
  y: number;
  button: "left" | "right" | "middle" | "none";
  modifiers: {
    shift: boolean;
    alt: boolean;
    ctrl: boolean;
  };
}

export interface MouseState {
  position: MousePosition;
  isPressed: boolean;
  isDragging: boolean;
  lastClick: MousePosition | null;
}

export interface UseMouseOptions {
  enabled?: boolean;
  enableDrag?: boolean;
  onMouseDown?: (pos: MousePosition) => void;
  onMouseUp?: (pos: MousePosition) => void;
  onMouseMove?: (pos: MousePosition) => void;
  onClick?: (pos: MousePosition) => void;
  onDoubleClick?: (pos: MousePosition) => void;
}

const SGR_MOUSE_REGEX = /^\x1b\[<(\d+);(\d+);(\d+)([mM])$/;
const URXVT_MOUSE_REGEX = /^\x1b\[(\d+);(\d+);(\d+)M$/;
const X10_MOUSE_REGEX = /^\x1b\[M(.)(.)(.)/;

const DOUBLE_CLICK_THRESHOLD_MS = 300;

function parseButton(buttonCode: number): "left" | "right" | "middle" | "none" {
  const buttonBits = buttonCode & 0x03;
  switch (buttonBits) {
    case 0:
      return "left";
    case 1:
      return "middle";
    case 2:
      return "right";
    default:
      return "none";
  }
}

function parseModifiers(buttonCode: number): MousePosition["modifiers"] {
  return {
    shift: (buttonCode & 0x04) !== 0,
    alt: (buttonCode & 0x08) !== 0,
    ctrl: (buttonCode & 0x10) !== 0,
  };
}

function parseSGRMouse(data: string): { pos: MousePosition; isRelease: boolean } | null {
  const match = data.match(SGR_MOUSE_REGEX);
  if (!match) return null;

  const buttonCode = parseInt(match[1], 10);
  const x = parseInt(match[2], 10) - 1;
  const y = parseInt(match[3], 10) - 1;
  const isRelease = match[4] === "m";

  return {
    pos: {
      x,
      y,
      button: parseButton(buttonCode),
      modifiers: parseModifiers(buttonCode),
    },
    isRelease,
  };
}

function parseX10Mouse(data: string): { pos: MousePosition; isRelease: boolean } | null {
  const match = data.match(X10_MOUSE_REGEX);
  if (!match) return null;

  const buttonCode = match[1].charCodeAt(0) - 32;
  const x = match[2].charCodeAt(0) - 33;
  const y = match[3].charCodeAt(0) - 33;

  return {
    pos: {
      x,
      y,
      button: parseButton(buttonCode),
      modifiers: parseModifiers(buttonCode),
    },
    isRelease: (buttonCode & 0x03) === 3,
  };
}

export function useMouse(options: UseMouseOptions = {}): MouseState {
  const {
    enabled = true,
    enableDrag = false,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onClick,
    onDoubleClick,
  } = options;

  const [state, setState] = useState<MouseState>({
    position: { x: 0, y: 0, button: "none", modifiers: { shift: false, alt: false, ctrl: false } },
    isPressed: false,
    isDragging: false,
    lastClick: null,
  });

  const lastClickTimeRef = useRef<number>(0);
  const lastClickPosRef = useRef<MousePosition | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const enableMouseTracking = (): void => {
      process.stdout.write("\x1b[?1000h");
      process.stdout.write("\x1b[?1002h");
      process.stdout.write("\x1b[?1006h");
    };

    const disableMouseTracking = (): void => {
      process.stdout.write("\x1b[?1000l");
      process.stdout.write("\x1b[?1002l");
      process.stdout.write("\x1b[?1006l");
    };

    enableMouseTracking();

    const handleData = (data: Buffer): void => {
      const str = data.toString();

      let parsed = parseSGRMouse(str);
      if (!parsed) {
        parsed = parseX10Mouse(str);
      }
      if (!parsed) return;

      const { pos, isRelease } = parsed;

      setState((prev) => {
        const newState = { ...prev, position: pos };

        if (isRelease) {
          newState.isPressed = false;
          newState.isDragging = false;
          onMouseUp?.(pos);

          if (prev.isPressed && !prev.isDragging) {
            const now = Date.now();
            if (
              lastClickPosRef.current &&
              now - lastClickTimeRef.current < DOUBLE_CLICK_THRESHOLD_MS &&
              lastClickPosRef.current.x === pos.x &&
              lastClickPosRef.current.y === pos.y
            ) {
              onDoubleClick?.(pos);
              lastClickTimeRef.current = 0;
              lastClickPosRef.current = null;
            } else {
              onClick?.(pos);
              lastClickTimeRef.current = now;
              lastClickPosRef.current = pos;
            }
          }
        } else if (pos.button !== "none") {
          if (!prev.isPressed) {
            newState.isPressed = true;
            newState.lastClick = pos;
            onMouseDown?.(pos);
          } else if (enableDrag && prev.isPressed) {
            newState.isDragging = true;
            onMouseMove?.(pos);
          }
        } else {
          if (enableDrag && prev.isPressed) {
            onMouseMove?.(pos);
          }
        }

        return newState;
      });
    };

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.on("data", handleData);

    return () => {
      disableMouseTracking();
      process.stdin.off("data", handleData);
    };
  }, [enabled, enableDrag, onMouseDown, onMouseUp, onMouseMove, onClick, onDoubleClick]);

  return state;
}

export function useFocusOnClick(
  callback: () => void,
  bounds?: { x: number; y: number; width: number; height: number }
): void {
  useMouse({
    enabled: true,
    onClick: useCallback(
      (pos: MousePosition) => {
        if (bounds) {
          if (
            pos.x >= bounds.x &&
            pos.x < bounds.x + bounds.width &&
            pos.y >= bounds.y &&
            pos.y < bounds.y + bounds.height
          ) {
            callback();
          }
        } else {
          callback();
        }
      },
      [bounds, callback]
    ),
  });
}
