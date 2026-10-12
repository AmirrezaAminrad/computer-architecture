import { Callout, ModuleHeader, Section } from "../components/ui";
import { useLang } from "../lib/i18n";
import { getModule } from "../lib/theme";
import { CacheSim } from "./memory/CacheSim";
import { Coherence } from "./memory/Coherence";
import { Locality } from "./memory/Locality";
import { MatmulLadder } from "./memory/MatmulLadder";
import { Pyramid } from "./memory/Pyramid";
import { VirtualMemory } from "./memory/VirtualMemory";

export default function Memory() {
  const { t, ts } = useLang();
  const mod = getModule("memory");
  return (
    <div>
      <ModuleHeader mod={mod}>
        {t(
          "A modern core can finish an instruction in a fraction of a nanosecond, but DRAM takes ~80 ns to answer. Caches bridge that gap by betting that programs reuse data — a bet that usually pays off.",
        )}
      </ModuleHeader>

      <Section
        mod={mod}
        num="3.1"
        title={ts("The memory hierarchy")}
        lead={t(
          "There is no single memory that is simultaneously fast, large and cheap. So we stack several: small and fast near the CPU, big and slow far away, each level acting as a cache for the one below it.",
        )}
      >
        <Pyramid />
        <Callout title={ts("Numbers are typical — or measured")} tone="note">
          {t(
            "The textbook view shows order-of-magnitude values for a ~3 GHz desktop core; the ratios — about 4× per cache level, ~100× to DRAM — are what matter. Flip the pyramid to",
          )}{" "}
          <b>{t("Measured")}</b>{" "}
          {t("to see the same hierarchy on a real 13th-gen Intel laptop, measured in this repo's")}{" "}
          <span className="font-mono">cpu-cache-lab</span> {t("(see")}{" "}
          <span className="font-mono">cpu-cache-lab/docs/pointer_chase.md</span>).
        </Callout>
      </Section>

      <Section
        mod={mod}
        num="3.2"
        title={ts("Cache simulator")}
        lead={t(
          "Memory is divided into blocks. A cache keeps a few blocks. Each address splits into tag | index | offset: the index picks the set, the tag says which block is stored there, and the offset picks the byte inside it. Feed in a sequence of accesses and watch hits and misses light up.",
        )}
      >
        <CacheSim />
      </Section>

      <Section
        mod={mod}
        num="3.3"
        title={ts("Why access patterns matter")}
        lead={t(
          "Caches only work because real programs show locality: recently used data is likely to be used again (temporal), and nearby data is likely to be used next (spatial). Break locality and the same program can run many times slower.",
        )}
      >
        <Locality />
      </Section>

      <Section
        mod={mod}
        num="3.4"
        title={ts("From toy to real: the matmul ladder")}
        lead={t(
          "Everything above is a toy you can watch. The repo's cpu-cache-lab took the same story to a real machine and a real workload — matrix multiplication — and measured what each cache idea is worth.",
        )}
      >
        <MatmulLadder />
      </Section>

      <Section
        mod={mod}
        num="3.5"
        title={ts("When cores share a cache line")}
        lead={t(
          "One cache per core is fast — until two cores touch the same line. Hardware keeps every core's view consistent with a coherence protocol, and the bill for ignoring line boundaries is called false sharing.",
        )}
      >
        <Coherence />
      </Section>

      <Section
        mod={mod}
        num="3.6"
        title={ts("Virtual memory & the TLB")}
        lead={t(
          "Caches translate addresses between levels; the address itself is translated too. Virtual memory maps each program's addresses onto physical memory through a page table — and a TLB caches that mapping, because it runs on every single access.",
        )}
      >
        <VirtualMemory />
      </Section>
    </div>
  );
}
