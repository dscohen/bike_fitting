// The reachable-range envelope chart, shared by the fit panel and the bike
// comparison view.

import { useId } from "react";
import type { FitEnvelope, Vec2 } from "../lib/types";

export const CORE = "#0ea5e9"; // sky — comfortable
export const WARN = "#f59e0b"; // amber — workable, at the limit
export const TARGET = "#7c3aed"; // violet — the rider's target

// The window is FIXED in mm and anchored on the target, so the scale and the
// crosshair never move when you switch bikes. That matters because a frame's
// reach/stack only *translate* this envelope — its size is set by the stem band
// and spacer range — so comparing bikes means comparing where the target sits
// inside it. Auto-fitting each bike would make every envelope fill the frame
// identically and hide exactly that.
const W = 240;
const H = 230;
const PAD = 12;
const WIN_UP = 160; // mm shown above the target (spacers open up a lot of room)
const WIN_DOWN = 60; // mm shown below it
const SCALE = (H - 2 * PAD) / (WIN_UP + WIN_DOWN); // px per mm — constant

export function EnvelopeChart({
  envelope,
  className = "mt-1 w-full rounded bg-slate-50 dark:bg-slate-800",
}: {
  envelope: FitEnvelope;
  className?: string;
}) {
  const clipId = useId();
  const t = envelope.target;
  // Uniform scale — a mm across reads the same as a mm up, so the arrows and
  // the shape are honest.
  const sx = (p: Vec2) => W / 2 + (p.x - t.x) * SCALE;
  const sy = (p: Vec2) => PAD + WIN_UP * SCALE - (p.y - t.y) * SCALE;
  const path = (poly: Vec2[]) => poly.map((p) => `${sx(p)},${sy(p)}`).join(" ");

  // Arrows measure the comfortable range when we're in it, else the workable one.
  const room = envelope.room ?? envelope.roomWarn;
  const roomColor = envelope.room ? CORE : WARN;
  const tx = sx(t);
  const ty = sy(t);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <polygon
          points={path(envelope.warn)}
          fill={WARN}
          fillOpacity={0.14}
          stroke={WARN}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <polygon
          points={path(envelope.core)}
          fill={CORE}
          fillOpacity={0.2}
          stroke={CORE}
          strokeWidth={1.5}
        />
      </g>

      {room && (
        <g>
          <RoomArrow x1={tx} y1={ty} x2={sx({ x: t.x + room.forward, y: t.y })} y2={ty} mm={room.forward} color={roomColor} place="right" />
          <RoomArrow x1={tx} y1={ty} x2={sx({ x: t.x - room.back, y: t.y })} y2={ty} mm={room.back} color={roomColor} place="left" />
          <RoomArrow x1={tx} y1={ty} x2={tx} y2={sy({ x: t.x, y: t.y + room.up })} mm={room.up} color={roomColor} place="top" />
          <RoomArrow x1={tx} y1={ty} x2={tx} y2={sy({ x: t.x, y: t.y - room.down })} mm={room.down} color={roomColor} place="bottom" />
        </g>
      )}

      {/* target crosshair, haloed so it reads on either fill */}
      <g>
        <line x1={tx - 6} y1={ty} x2={tx + 6} y2={ty} stroke="white" strokeWidth={4} />
        <line x1={tx} y1={ty - 6} x2={tx} y2={ty + 6} stroke="white" strokeWidth={4} />
        <line x1={tx - 6} y1={ty} x2={tx + 6} y2={ty} stroke={TARGET} strokeWidth={2} />
        <line x1={tx} y1={ty - 6} x2={tx} y2={ty + 6} stroke={TARGET} strokeWidth={2} />
      </g>
    </svg>
  );
}

/** A dimension arrow from the target out to the region edge, labelled in mm. */
function RoomArrow({
  x1,
  y1,
  x2,
  y2,
  mm,
  color,
  place,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mm: number;
  color: string;
  place: "left" | "right" | "top" | "bottom";
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const label = `${mm.toFixed(0)}`;

  // Head only when there's room to draw one.
  let head = null;
  if (len > 6) {
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const s = 3.5;
    head = (
      <polygon
        points={`${x2},${y2} ${x2 - ux * s * 2 + px * s},${y2 - uy * s * 2 + py * s} ${
          x2 - ux * s * 2 - px * s
        },${y2 - uy * s * 2 - py * s}`}
        fill={color}
      />
    );
  }

  const off = 7;
  const lx = place === "left" ? x2 - off : place === "right" ? x2 + off : x2;
  const ly = place === "top" ? y2 - off : place === "bottom" ? y2 + off + 3 : y2 - 4;
  const anchor =
    place === "left" ? "end" : place === "right" ? "start" : "middle";

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.25} />
      {head}
      <text
        x={lx}
        y={ly}
        fontSize={9}
        textAnchor={anchor as "start" | "middle" | "end"}
        fill={color}
        stroke="white"
        strokeWidth={2.5}
        paintOrder="stroke"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}
