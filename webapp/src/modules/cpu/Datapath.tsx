import type { CSSProperties } from "react";
import { control, decode, type Cpu, type Decoded, type Instr, type Stage } from "../../lib/isa";
import { STAGE_INFO, STAGE_KEY } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

interface WireDef {
  id: string;
  d: string;
  ctrl?: boolean;
}

const WIRES: WireDef[] = [
  { id: "pc_imem", d: "M100 195 H150" },
  { id: "pc_inc", d: "M118 195 V88 H80" },
  { id: "inc_pc", d: "M30 88 H8 V195 H20" },
  { id: "imem_ir", d: "M260 195 H300" },
  { id: "ir_ctrl", d: "M340 170 V76" },
  { id: "ir_rf", d: "M380 195 H430" },
  { id: "imm", d: "M395 195 V310 H570 V252 H585" },
  { id: "rf_a", d: "M550 172 H620" },
  { id: "rf_b", d: "M550 228 H585" },
  { id: "mux_alu", d: "M607 240 H620" },
  { id: "alu_out", d: "M700 205 H740" },
  { id: "alu_wb", d: "M720 205 V355 H500" },
  { id: "alu_zero", d: "M660 162 V76" },
  { id: "rf_sd", d: "M565 228 V125 H780 V140" },
  { id: "dmem_wb", d: "M840 195 H880 V385 H500" },
  { id: "wb_rf", d: "M470 370 H415 V250 H430" },
  { id: "ctrl_pc", d: "M300 50 H95 V170", ctrl: true },
  { id: "ctrl_rf", d: "M470 76 V140", ctrl: true },
  { id: "ctrl_alu", d: "M640 76 V156", ctrl: true },
  { id: "ctrl_dmem", d: "M680 45 H800 V140", ctrl: true },
  { id: "ctrl_wb", d: "M300 62 H275 V320 H485 V340", ctrl: true },
];

function activeSets(stage: Stage | null, d: Decoded | null, cpu: Cpu) {
  const w = new Set<string>();
  const c = new Set<string>();
  if (!stage) return { w, c };
  const ctl = d ? control(d.op) : null;
  const usesRegs = d && ["ADD", "SUB", "AND", "ADDI", "LOAD", "STORE", "BEQ", "BNE"].includes(d.op);
  if (stage === "F") {
    ["pc", "imem", "ir", "inc"].forEach((x) => c.add(x));
    ["pc_imem", "pc_inc", "inc_pc", "imem_ir"].forEach((x) => w.add(x));
  } else if (d && ctl) {
    if (stage === "D") {
      ["ir", "ctrl"].forEach((x) => c.add(x));
      w.add("ir_ctrl");
      if (usesRegs) {
        c.add("rf");
        ["ir_rf", "ctrl_rf", "rf_a"].forEach((x) => w.add(x));
        if (!ctl.aluSrcImm || ctl.branch) w.add("rf_b");
      }
      if (ctl.aluSrcImm) w.add("imm");
    } else if (stage === "X") {
      c.add("ctrl");
      if (ctl.aluOp !== "—") {
        c.add("alu");
        c.add("mux");
        w.add("ctrl_alu");
        w.add("mux_alu");
        if (d.op !== "LDI") w.add("rf_a");
        w.add(ctl.aluSrcImm ? "imm" : "rf_b");
      }
      if (ctl.branch) w.add("alu_zero");
      if (ctl.jump || (ctl.branch && cpu.taken)) {
        c.add("pc");
        w.add("ctrl_pc");
        if (ctl.jump) w.add("ir_ctrl");
      }
    } else if (stage === "M") {
      c.add("dmem");
      c.add("ctrl");
      w.add("alu_out");
      w.add("ctrl_dmem");
      if (d.op === "STORE") w.add("rf_sd");
    } else if (stage === "W") {
      c.add("wbmux");
      c.add("rf");
      c.add("ctrl");
      w.add("wb_rf");
      w.add("ctrl_wb");
      w.add(ctl.memToReg ? "dmem_wb" : "alu_wb");
      if (ctl.memToReg) w.add("alu_out");
    }
  }
  return { w, c };
}

export function Datapath({ cpu, program }: { cpu: Cpu; program: Instr[] }) {
  const { t, ts, tf } = useLang();
  const d = cpu.ir !== null ? decode(cpu.ir) : null;
  const stage = cpu.stage;
  const { w, c } = activeSets(stage, d, cpu);
  const color = stage ? STAGE_INFO[STAGE_KEY[stage]].hex : "#4a5886";
  const ctl = d ? control(d.op) : null;

  const comp = (id: string) => c.has(id);
  const boxProps = (id: string) => ({
    fill: comp(id) ? color + "26" : "#0d1427",
    stroke: comp(id) ? color : "#3a4a7c",
    strokeWidth: comp(id) ? 2.5 : 1.5,
    style: { transition: "fill .3s, stroke .3s", filter: comp(id) ? `drop-shadow(0 0 8px ${color}66)` : "none" } as CSSProperties,
  });
  const lab = (id: string) => (comp(id) ? color : "#98a4cb");
  const hex4 = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(4, "0");
  const readRegs = new Set<number>();
  if (stage === "D" && d) {
    if (["ADD", "SUB", "AND"].includes(d.op)) { readRegs.add(d.b); readRegs.add(d.rt); }
    if (["ADDI", "LOAD"].includes(d.op)) readRegs.add(d.b);
    if (d.op === "STORE") { readRegs.add(d.b); readRegs.add(d.a); }
    if (d.op === "BEQ" || d.op === "BNE") { readRegs.add(d.a); readRegs.add(d.b); }
  }
  const fetched = stage === "F" && cpu.ir !== null ? program.find((p) => p.word === cpu.ir) : undefined;

  const aluSym = ctl ? { ADD: "+", SUB: "−", AND: "&", PASS: "pass", "—": "" }[ctl.aluOp] : "";

  return (
    <svg viewBox="0 0 920 440" className="w-full" role="img" aria-label={ts("CPU datapath diagram")} style={{ direction: "ltr", minWidth: 760 }}>
      {/* wires */}
      {WIRES.map((wi) => {
        const on = w.has(wi.id);
        return (
          <path
            key={wi.id}
            d={wi.d}
            fill="none"
            stroke={on ? color : wi.ctrl ? "#41528a" : "#2f3f6e"}
            strokeWidth={on ? 3 : 2}
            strokeDasharray={wi.ctrl && !on ? "3 5" : undefined}
            strokeLinejoin="round"
            className={on ? "wire-active" : undefined}
            style={{ transition: "stroke .3s" }}
          />
        );
      })}
      {/* junctions */}
      {[[118, 195], [395, 195], [720, 205], [565, 228]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#4a5886" />
      ))}

      {/* Control unit */}
      <g>
        <rect x={300} y={14} width={380} height={62} rx={10} {...boxProps("ctrl")} />
        <text x={316} y={34} fontSize={11} fontWeight={800} letterSpacing={1.5} fill={lab("ctrl")}>CONTROL UNIT</text>
        <text x={316} y={53} fontSize={12} fill="#e8ecfb">
          {d && stage !== "F" && stage !== null ? `opcode ${d.op}` : t("waiting for an instruction…")}
        </text>
        <text x={316} y={68} fontSize={10} fill="#98a4cb">
          {ctl && stage !== "F"
            ? [ctl.regWrite && "RegWrite", ctl.aluSrcImm && "ALUSrc=imm", ctl.memRead && "MemRead", ctl.memWrite && "MemWrite", ctl.branch && "Branch", ctl.jump && "Jump", ctl.aluOp !== "—" && `ALU:${ctl.aluOp}`].filter(Boolean).join("  ") || t("no side effects")
            : ""}
        </text>
      </g>

      {/* PC + incrementer */}
      <g>
        <rect x={20} y={170} width={80} height={50} rx={8} {...boxProps("pc")} />
        <text x={60} y={188} fontSize={11} fontWeight={800} letterSpacing={1.5} textAnchor="middle" fill={lab("pc")}>PC</text>
        <text x={60} y={209} fontSize={18} fontWeight={700} textAnchor="middle" fill="#e8ecfb">{cpu.pc}</text>
        <rect x={30} y={70} width={50} height={36} rx={8} {...boxProps("inc")} />
        <text x={55} y={93} fontSize={14} fontWeight={700} textAnchor="middle" fill={lab("inc")}>+1</text>
      </g>

      {/* Instruction memory */}
      <g>
        <rect x={150} y={140} width={110} height={110} rx={10} {...boxProps("imem")} />
        <text x={205} y={162} fontSize={11} fontWeight={800} letterSpacing={1} textAnchor="middle" fill={lab("imem")}>INSTRUCTION</text>
        <text x={205} y={176} fontSize={11} fontWeight={800} letterSpacing={1} textAnchor="middle" fill={lab("imem")}>MEMORY</text>
        <text x={205} y={205} fontSize={11} textAnchor="middle" fill="#98a4cb">{tf("{n} words", { n: program.length })}</text>
        <text x={205} y={232} fontSize={10} textAnchor="middle" fill="#e8ecfb">{fetched ? fetched.text.slice(0, 18) : ""}</text>
      </g>

      {/* IR */}
      <g>
        <rect x={300} y={170} width={80} height={50} rx={8} {...boxProps("ir")} />
        <text x={340} y={188} fontSize={11} fontWeight={800} letterSpacing={1.5} textAnchor="middle" fill={lab("ir")}>IR</text>
        <text x={340} y={209} fontSize={14} fontWeight={700} textAnchor="middle" fill="#e8ecfb">{cpu.ir !== null ? hex4(cpu.ir) : "—"}</text>
      </g>
      <text x={346} y={126} fontSize={10} fill="#8794bd">opcode</text>
      <text x={398} y={186} fontSize={10} fill="#8794bd">reg #</text>
      <text x={500} y={304} fontSize={10} fill="#8794bd">imm (sign-ext)</text>

      {/* Register file */}
      <g>
        <rect x={430} y={140} width={120} height={130} rx={10} {...boxProps("rf")} />
        <text x={490} y={157} fontSize={11} fontWeight={800} letterSpacing={1} textAnchor="middle" fill={lab("rf")}>REGISTER FILE</text>
        {cpu.regs.map((v, i) => {
          const wrote = stage === "W" && cpu.changed.reg === i;
          const read = readRegs.has(i);
          return (
            <g key={i}>
              <rect
                x={440}
                y={165 + i * 24}
                width={100}
                height={21}
                rx={5}
                fill={wrote ? color + "55" : read ? color + "22" : "#141d37"}
                stroke={wrote || read ? color : "transparent"}
                style={{ transition: "all .3s" }}
              />
              <text x={448} y={180 + i * 24} fontSize={12} fontWeight={700} fill="#98a4cb">R{i}</text>
              <text x={532} y={180 + i * 24} fontSize={12} fontWeight={700} textAnchor="end" fill="#e8ecfb">{v}</text>
            </g>
          );
        })}
      </g>
      <text x={555} y={166} fontSize={10} fill="#8794bd">A</text>
      <text x={575} y={118} fontSize={10} fill="#8794bd">store data</text>

      {/* ALUSrc mux */}
      <g>
        <rect x={585} y={215} width={22} height={50} rx={6} {...boxProps("mux")} />
        <text x={596} y={244} fontSize={10} fontWeight={700} textAnchor="middle" fill={lab("mux")}>M</text>
        <text x={572} y={277} fontSize={9} fill="#8794bd">ALUSrc</text>
      </g>

      {/* ALU */}
      <g>
        <polygon points="620,150 700,175 700,235 620,260" {...boxProps("alu")} strokeLinejoin="round" />
        <text x={652} y={196} fontSize={13} fontWeight={800} letterSpacing={1.5} textAnchor="middle" fill={lab("alu")}>ALU</text>
        <text x={652} y={214} fontSize={11} textAnchor="middle" fill="#98a4cb">{stage === "X" || stage === "M" || stage === "W" ? aluSym : ""}</text>
        <text x={654} y={232} fontSize={13} fontWeight={700} textAnchor="middle" fill="#e8ecfb">
          {cpu.alu !== null && stage !== "F" && stage !== "D" ? `= ${cpu.alu}` : ""}
        </text>
        <text x={668} y={120} fontSize={10} fill="#8794bd">Zero</text>
      </g>

      {/* Data memory */}
      <g>
        <rect x={740} y={140} width={100} height={110} rx={10} {...boxProps("dmem")} />
        <text x={790} y={162} fontSize={11} fontWeight={800} letterSpacing={1} textAnchor="middle" fill={lab("dmem")}>DATA</text>
        <text x={790} y={176} fontSize={11} fontWeight={800} letterSpacing={1} textAnchor="middle" fill={lab("dmem")}>MEMORY</text>
        <text x={790} y={210} fontSize={11} textAnchor="middle" fill="#98a4cb">
          {stage === "M" && cpu.addr !== null ? `addr ${cpu.addr}` : tf("{n} words", { n: 16 })}
        </text>
        <text x={790} y={230} fontSize={13} fontWeight={700} textAnchor="middle" fill="#e8ecfb">
          {stage === "M" && d ? (d.op === "LOAD" ? `→ ${cpu.memOut}` : `← ${cpu.storeData}`) : ""}
        </text>
      </g>

      {/* WB mux */}
      <g>
        <rect x={470} y={340} width={30} height={60} rx={6} {...boxProps("wbmux")} />
        <text x={485} y={374} fontSize={10} fontWeight={700} textAnchor="middle" fill={lab("wbmux")}>M</text>
        <text x={505} y={352} fontSize={9} fill="#8794bd" dy={-8}>ALU</text>
        <text x={505} y={398} fontSize={9} fill="#8794bd" dy={-4}>MEM</text>
        <text x={440} y={415} fontSize={9} fill="#8794bd">MemToReg</text>
      </g>
      <text x={430} y={300} fontSize={10} fill="#8794bd">write data</text>
      <text x={730} y={300} fontSize={10} fill="#8794bd">result</text>

      {/* legend */}
      <g transform="translate(20 395)">
        <line x1={0} y1={0} x2={28} y2={0} stroke="#2f3f6e" strokeWidth={2} />
        <text x={36} y={4} fontSize={10} fill="#8794bd">data path</text>
        <line x1={0} y1={18} x2={28} y2={18} stroke="#41528a" strokeWidth={2} strokeDasharray="3 5" />
        <text x={36} y={22} fontSize={10} fill="#8794bd">control signal</text>
      </g>
    </svg>
  );
}
