import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { NARROW_QUERY, useMediaQuery } from "../../lib/useMediaQuery.ts";

/** How far a drag has to travel before it counts as a swipe rather than a tap. */
const DRAG_THRESHOLD = 6;
/** How far a swipe has to travel to change the snap point. */
const SNAP_DISTANCE = 56;

type Props = {
  /** Names the sheet for the handle's accessible label, e.g. "washroom list". */
  label: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Always visible, even when the sheet is collapsed. */
  peek: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * On narrow screens: a sheet pinned to the bottom of the map with two snap
 * points. Collapsed, only the handle and `peek` show; expanded, it covers most
 * of the map. The handle is a real button, so the sheet works without a
 * pointer; dragging it is a shortcut, not the only way.
 *
 * On wide screens the same markup is the scrolling body of a floating card:
 * the handle is hidden and the sheet is always open.
 */
export function BottomSheet({
  label,
  expanded,
  onExpandedChange,
  peek,
  children,
  className,
}: Props) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const bodyId = useId();
  const peekRef = useRef<HTMLDivElement | null>(null);
  const [peekHeight, setPeekHeight] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef<number | null>(null);
  const suppressClick = useRef(false);

  // The collapsed sheet shows exactly the handle plus the peek content, so the
  // offset follows that content's real height instead of a guessed constant.
  useLayoutEffect(() => {
    const element = peekRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => setPeekHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!narrow) {
      return;
    }
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (dragStart.current === null) {
      return;
    }
    const delta = event.clientY - dragStart.current;
    if (drag !== null || Math.abs(delta) > DRAG_THRESHOLD) {
      // Don't let the sheet travel past either snap point.
      setDrag(expanded ? Math.max(0, delta) : Math.min(0, delta));
    }
  }

  function onPointerUp() {
    if (dragStart.current === null) {
      return;
    }
    if (drag !== null) {
      suppressClick.current = true;
      if (expanded && drag > SNAP_DISTANCE) {
        onExpandedChange(false);
      } else if (!expanded && drag < -SNAP_DISTANCE) {
        onExpandedChange(true);
      }
    }
    dragStart.current = null;
    setDrag(null);
  }

  const style = {
    "--peek": `${peekHeight}px`,
    ...(drag !== null ? { "--drag": `${drag}px` } : {}),
  } as CSSProperties;

  const classes = ["sheet", className, expanded && "is-expanded", drag !== null && "is-dragging"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={style}>
      <div ref={peekRef} className="sheet-peek">
        <button
          type="button"
          className="sheet-handle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            onExpandedChange(!expanded);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span aria-hidden="true" />
        </button>
        {peek}
      </div>
      {/* Off-screen rows of a collapsed sheet shouldn't be reachable by Tab. */}
      <div id={bodyId} className="sheet-body" inert={narrow && !expanded ? true : undefined}>
        {children}
      </div>
    </div>
  );
}
