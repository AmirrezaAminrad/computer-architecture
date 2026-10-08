/**
 * "TinyRISC" — a toy 16-bit ISA for teaching.
 *
 *   15..12  11..10  9..8   7..0
 *   opcode    a      b     imm8 / rt
 *
 * - R-type (ADD SUB AND):   a = rd,  b = rs,  imm8[1:0] = rt
 * - I-type (ADDI LDI):      a = rd,  b = rs,  imm8 = immediate (sign-extended for ADDI)
 * - Memory (LOAD STORE):    a = rd (LOAD dest / STORE source), b = base reg, imm8 = offset
 * - Branch (BEQ BNE):       a = rs1, b = rs2, imm8 = absolute target instruction index
 * - Jump (JMP):             imm8 = absolute target
 *
 * 4 registers (R0–R3, 8-bit), word-addressed instruction memory (PC += 1),
 * 16-word data memory (address mod 16).
 */

export type Op = "NOP" | "ADD" | "SUB" | "AND" | "ADDI" | "LDI" | "LOAD" | "STORE" | "BEQ" | "BNE" | "JMP" | "HALT";

export const OPCODE: Record<Op, number> = {
  NOP: 0x0, ADD: 0x1, SUB: 0x2, AND: 0x3, ADDI: 0x4, LDI: 0x5, LOAD: 0x6, STORE: 0x7, BEQ: 0x8, BNE: 0x9, JMP: 0xa, HALT: 0xf,
};
const OP_BY_CODE = Object.fromEntries(Object.entries(OPCODE).map(([k, v]) => [v, k as Op])) as Record<number, Op>;

export const MEM_WORDS = 16;
export const NUM_REGS = 4;
export const MAX_PROGRAM = 32;

export interface Decoded {
  op: Op;
  a: number;
  b: number;
  imm: number; // raw 8-bit
  rt: number;
}

export function decode(word: number): Decoded {
  const code = (word >> 12) & 0xf;
  return {
    op: OP_BY_CODE[code] ?? "NOP",
    a: (word >> 10) & 3,
    b: (word >> 8) & 3,
    imm: word & 0xff,
    rt: word & 3,
  };
}

export const signExt8 = (v: number) => (v & 0x80 ? v - 256 : v);

export interface Control {
  regWrite: boolean;
  aluSrcImm: boolean;
  memRead: boolean;
  memWrite: boolean;
  memToReg: boolean;
  branch: boolean;
  jump: boolean;
  halt: boolean;
  aluOp: "ADD" | "SUB" | "AND" | "PASS" | "—";
}

export function control(op: Op): Control {
  const base: Control = { regWrite: false, aluSrcImm: false, memRead: false, memWrite: false, memToReg: false, branch: false, jump: false, halt: false, aluOp: "—" };
  switch (op) {
    case "ADD": return { ...base, regWrite: true, aluOp: "ADD" };
    case "SUB": return { ...base, regWrite: true, aluOp: "SUB" };
    case "AND": return { ...base, regWrite: true, aluOp: "AND" };
    case "ADDI": return { ...base, regWrite: true, aluSrcImm: true, aluOp: "ADD" };
    case "LDI": return { ...base, regWrite: true, aluSrcImm: true, aluOp: "PASS" };
    case "LOAD": return { ...base, regWrite: true, aluSrcImm: true, memRead: true, memToReg: true, aluOp: "ADD" };
    case "STORE": return { ...base, aluSrcImm: true, memWrite: true, aluOp: "ADD" };
    case "BEQ":
    case "BNE": return { ...base, branch: true, aluOp: "SUB" };
    case "JMP": return { ...base, jump: true };
    case "HALT": return { ...base, halt: true };
    default: return base;
  }
}

export const isMemOp = (op: Op) => op === "LOAD" || op === "STORE";

/* ───────────── Assembler ───────────── */

export interface Instr {
  word: number;
  text: string; // normalized
  line: number; // 1-based source line
  d: Decoded;
}
export interface AsmError {
  line: number;
  msg: string;
}
export interface Assembled {
  program: Instr[];
  errors: AsmError[];
  labels: Record<string, number>;
}

const REG_RE = /^r([0-3])$/i;

function parseNum(s: string): number | null {
  const t = s.trim();
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
  if (/^0b[01]+$/i.test(t)) return parseInt(t.slice(2), 2);
  return null;
}

export function assemble(src: string): Assembled {
  const errors: AsmError[] = [];
  const labels: Record<string, number> = {};
  const lines = src.split("\n");
  const items: { line: number; mnemonic: string; args: string[] }[] = [];

  // pass 1: labels & tokenization
  lines.forEach((raw, i) => {
    let t = raw.replace(/(;|\/\/|#).*$/, "").trim();
    if (!t) return;
    const lm = t.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/);
    if (lm) {
      if (labels[lm[1]] !== undefined) errors.push({ line: i + 1, msg: `Duplicate label "${lm[1]}"` });
      labels[lm[1]] = items.length;
      t = lm[2].trim();
      if (!t) return;
    }
    const m = t.match(/^([A-Za-z]+)\s*(.*)$/);
    if (!m) {
      errors.push({ line: i + 1, msg: `Can't parse "${t}"` });
      return;
    }
    // split args on commas (brackets contain no commas)
    const args = m[2].trim() ? m[2].split(",").map((s) => s.trim()) : [];
    items.push({ line: i + 1, mnemonic: m[1].toUpperCase(), args });
  });

  if (items.length > MAX_PROGRAM) errors.push({ line: items[MAX_PROGRAM].line, msg: `Program too long (max ${MAX_PROGRAM} instructions)` });

  const program: Instr[] = [];
  const reg = (s: string | undefined, line: number): number | null => {
    const m = s?.match(REG_RE);
    if (!m) {
      errors.push({ line, msg: `Expected a register R0–R3, got "${s ?? ""}"` });
      return null;
    }
    return parseInt(m[1], 10);
  };
  const target = (s: string | undefined, line: number): number | null => {
    if (s === undefined) {
      errors.push({ line, msg: "Missing branch target" });
      return null;
    }
    if (labels[s] !== undefined) return labels[s];
    const n = parseNum(s);
    if (n === null || n < 0 || n > 255) {
      errors.push({ line, msg: `Unknown label or bad address "${s}"` });
      return null;
    }
    return n;
  };
  const imm = (s: string | undefined, line: number, lo = -128, hi = 255): number | null => {
    const n = s === undefined ? null : parseNum(s);
    if (n === null || n < lo || n > hi) {
      errors.push({ line, msg: `Immediate must be a number in ${lo}…${hi}, got "${s ?? ""}"` });
      return null;
    }
    return n & 0xff;
  };
  const mem = (s: string | undefined, line: number): { base: number; off: number } | null => {
    const m = s?.match(/^\[\s*(r[0-3])\s*(?:([+-])\s*(\w+))?\s*\]$/i);
    if (!m) {
      errors.push({ line, msg: `Expected [Rn+offset], got "${s ?? ""}"` });
      return null;
    }
    let off = 0;
    if (m[3] !== undefined) {
      const n = parseNum(m[3]);
      if (n === null || n > 127) {
        errors.push({ line, msg: `Bad offset "${m[3]}"` });
        return null;
      }
      off = m[2] === "-" ? -n : n;
    }
    return { base: parseInt(m[1].slice(1), 10), off: off & 0xff };
  };

  for (const it of items.slice(0, MAX_PROGRAM)) {
    const { line, mnemonic, args } = it;
    const op = mnemonic as Op;
    if (!(mnemonic in OPCODE)) {
      errors.push({ line, msg: `Unknown instruction "${mnemonic}"` });
      continue;
    }
    const need = (n: number) => {
      if (args.length !== n) {
        errors.push({ line, msg: `${mnemonic} takes ${n} operand${n === 1 ? "" : "s"}` });
        return false;
      }
      return true;
    };
    let word = OPCODE[op] << 12;
    let text = mnemonic;
    let ok = true;
    switch (op) {
      case "NOP":
      case "HALT":
        ok = need(0);
        break;
      case "ADD":
      case "SUB":
      case "AND": {
        if (!(ok = need(3))) break;
        const rd = reg(args[0], line), rs = reg(args[1], line), rt = reg(args[2], line);
        if (rd === null || rs === null || rt === null) { ok = false; break; }
        word |= (rd << 10) | (rs << 8) | rt;
        text = `${mnemonic} R${rd}, R${rs}, R${rt}`;
        break;
      }
      case "ADDI": {
        if (!(ok = need(3))) break;
        const rd = reg(args[0], line), rs = reg(args[1], line), v = imm(args[2], line);
        if (rd === null || rs === null || v === null) { ok = false; break; }
        word |= (rd << 10) | (rs << 8) | v;
        text = `ADDI R${rd}, R${rs}, ${signExt8(v)}`;
        break;
      }
      case "LDI": {
        if (!(ok = need(2))) break;
        const rd = reg(args[0], line), v = imm(args[1], line);
        if (rd === null || v === null) { ok = false; break; }
        word |= (rd << 10) | v;
        text = `LDI R${rd}, ${v > 127 ? v : signExt8(v)}`;
        break;
      }
      case "LOAD":
      case "STORE": {
        if (!(ok = need(2))) break;
        const rd = reg(args[0], line), m = mem(args[1], line);
        if (rd === null || m === null) { ok = false; break; }
        word |= (rd << 10) | (m.base << 8) | m.off;
        const o = signExt8(m.off);
        text = `${mnemonic} R${rd}, [R${m.base}${o ? (o > 0 ? `+${o}` : `${o}`) : ""}]`;
        break;
      }
      case "BEQ":
      case "BNE": {
        if (!(ok = need(3))) break;
        const r1 = reg(args[0], line), r2 = reg(args[1], line), t = target(args[2], line);
        if (r1 === null || r2 === null || t === null) { ok = false; break; }
        word |= (r1 << 10) | (r2 << 8) | t;
        text = `${mnemonic} R${r1}, R${r2}, ${args[2]}`;
        break;
      }
      case "JMP": {
        if (!(ok = need(1))) break;
        const t = target(args[0], line);
        if (t === null) { ok = false; break; }
        word |= t;
        text = `JMP ${args[0]}`;
        break;
      }
    }
    if (ok) program.push({ word, text, line, d: decode(word) });
    else program.push({ word: 0, text: `⚠ ${mnemonic} (invalid)`, line, d: decode(0) });
  }
  return { program, errors, labels };
}

/* ───────────── CPU state machine ───────────── */

export type Stage = "F" | "D" | "X" | "M" | "W";
export const STAGE_ORDER: Stage[] = ["F", "D", "X", "M", "W"];
export const STAGE_LABEL: Record<Stage, string> = { F: "Fetch", D: "Decode", X: "Execute", M: "Memory", W: "Write-back" };

export interface Cpu {
  pc: number;
  regs: number[];
  mem: number[];
  ir: number | null;
  stage: Stage | null; // most recently completed stage (null = ready to fetch)
  a: number;
  b: number;
  storeData: number;
  alu: number | null;
  addr: number | null;
  memOut: number | null;
  taken: boolean | null;
  halted: boolean;
  error: string | null;
  cycles: number;
  retired: number;
  note: string;
  changed: { reg: number | null; mem: number | null; pc: boolean };
}

export function resetCpu(): Cpu {
  return {
    pc: 0,
    regs: [0, 0, 0, 0],
    mem: Array(MEM_WORDS).fill(0),
    ir: null,
    stage: null,
    a: 0, b: 0, storeData: 0,
    alu: null, addr: null, memOut: null, taken: null,
    halted: false,
    error: null,
    cycles: 0,
    retired: 0,
    note: "Reset. PC = 0. Press Step to run the first stage (Fetch).",
    changed: { reg: null, mem: null, pc: false },
  };
}

/** The stages a given instruction actually uses, in order. */
export function stagesUsed(op: Op): Stage[] {
  const c = control(op);
  const s: Stage[] = ["F", "D", "X"];
  if (isMemOp(op)) s.push("M");
  if (c.regWrite) s.push("W");
  return s;
}

/** Which stage will the next Step execute? */
export function nextStage(cpu: Cpu): Stage {
  if (cpu.stage === null || cpu.ir === null) return "F";
  const used = stagesUsed(decode(cpu.ir).op);
  const i = used.indexOf(cpu.stage);
  return i >= 0 && i + 1 < used.length ? used[i + 1] : "F";
}

const aluCompute = (op: Decoded["op"], a: number, b: number): number => {
  switch (control(op).aluOp) {
    case "ADD": return (a + b) & 0xff;
    case "SUB": return (a - b) & 0xff;
    case "AND": return a & b;
    case "PASS": return b & 0xff;
    default: return 0;
  }
};

const h2 = (n: number) => "0x" + (n & 0xff).toString(16).toUpperCase().padStart(2, "0");

/** Execute exactly one pipeline-stage's worth of work. Pure: returns a new state. */
export function step(prev: Cpu, program: Instr[]): Cpu {
  if (prev.halted) return prev;
  const cpu: Cpu = { ...prev, regs: [...prev.regs], mem: [...prev.mem], changed: { reg: null, mem: null, pc: false } };
  const which = nextStage(prev);
  cpu.cycles += 1;
  cpu.stage = which;

  if (which === "F") {
    cpu.alu = null; cpu.addr = null; cpu.memOut = null; cpu.taken = null;
    if (cpu.pc >= program.length) {
      cpu.halted = true;
      cpu.error = `PC = ${cpu.pc} ran past the end of the program (add a HALT).`;
      cpu.note = cpu.error;
      cpu.ir = null;
      return cpu;
    }
    const ins = program[cpu.pc];
    cpu.ir = ins.word;
    const old = cpu.pc;
    cpu.pc = cpu.pc + 1;
    cpu.changed.pc = true;
    cpu.note = `IR ← IMEM[${old}] = 0x${ins.word.toString(16).toUpperCase().padStart(4, "0")}   ·   PC ← PC + 1 = ${cpu.pc}`;
    return cpu;
  }

  const d = decode(cpu.ir ?? 0);
  const c = control(d.op);
  const finish = () => {
    cpu.retired += 1;
  };

  if (which === "D") {
    // read registers & select ALU operands
    switch (d.op) {
      case "ADD": case "SUB": case "AND":
        cpu.a = cpu.regs[d.b]; cpu.b = cpu.regs[d.rt];
        cpu.note = `Opcode ${d.op}. Read R${d.b} = ${cpu.a} and R${d.rt} = ${cpu.b} from the register file. Control: RegWrite=1, ALUSrc=reg, ALUOp=${c.aluOp}`;
        break;
      case "ADDI":
        cpu.a = cpu.regs[d.b]; cpu.b = signExt8(d.imm) & 0xff;
        cpu.note = `Opcode ADDI. Read R${d.b} = ${cpu.a}; immediate ${signExt8(d.imm)} comes from the instruction bits. ALUSrc=imm`;
        break;
      case "LDI":
        cpu.a = 0; cpu.b = d.imm;
        cpu.note = `Opcode LDI. No register read needed; immediate ${d.imm} is routed through the ALU (pass-through). ALUSrc=imm`;
        break;
      case "LOAD": case "STORE":
        cpu.a = cpu.regs[d.b]; cpu.b = signExt8(d.imm) & 0xff; cpu.storeData = cpu.regs[d.a];
        cpu.note = `Opcode ${d.op}. Base R${d.b} = ${cpu.a}, offset ${signExt8(d.imm)}.${d.op === "STORE" ? ` Also read R${d.a} = ${cpu.storeData} as the data to store.` : ""} Control: ${d.op === "LOAD" ? "MemRead=1, MemToReg=1" : "MemWrite=1"}`;
        break;
      case "BEQ": case "BNE":
        cpu.a = cpu.regs[d.a]; cpu.b = cpu.regs[d.b];
        cpu.note = `Opcode ${d.op}. Read R${d.a} = ${cpu.a} and R${d.b} = ${cpu.b}; the ALU will subtract them and check Zero. Branch=1`;
        break;
      case "JMP":
        cpu.note = `Opcode JMP. Target address ${d.imm} is in the instruction bits. Jump=1`;
        break;
      case "HALT":
        cpu.note = "Opcode HALT. Control tells the machine to stop.";
        break;
      default:
        cpu.note = "Opcode NOP. Control asserts nothing: no register write, no memory access.";
    }
    return cpu;
  }

  if (which === "X") {
    if (c.halt) {
      cpu.halted = true;
      cpu.note = "HALT: the control unit stops the clock. Program finished.";
      finish();
      return cpu;
    }
    if (c.jump) {
      cpu.pc = d.imm;
      cpu.changed.pc = true;
      cpu.note = `PC ← ${d.imm} (jump target taken from the instruction).`;
      finish();
      return cpu;
    }
    if (c.branch) {
      const zero = ((cpu.a - cpu.b) & 0xff) === 0;
      const taken = d.op === "BEQ" ? zero : !zero;
      cpu.alu = (cpu.a - cpu.b) & 0xff;
      cpu.taken = taken;
      if (taken) {
        cpu.pc = d.imm;
        cpu.changed.pc = true;
      }
      cpu.note = `ALU: ${cpu.a} − ${cpu.b} = ${cpu.alu} → Zero = ${zero ? 1 : 0}. ${d.op} ${taken ? `is TAKEN: PC ← ${d.imm}` : `is not taken: PC stays ${cpu.pc}`}.`;
      finish();
      return cpu;
    }
    if (d.op === "NOP") {
      cpu.note = "Nothing to execute.";
      finish();
      return cpu;
    }
    cpu.alu = aluCompute(d.op, cpu.a, cpu.b);
    const sym = { ADD: "+", SUB: "−", AND: "&", PASS: "→", "—": "?" }[c.aluOp];
    cpu.note = c.aluOp === "PASS" ? `ALU passes the immediate through: result = ${cpu.alu}` : `ALU: ${cpu.a} ${sym} ${cpu.b} = ${cpu.alu} (${h2(cpu.alu)})${isMemOp(d.op) ? ` → memory address ${cpu.alu & (MEM_WORDS - 1)} (mod ${MEM_WORDS})` : ""}`;
    return cpu;
  }

  if (which === "M") {
    const addr = (cpu.alu ?? 0) & (MEM_WORDS - 1);
    cpu.addr = addr;
    if (d.op === "LOAD") {
      cpu.memOut = cpu.mem[addr];
      cpu.note = `Data memory read: MEM[${addr}] = ${cpu.memOut}`;
    } else {
      cpu.mem[addr] = cpu.storeData & 0xff;
      cpu.changed.mem = addr;
      cpu.note = `Data memory write: MEM[${addr}] ← R${d.a} = ${cpu.storeData}`;
      finish();
    }
    return cpu;
  }

  // Write-back
  const val = c.memToReg ? cpu.memOut ?? 0 : cpu.alu ?? 0;
  cpu.regs[d.a] = val & 0xff;
  cpu.changed.reg = d.a;
  cpu.note = `R${d.a} ← ${c.memToReg ? "memory data" : "ALU result"} = ${val & 0xff} (${h2(val)})`;
  finish();
  return cpu;
}

export const PRESETS: { name: string; blurb: string; src: string }[] = [
  {
    name: "Sum 1…5 (loop)",
    blurb: "A counted loop: ADD, ADDI and a backwards BNE. R3 is never written, so it stays 0 and serves as our zero register.",
    src: `LDI  R0, 5        ; counter
LDI  R1, 0        ; accumulator
loop:
ADD  R1, R1, R0   ; acc += counter
ADDI R0, R0, -1   ; counter--
BNE  R0, R3, loop ; loop until counter == 0 (R3 = 0)
STORE R1, [R3+0]  ; MEM[0] = 15
HALT`,
  },
  {
    name: "Memory round-trip",
    blurb: "Store a value to data memory, read it back, and use it. Watch the Memory stage light up for LOAD/STORE only.",
    src: `LDI   R0, 42
STORE R0, [R3+3]   ; MEM[3] = 42
LOAD  R1, [R3+3]   ; R1 = MEM[3]
ADD   R2, R1, R1   ; R2 = 84
HALT`,
  },
  {
    name: "Multiply 6×7",
    blurb: "No multiplier in this ISA — multiply by repeated addition, a nice illustration of instruction count vs. hardware.",
    src: `LDI  R0, 6        ; loop counter
LDI  R1, 7
LDI  R2, 0        ; product
again:
ADD  R2, R2, R1
ADDI R0, R0, -1
BNE  R0, R3, again
STORE R2, [R3+0]
HALT`,
  },
  {
    name: "Branch & jump",
    blurb: "BEQ skips an instruction when its operands are equal; JMP always jumps. The skipped LDI never executes.",
    src: `LDI R0, 3
LDI R1, 3
BEQ R0, R1, skip   ; equal → taken
LDI R2, 99         ; skipped
skip:
LDI R2, 7
JMP end
LDI R2, 55         ; never reached
end:
HALT`,
  },
];
