// Single source of truth for the visual language.
// Tailwind class strings are spelled out in full so the compiler can see them.

import type { Stage } from "./isa";

export type ModuleId = "overview" | "logic" | "digital" | "cpu" | "memory" | "pipeline" | "videos";

export interface ModuleMeta {
  id: ModuleId;
  num: string;
  title: string;
  short: string;
  tagline: string;
  question: string;
  hex: string;
  text: string;
  bgSoft: string;
  border: string;
  borderSoft: string;
  dot: string;
}

export const MODULES: ModuleMeta[] = [
  {
    id: "overview",
    num: "00",
    title: "The Big Picture",
    short: "Overview",
    tagline: "How five ideas make a computer",
    question: "Why does a CPU need all of this?",
    hex: "#e8ecfb",
    text: "text-ink",
    bgSoft: "bg-white/5",
    border: "border-white/40",
    borderSoft: "border-white/15",
    dot: "bg-ink",
  },
  {
    id: "logic",
    num: "01",
    title: "Numbers & Logic Gates",
    short: "Numbers & Logic",
    tagline: "Bits, gates, and arithmetic from nothing but switches",
    question: "How can switches compute?",
    hex: "#22d3ee",
    text: "text-logic",
    bgSoft: "bg-logic/10",
    border: "border-logic/50",
    borderSoft: "border-logic/20",
    dot: "bg-logic",
  },
  {
    id: "digital",
    num: "02",
    title: "Digital Design",
    short: "Digital Design",
    tagline: "From Boolean algebra to registers, counters and memory chips",
    question: "How do gates become circuits that remember?",
    hex: "#fb923c",
    text: "text-digital",
    bgSoft: "bg-digital/10",
    border: "border-digital/50",
    borderSoft: "border-digital/20",
    dot: "bg-digital",
  },
  {
    id: "cpu",
    num: "03",
    title: "CPU Design & Instruction Cycle",
    short: "CPU & Instructions",
    tagline: "Datapath, control, and the fetch–decode–execute loop",
    question: "How does hardware run a program?",
    hex: "#a78bfa",
    text: "text-cpu",
    bgSoft: "bg-cpu/10",
    border: "border-cpu/50",
    borderSoft: "border-cpu/20",
    dot: "bg-cpu",
  },
  {
    id: "memory",
    num: "04",
    title: "Memory Hierarchy & Caching",
    short: "Memory & Caches",
    tagline: "Why fast, small memory sits in front of big, slow memory",
    question: "How do we feed the CPU fast enough?",
    hex: "#fbbf24",
    text: "text-mem",
    bgSoft: "bg-mem/10",
    border: "border-mem/50",
    borderSoft: "border-mem/20",
    dot: "bg-mem",
  },
  {
    id: "pipeline",
    num: "05",
    title: "Pipelining & Parallel Execution",
    short: "Pipelining",
    tagline: "Overlapping instructions — and the hazards that bite back",
    question: "How do we go faster without a faster clock?",
    hex: "#34d399",
    text: "text-pipe",
    bgSoft: "bg-pipe/10",
    border: "border-pipe/50",
    borderSoft: "border-pipe/20",
    dot: "bg-pipe",
  },
  {
    id: "videos",
    num: "06",
    title: "Motion Reels",
    short: "Motion Reels",
    tagline: "The story of the machine, animated",
    question: "What does it all look like in motion?",
    hex: "#f472b6",
    text: "text-vid",
    bgSoft: "bg-vid/10",
    border: "border-vid/50",
    borderSoft: "border-vid/20",
    dot: "bg-vid",
  },
];

export const getModule = (id: ModuleId) => MODULES.find((m) => m.id === id)!;

// Signal colors (shared by gates, wires, datapath)
export const SIGNAL = {
  on: "#22d3ee",
  off: "#4a5886",
  body: "#0d1427",
  bodyOn: "#0f2a3a",
  text: "#e8ecfb",
  mute: "#98a4cb",
  dim: "#62709b",
  line: "#223052",
  good: "#34d399",
  bad: "#fb7185",
  warn: "#fbbf24",
};

// Five classic pipeline stages — same colors in the CPU cycle and the pipeline module.
export type StageKey = "IF" | "ID" | "EX" | "MEM" | "WB";
export const STAGES: StageKey[] = ["IF", "ID", "EX", "MEM", "WB"];
// The single-cycle CPU (isa.ts) names its stages F/D/X/M/W; map them onto the palette above.
export const STAGE_KEY: Record<Stage, StageKey> = { F: "IF", D: "ID", X: "EX", M: "MEM", W: "WB" };
export const STAGE_INFO: Record<
  StageKey,
  { name: string; hex: string; verb: string; text: string; bg: string; border: string }
> = {
  IF: { name: "Fetch", hex: "#38bdf8", verb: "Read the instruction at PC", text: "text-sky-400", bg: "bg-sky-400/15", border: "border-sky-400/60" },
  ID: { name: "Decode", hex: "#a78bfa", verb: "Decode it & read registers", text: "text-violet-400", bg: "bg-violet-400/15", border: "border-violet-400/60" },
  EX: { name: "Execute", hex: "#fbbf24", verb: "ALU computes result / address / branch", text: "text-amber-400", bg: "bg-amber-400/15", border: "border-amber-400/60" },
  MEM: { name: "Memory", hex: "#fb7185", verb: "Load or store data memory", text: "text-rose-400", bg: "bg-rose-400/15", border: "border-rose-400/60" },
  WB: { name: "Write-back", hex: "#34d399", verb: "Write result to register file", text: "text-emerald-400", bg: "bg-emerald-400/15", border: "border-emerald-400/60" },
};
