/**
 * Classic in-order 5-stage pipeline (IF ID EX MEM WB), as in Hennessy & Patterson:
 *  - separate instruction and data memories → no structural hazards
 *  - register file written in the first half of a cycle and read in the second half,
 *    so a consumer may be in ID in the same cycle its producer is in WB
 *  - operands are read in ID; with forwarding they can also be bypassed into EX/MEM/ID
 */

export type POp = "add" | "sub" | "and" | "or" | "addi" | "lw" | "sw" | "beq";
export type Need = "EX" | "MEM" | "BR";
export type PStage = "IF" | "ID" | "EX" | "MEM" | "WB";

export interface PInstr {
  op: POp;
  text: string;
  dest: number | null;
  srcs: { reg: number; need: Need }[];
  taken: boolean;
}

export interface PCfg {
  forwarding: boolean;
  branchStage: "ID" | "EX" | "MEM";
  predictor: "stall" | "not-taken";
}

export interface Cell {
  cycle: number;
  stage: PStage;
  stall: boolean;
  flushed: boolean;
}

export interface Row {
  text: string;
  ghost: boolean;
  real: number | null; // index in the instruction list
  cells: Cell[];
}

export interface Dep {
  producer: number; // row index
  consumer: number; // row index
  reg: number;
  stalls: number;
  forwarded: boolean;
  from: { cycle: number; stage: PStage };
  to: { cycle: number; stage: PStage };
  label: string;
}

export interface Schedule {
  rows: Row[];
  total: number;
  deps: Dep[];
  dataStalls: number;
  branchBubbles: number;
  stallRows: number[]; // real instr indices that stalled
}

/* ───────────── parsing ───────────── */

const R = "r(\\d{1,2})";
const RE = {
  rrr: new RegExp(`^(add|sub|and|or)\\s+${R}\\s*,\\s*${R}\\s*,\\s*${R}$`),
  addi: new RegExp(`^addi\\s+${R}\\s*,\\s*${R}\\s*,\\s*(-?\\d+)$`),
  mem: new RegExp(`^(lw|sw)\\s+${R}\\s*,\\s*(-?\\d+)?\\s*\\(\\s*${R}\\s*\\)$`),
  beq: new RegExp(`^beq\\s+${R}\\s*,\\s*${R}(?:\\s*,\\s*(t|n|taken|nt|nottaken|not-taken))?$`),
};

export function parseProgram(src: string): { instrs: PInstr[]; errors: { line: number; msg: string }[] } {
  const instrs: PInstr[] = [];
  const errors: { line: number; msg: string }[] = [];
  const chk = (n: string, line: number) => {
    const v = parseInt(n, 10);
    if (v > 31) {
      errors.push({ line, msg: `Register r${v} out of range (r0–r31)` });
      return null;
    }
    return v;
  };
  src.split("\n").forEach((raw, i) => {
    const line = raw.replace(/(;|#|\/\/).*$/, "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!line) return;
    let m: RegExpMatchArray | null;
    if ((m = line.match(RE.rrr))) {
      const [rd, rs, rt] = [chk(m[2], i + 1), chk(m[3], i + 1), chk(m[4], i + 1)];
      if (rd === null || rs === null || rt === null) return;
      instrs.push({ op: m[1] as POp, text: `${m[1]} r${rd}, r${rs}, r${rt}`, dest: rd || null, srcs: [{ reg: rs, need: "EX" }, { reg: rt, need: "EX" }], taken: false });
    } else if ((m = line.match(RE.addi))) {
      const [rd, rs] = [chk(m[1], i + 1), chk(m[2], i + 1)];
      if (rd === null || rs === null) return;
      instrs.push({ op: "addi", text: `addi r${rd}, r${rs}, ${m[3]}`, dest: rd || null, srcs: [{ reg: rs, need: "EX" }], taken: false });
    } else if ((m = line.match(RE.mem))) {
      const [rt, base] = [chk(m[2], i + 1), chk(m[4], i + 1)];
      if (rt === null || base === null) return;
      const off = m[3] ?? "0";
      if (m[1] === "lw") instrs.push({ op: "lw", text: `lw r${rt}, ${off}(r${base})`, dest: rt || null, srcs: [{ reg: base, need: "EX" }], taken: false });
      else instrs.push({ op: "sw", text: `sw r${rt}, ${off}(r${base})`, dest: null, srcs: [{ reg: base, need: "EX" }, { reg: rt, need: "MEM" }], taken: false });
    } else if ((m = line.match(RE.beq))) {
      const [a, b] = [chk(m[1], i + 1), chk(m[2], i + 1)];
      if (a === null || b === null) return;
      const taken = !!m[3] && /^t/.test(m[3]);
      instrs.push({ op: "beq", text: `beq r${a}, r${b}, ${taken ? "T" : "N"}`, dest: null, srcs: [{ reg: a, need: "BR" }, { reg: b, need: "BR" }], taken });
    } else {
      errors.push({ line: i + 1, msg: `Can't parse "${raw.trim()}"` });
    }
  });
  if (instrs.length > 14) errors.push({ line: 15, msg: "Keep it to 14 instructions or fewer" });
  return { instrs: instrs.slice(0, 14), errors };
}

/* ───────────── scheduling ───────────── */

export function schedule(instrs: PInstr[], cfg: PCfg): Schedule {
  interface T {
    ifFirst: number; idFirst: number; idLast: number; ex: number; mem: number; wb: number; row: number;
  }
  const rows: Row[] = [];
  const T_: T[] = [];
  const deps: Dep[] = [];
  const stallRows: number[] = [];
  let prev: { idFirst: number; idLast: number } | null = null;
  let redirectAt = 1;
  let dataStalls = 0;

  const mkCells = (ifFirst: number, idFirst: number, idLast: number, ex: number, mem: number, wb: number): Cell[] => {
    const cells: Cell[] = [];
    for (let c = ifFirst; c < idFirst; c++) cells.push({ cycle: c, stage: "IF", stall: c > ifFirst, flushed: false });
    for (let c = idFirst; c <= idLast; c++) cells.push({ cycle: c, stage: "ID", stall: c > idFirst, flushed: false });
    cells.push({ cycle: ex, stage: "EX", stall: false, flushed: false });
    cells.push({ cycle: mem, stage: "MEM", stall: false, flushed: false });
    cells.push({ cycle: wb, stage: "WB", stall: false, flushed: false });
    return cells;
  };

  instrs.forEach((ins, i) => {
    const ifFirst = Math.max(prev ? prev.idFirst : 1, redirectAt);
    const idFirst = Math.max(ifFirst + 1, prev ? prev.idLast + 1 : 0);

    const cons: { reg: number; p: number; req: number; need: "ID" | "EX" | "MEM" }[] = [];
    let idLast = idFirst;
    for (const s of ins.srcs) {
      if (s.reg === 0) continue;
      let p = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (instrs[j].dest === s.reg) {
          p = j;
          break;
        }
      }
      if (p < 0) continue;
      const tp = T_[p];
      const need: "ID" | "EX" | "MEM" = s.need === "BR" ? (cfg.branchStage === "ID" ? "ID" : "EX") : s.need;
      let req: number;
      if (!cfg.forwarding) req = tp.wb;
      else {
        const avail = instrs[p].op === "lw" ? tp.mem + 1 : tp.ex + 1;
        req = need === "EX" ? avail - 1 : need === "MEM" ? avail - 2 : avail;
      }
      cons.push({ reg: s.reg, p, req, need });
      idLast = Math.max(idLast, req);
    }
    const ex = idLast + 1, mem = ex + 1, wb = mem + 1;
    const rowIdx = rows.length;
    T_[i] = { ifFirst, idFirst, idLast, ex, mem, wb, row: rowIdx };
    rows.push({ text: ins.text, ghost: false, real: i, cells: mkCells(ifFirst, idFirst, idLast, ex, mem, wb) });
    if (idLast > idFirst) {
      dataStalls += idLast - idFirst;
      stallRows.push(i);
    }

    for (const c of cons) {
      const tp = T_[c.p];
      const stalls = Math.max(0, c.req - idFirst);
      const forwarded = cfg.forwarding && tp.wb > idLast;
      if (stalls === 0 && !forwarded) continue;
      const isLoad = instrs[c.p].op === "lw";
      let from: Dep["from"], to: Dep["to"], label: string;
      if (forwarded) {
        from = { cycle: isLoad ? tp.mem : tp.ex, stage: isLoad ? "MEM" : "EX" };
        to = c.need === "EX" ? { cycle: ex, stage: "EX" } : c.need === "MEM" ? { cycle: mem, stage: "MEM" } : { cycle: idLast, stage: "ID" };
        const latch = !isLoad && to.cycle - from.cycle === 1 ? "EX/MEM" : "MEM/WB";
        label = `${latch} → ${to.stage}`;
      } else {
        from = { cycle: tp.wb, stage: "WB" };
        to = { cycle: idLast, stage: "ID" };
        label = "WB → ID (via register file)";
      }
      deps.push({ producer: tp.row, consumer: rowIdx, reg: c.reg, stalls, forwarded, from, to, label });
    }

    // control hazards
    if (ins.op === "beq") {
      const resolve = cfg.branchStage === "ID" ? idLast : cfg.branchStage === "EX" ? ex : mem;
      if (cfg.predictor === "stall") {
        redirectAt = Math.max(redirectAt, resolve + 1);
      } else if (ins.taken) {
        // wrong-path instructions fetched behind the branch get flushed
        let g = { idFirst, idLast };
        for (let k = 0; k < 4; k++) {
          const gIF = g.idFirst;
          if (gIF > resolve) break;
          const gID = Math.max(gIF + 1, g.idLast + 1);
          const cells = mkCells(gIF, gID, gID, gID + 1, gID + 2, gID + 3).filter((c) => c.cycle <= resolve);
          if (cells.length) cells[cells.length - 1].flushed = true;
          rows.push({ text: "↯ wrong-path (flushed)", ghost: true, real: null, cells });
          g = { idFirst: gID, idLast: gID };
        }
        redirectAt = Math.max(redirectAt, resolve + 1);
      }
    }
    prev = { idFirst, idLast };
  });

  const total = T_.length ? Math.max(...T_.map((t) => t.wb)) : 0;
  const branchBubbles = T_.length ? Math.max(0, total - (instrs.length + 4) - dataStalls) : 0;
  return { rows, total, deps, dataStalls, branchBubbles, stallRows };
}

export function sequentialSchedule(instrs: PInstr[]): Schedule {
  const stages: PStage[] = ["IF", "ID", "EX", "MEM", "WB"];
  const rows: Row[] = instrs.map((ins, i) => ({
    text: ins.text,
    ghost: false,
    real: i,
    cells: stages.map((stage, s) => ({ cycle: i * 5 + s + 1, stage, stall: false, flushed: false })),
  }));
  return { rows, total: instrs.length * 5, deps: [], dataStalls: 0, branchBubbles: 0, stallRows: [] };
}

export const PIPE_PRESETS: { id: string; name: string; blurb: string; src: string }[] = [
  {
    id: "ideal",
    name: "Independent",
    blurb: "No instruction uses another's result: the pipeline flows at one instruction per cycle.",
    src: `add r1, r2, r3
sub r4, r5, r6
and r7, r8, r9
or  r10, r11, r12
add r13, r14, r15`,
  },
  {
    id: "raw",
    name: "RAW chain",
    blurb: "The classic Hennessy & Patterson example: every instruction reads r2, which sub is still computing. Toggle forwarding!",
    src: `sub r2, r1, r3
and r12, r2, r5
or  r13, r6, r2
add r14, r2, r2
sw  r15, 100(r2)`,
  },
  {
    id: "loaduse",
    name: "Load-use",
    blurb: "Data from lw isn't available until the end of MEM, so even with forwarding the very next instruction must stall one cycle.",
    src: `lw  r1, 0(r2)
add r3, r1, r4
sub r5, r3, r6
sw  r5, 4(r2)`,
  },
  {
    id: "branch",
    name: "Taken branch",
    blurb: "The branch outcome isn't known until it reaches the resolve stage; the two instructions fetched behind it are on the wrong path and are flushed.",
    src: `and r7, r8, r9
beq r1, r2, T
or  r10, r11, r12
sub r13, r14, r15
add r3, r4, r5`,
  },
  {
    id: "mixed",
    name: "Mixed",
    blurb: "A realistic blend: two loads, a dependent add, a store of the result, and a taken branch.",
    src: `lw  r1, 0(r2)
lw  r3, 4(r2)
add r4, r1, r3
sw  r4, 8(r2)
beq r4, r5, T
add r6, r4, r1
sub r7, r6, r1`,
  },
];

export const STAGE_DELAY_PS: Record<PStage, number> = { IF: 200, ID: 100, EX: 200, MEM: 200, WB: 100 };
