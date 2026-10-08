import { useState } from "react";
import { Button, Callout, Panel, Segmented, Slider, Stat } from "../../components/ui";
import { Wire } from "../../components/gates";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

const hex = (n: number, d = 3) => n.toString(16).toUpperCase().padStart(d, "0");

/* ── block diagrams ─────────────────────────────────────── */

function RamRomDiagrams() {
  const { t } = useLang();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t("RAM — read/write memory")}>
        <div dir="ltr">
          <svg width={380} height={190} viewBox="0 0 380 190" className="max-w-full">
            <rect x={110} y={30} width={170} height={120} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={195} y={80} fontSize={14} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">RAM</text>
            <text x={195} y={102} fontSize={11} fill={SIGNAL.mute} textAnchor="middle">2ᵏ words × n bits</text>
            {/* k address lines */}
            <Wire pts={[[40, 60], [110, 60]]} on={false} />
            <text x={6} y={50} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="start">{t("k address lines")}</text>
            {/* read / write */}
            <Wire pts={[[40, 105], [110, 105]]} on={false} />
            <text x={6} y={95} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="start">{t("Read / Write")}</text>
            {/* data in / out */}
            <Wire pts={[[195, 30], [195, 8]]} on={false} />
            <text x={214} y={16} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>{t("data in")}</text>
            <Wire pts={[[195, 150], [195, 172]]} on={false} />
            <text x={214} y={170} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>{t("data out")}</text>
          </svg>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">
            {t("A RAM with k address lines holds 2ᵏ words you can read or write, one at a time.")}
          </p>
        </div>
      </Panel>
      <Panel title={t("ROM — read-only memory")}>
        <div dir="ltr">
          <svg width={430} height={190} viewBox="0 0 430 190" className="max-w-full">
            <rect x={110} y={30} width={170} height={120} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={195} y={80} fontSize={14} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">ROM (m×n)</text>
            <text x={195} y={102} fontSize={11} fill={SIGNAL.mute} textAnchor="middle">m = 2ᵏ words</text>
            <Wire pts={[[40, 60], [110, 60]]} on={false} />
            <text x={6} y={50} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="start">{t("k address lines")}</text>
            {[0, 1, 2].map((i) => (
              <Wire key={i} pts={[[280, 60 + i * 24], [310, 60 + i * 24]]} on={false} />
            ))}
            <text x={314} y={70} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>{t("n output lines")}</text>
            <text x={195} y={172} fontSize={11} fill={SIGNAL.dim} textAnchor="middle">{t("no write line — contents are permanent")}</text>
          </svg>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">
            {t("A ROM has the same address-word shape, but its contents are wired in once and for all — it only reads. Program boot code lives here.")}
          </p>
        </div>
      </Panel>
    </div>
  );
}

/* ── chip expansion: 4096×8 from 128×8 ──────────────────── */

function ChipExpansion() {
  const { t } = useLang();
  const [addr, setAddr] = useState(0x2abc & 0xfff);
  const chip = addr >> 7; // 5 bits A11..A7
  const offset = addr & 0x7f;
  const range = `${hex(chip * 128)}–${hex(chip * 128 + 127)}`;
  const bin12 = addr.toString(2).padStart(12, "0");

  return (
    <Panel title={t("Build 4096×8 from 128×8 chips")} bodyClassName="overflow-x-auto">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div dir="ltr">
          <svg width={520} height={250} viewBox="0 0 520 250" className="max-w-full">
            {/* decoder */}
            <rect x={150} y={6} width={150} height={34} rx={8} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2} />
            <text x={225} y={27} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">DEC 5→32</text>
            <text x={142} y={27} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="end">A11…A7</text>
            {/* chips 4 rows × 8 cols */}
            {Array.from({ length: 32 }, (_, i) => {
              const cx = 60 + (i % 8) * 52;
              const cy = 74 + Math.floor(i / 8) * 42;
              const sel = i === chip;
              return (
                <g key={i}>
                  <rect x={cx} y={cy} width={44} height={32} rx={6} fill={sel ? SIGNAL.bodyOn : SIGNAL.body} stroke={sel ? SIGNAL.on : "#4a5886"} strokeWidth={sel ? 2.5 : 1.5} style={{ transition: "all .2s" }} />
                  <text x={cx + 22} y={cy + 14} fontSize={9} fontWeight={700} fill={sel ? SIGNAL.on : SIGNAL.mute} textAnchor="middle">{`#${i}`}</text>
                  <text x={cx + 22} y={cy + 26} fontSize={8} fill={sel ? SIGNAL.on : SIGNAL.dim} textAnchor="middle">128×8</text>
                  {/* decoder select line — only drawn crisply for row starts */}
                  <line x1={225} y1={40} x2={cx + 22} y2={cy} stroke={sel ? SIGNAL.on : "#223052"} strokeWidth={sel ? 1.8 : 0.8} style={{ transition: "stroke .2s" }} />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          <Slider label={t("Address (0–4095)")} value={addr} min={0} max={4095} onChange={setAddr} color="#fb923c" />
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={hex(addr)}
              onChange={(ev) => {
                const v = parseInt(ev.target.value, 16);
                if (!Number.isNaN(v)) setAddr(Math.max(0, Math.min(4095, v)));
              }}
              className="w-24 rounded-lg border border-line bg-bg/60 px-2.5 py-1.5 text-center font-mono text-sm text-ink outline-none focus:border-digital"
              dir="ltr"
              maxLength={3}
              aria-label="address hex"
            />
            <span className="font-mono text-[13px] text-mute" dir="ltr">
              {bin12.slice(0, 5)}
              <span className="text-digital">│</span>
              {bin12.slice(5)}
            </span>
            <span className="text-[12px] text-dim">{t("A11…A7 pick the chip — A6…A0 address inside it")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label={t("chip")} value={`#${chip}`} sub={t("of 32")} color="#fb923c" />
            <Stat label={t("in-chip address")} value={offset} sub={`0x${hex(offset, 2)}`} color="#fb923c" />
            <Stat label={t("chip address range")} value={<span className="text-base">{range}</span>} sub="128 words" color="#fb923c" />
          </div>
          <p className="text-[13px] leading-relaxed text-mute">
            {t("4096 / 128 = 2¹²⁄2⁷ = 2⁵ = 32 chips. The five high address bits go through a 5→32 decoder; each decoder line selects one 128-word chip, and the low seven bits address within it.")}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ── read/write playground ──────────────────────────────── */

function RwPlayground() {
  const { t } = useLang();
  const [rom, setRom] = useState(false);
  const [cells, setCells] = useState([3, 7, 1, 12, 0, 5, 9, 2]);
  const [a, setA] = useState(2);
  const [dataIn, setDataIn] = useState(9);
  const [out, setOut] = useState<number | null>(null);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);

  const doRead = () => {
    setOut(cells[a]);
    setFlash("good");
    setTimeout(() => setFlash(null), 700);
  };
  const doWrite = () => {
    if (rom) {
      setFlash("bad");
      setTimeout(() => setFlash(null), 900);
      return;
    }
    setCells((c) => c.map((v, i) => (i === a ? dataIn : v)));
    setOut(dataIn);
    setFlash("good");
    setTimeout(() => setFlash(null), 700);
  };

  return (
    <Panel title={t("Read / Write playground")}>
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-[240px] flex-1">
          <Segmented
            value={rom ? "rom" : "ram"}
            onChange={(v) => {
              setRom(v === "rom");
              setOut(null);
            }}
            color="#fb923c"
            options={[
              { value: "ram", label: t("RAM (write allowed)") },
              { value: "rom", label: t("ROM (read-only)") },
            ]}
          />
          <table className="mt-4 w-full max-w-[360px] text-center font-mono text-[13px]" dir="ltr">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">{t("address")}</th>
                <th className="pb-2">{t("contents")}</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((v, i) => (
                <tr key={i} className="border-t border-line/60" style={i === a ? { background: "rgba(251,146,60,.12)" } : undefined}>
                  <td className="py-1">{i}</td>
                  <td className="py-1 font-bold" style={{ color: i === a ? "#fb923c" : "#e8ecfb" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-w-[220px] flex-1 space-y-4">
          <Slider label={t("Address")} value={a} min={0} max={7} onChange={setA} color="#fb923c" />
          <Slider label={t("Data in")} value={dataIn} min={0} max={15} onChange={setDataIn} color="#fb923c" />
          <div className="flex gap-2">
            <Button onClick={doRead}>{t("Read")}</Button>
            <Button variant="primary" color="#fb923c" onClick={doWrite}>{t("Write")}</Button>
          </div>
          <Stat
            label={t("Data out")}
            value={out ?? "—"}
            sub={flash === "bad" ? t("ROM is read-only — the write is refused.") : undefined}
            color={flash === "bad" ? "#fb7185" : "#fb923c"}
            className={flash === "good" ? "flash-good" : flash === "bad" ? "flash-bad" : undefined}
          />
        </div>
      </div>
    </Panel>
  );
}

export function RamRom() {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <RamRomDiagrams />
      <ChipExpansion />
      <RwPlayground />
      <Callout title={t("Why the decoder pattern matters")} tone="note">
        {t("Address decoding is the same idea whether the 'chips' are RAM, ROM, or device ports — the virtual-memory translation in module 04 plays the identical trick: high address bits pick the unit, low bits pick the word inside it.")}
      </Callout>
    </div>
  );
}
