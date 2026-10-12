import { Callout, ModuleHeader, Section } from "../components/ui";
import { getModule } from "../lib/theme";
import { useLang } from "../lib/i18n";
import { BooleanLaws } from "./digital/BooleanLaws";
import { KMap } from "./digital/KMap";
import { MuxDecoder } from "./digital/MuxDecoder";
import { FlipFlops } from "./digital/FlipFlops";
import { ShiftCounter } from "./digital/ShiftCounter";
import { RamRom } from "./digital/RamRom";

export default function Digital() {
  const mod = getModule("digital");
  const { t } = useLang();
  return (
    <div>
      <ModuleHeader mod={mod}>
        {t("Module 02 is where gates learn to remember. We shrink logic with Boolean algebra and Karnaugh maps, route signals with multiplexers and decoders, store a bit in a flip-flop, march registers into shifters and counters — and finish with the RAM and ROM chips everything else plugs into.")}
      </ModuleHeader>

      <Section
        mod={mod}
        id="boolean"
        num="2.1"
        title={t("Boolean algebra & the laws")}
        lead={t("Every circuit is an equation. Boolean algebra gives the rules to rewrite it into fewer gates — same truth table, less hardware. Step through the worked examples from the course slides; each step names the law it used, and the truth table proves the result never changed.")}
      >
        <BooleanLaws />
        <Callout title={t("Why bother?")} tone="idea">
          {t("A smaller expression is not just tidier — every saved term is real gates on real silicon. Example b collapses a four-term sum into a single literal C′.")}
        </Callout>
      </Section>

      <Section
        mod={mod}
        id="kmap"
        num="2.2"
        title={t("Minterms & Karnaugh maps")}
        lead={t("Write a function as a sum of minterms — Σm, one AND term per truth-table row where f = 1 — or as a product of maxterms — ∏M, where f = 0. A K-map lays those rows out so neighbors differ in one bit: circle the 1s in powers-of-two blocks and every circle collapses into one product term. Click cells below; the minimal cover is drawn for you.")}
      >
        <KMap />
      </Section>

      <Section
        mod={mod}
        id="muxdec"
        num="2.3"
        title={t("Multiplexers & decoders")}
        lead={t("A multiplexer is a data switch: the select lines pick which of 2ⁿ inputs flows out — and an 8×1 MUX can implement any 4-variable function, one input per column of the implementation table. A decoder is the mirror image: n inputs light exactly one of 2ⁿ outputs. Both scale by hierarchy — 32×1 from 8×1s, 5×32 from 3×8s.")}
      >
        <MuxDecoder />
      </Section>

      <Section
        mod={mod}
        id="flipflops"
        num="2.4"
        title={t("Flip-flops: one bit of memory")}
        lead={t("Combinational circuits forget the instant their inputs change. A flip-flop stores one bit and updates it only on a clock edge — the pulse that paces the whole machine. Pick a type, flip its inputs, pulse the clock, and watch the truth table and the characteristic equation decide what Q becomes.")}
      >
        <FlipFlops />
      </Section>

      <Section
        mod={mod}
        id="shiftcount"
        num="2.5"
        title={t("Shift registers & counters")}
        lead={t("Flip-flops in a row become a shift register — serial or parallel in, either direction, under a two-bit mode control — or a ripple counter that walks 0–15 by itself. The last tab replays the slide's design problem in full: from state table, through JK excitation and K-maps, to a working circuit.")}
      >
        <ShiftCounter />
      </Section>

      <Section
        mod={mod}
        id="ramrom"
        num="2.6"
        title={t("Memory: RAM & ROM")}
        lead={t("A RAM with k address lines holds 2ᵏ readable, writable words; a ROM holds 2ᵏ words wired in permanently. Real memories are assembled from small chips — type any address below and watch a 5→32 decoder hand it to the right 128×8 chip.")}
      >
        <RamRom />
      </Section>
    </div>
  );
}
