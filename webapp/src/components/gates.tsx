import { SIGNAL } from "../lib/theme";

export type GateType = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR";

export const GATE_FN: Record<GateType, (a: number, b: number) => number> = {
  AND: (a, b) => a & b,
  OR: (a, b) => a | b,
  NOT: (a) => (a ? 0 : 1),
  XOR: (a, b) => a ^ b,
  NAND: (a, b) => (a & b ? 0 : 1),
  NOR: (a, b) => (a | b ? 0 : 1),
};

/** Port geometry in a gate's local coordinate system (origin = top-left of its 80px tall box). */
export function gateGeom(type: GateType) {
  const outX = { AND: 70, OR: 72, XOR: 72, NAND: 80, NOR: 82, NOT: 66 }[type];
  const inX = type === "XOR" ? -1 : 0;
  const inY = type === "NOT" ? [40] : [26, 54];
  return { outX, inX, inY, outY: 40 };
}

export function gatePorts(type: GateType, x: number, y: number) {
  const g = gateGeom(type);
  return {
    ins: g.inY.map((iy) => ({ x: x + g.inX, y: y + iy })),
    out: { x: x + g.outX, y: y + g.outY },
  };
}

const BODY: Record<GateType, string> = {
  AND: "M0 10 H40 A30 30 0 0 1 40 70 H0 Z",
  NAND: "M0 10 H40 A30 30 0 0 1 40 70 H0 Z",
  OR: "M0 10 Q42 10 72 40 Q42 70 0 70 Q20 40 0 10 Z",
  NOR: "M0 10 Q42 10 72 40 Q42 70 0 70 Q20 40 0 10 Z",
  XOR: "M0 10 Q42 10 72 40 Q42 70 0 70 Q20 40 0 10 Z",
  NOT: "M0 12 L0 68 L56 40 Z",
};

export function GateShape({ type, x = 0, y = 0, out }: { type: GateType; x?: number; y?: number; out: number }) {
  const on = out === 1;
  const stroke = on ? SIGNAL.on : "#7482b0";
  const bubbleX = { NAND: 75, NOR: 77, NOT: 61 }[type as "NAND" | "NOR" | "NOT"];
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ filter: on ? "drop-shadow(0 0 6px rgba(34,211,238,0.55))" : "none", transition: "filter .25s" }}
    >
      <path
        d={BODY[type]}
        fill={on ? SIGNAL.bodyOn : SIGNAL.body}
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{ transition: "fill .25s, stroke .25s" }}
      />
      {type === "XOR" && (
        <path d="M-9 10 Q11 40 -9 70" fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" style={{ transition: "stroke .25s" }} />
      )}
      {bubbleX !== undefined && (
        <circle cx={bubbleX} cy={40} r={5} fill={on ? SIGNAL.bodyOn : SIGNAL.body} stroke={stroke} strokeWidth={2.5} style={{ transition: "fill .25s, stroke .25s" }} />
      )}
    </g>
  );
}

/** A wire as a polyline that glows when carrying a 1. */
export function Wire({ pts, on, w = 2.5 }: { pts: [number, number][]; on: boolean; w?: number }) {
  return (
    <polyline
      points={pts.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke={on ? SIGNAL.on : SIGNAL.off}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: "stroke .25s", filter: on ? "drop-shadow(0 0 3px rgba(34,211,238,.6))" : "none" }}
    />
  );
}

export function Dot({ x, y, on }: { x: number; y: number; on: boolean }) {
  return <circle cx={x} cy={y} r={4} fill={on ? SIGNAL.on : SIGNAL.off} style={{ transition: "fill .25s" }} />;
}

/** Clickable toggle switch rendered in SVG. (x,y) = left/center of the switch. */
export function SvgSwitch({
  x,
  cy,
  value,
  label,
  onToggle,
}: {
  x: number;
  cy: number;
  value: number;
  label: string;
  onToggle: () => void;
}) {
  const on = value === 1;
  return (
    <g
      transform={`translate(${x} ${cy - 13})`}
      onClick={onToggle}
      style={{ cursor: "pointer" }}
      role="switch"
      aria-checked={on}
      aria-label={`Input ${label}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <rect x={-10} y={-6} width={72} height={38} fill="transparent" />
      <text x={-2} y={18} fontSize={13} fontWeight={700} fill={SIGNAL.mute} textAnchor="end">
        {label}
      </text>
      <rect
        x={4}
        y={0}
        width={44}
        height={26}
        rx={13}
        fill={on ? "rgba(34,211,238,.22)" : "#141d37"}
        stroke={on ? SIGNAL.on : "#4a5886"}
        strokeWidth={2}
        style={{ transition: "all .2s" }}
      />
      <circle cx={on ? 35 : 17} cy={13} r={9} fill={on ? SIGNAL.on : "#7482b0"} style={{ transition: "all .2s" }} />
      <text x={on ? 17 : 35} y={17.5} fontSize={11} fontWeight={700} textAnchor="middle" fill={on ? SIGNAL.on : SIGNAL.dim} style={{ transition: "all .2s" }}>
        {value}
      </text>
    </g>
  );
}

export function Lamp({ x, y, value, label }: { x: number; y: number; value: number; label: string }) {
  const on = value === 1;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={14}
        fill={on ? SIGNAL.on : "#141d37"}
        stroke={on ? SIGNAL.on : "#4a5886"}
        strokeWidth={2}
        style={{ transition: "all .25s", filter: on ? "drop-shadow(0 0 10px rgba(34,211,238,.85))" : "none" }}
      />
      <text x={x} y={y + 4.5} fontSize={13} fontWeight={800} textAnchor="middle" fill={on ? "#04202a" : SIGNAL.dim} style={{ transition: "fill .25s" }}>
        {value}
      </text>
      <text x={x + 24} y={y + 4.5} fontSize={13} fontWeight={700} fill={SIGNAL.mute}>
        {label}
      </text>
    </g>
  );
}
