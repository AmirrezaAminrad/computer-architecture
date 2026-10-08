export interface CacheCfg {
  lines: number; // total cache lines (blocks)
  block: number; // block size in bytes
  ways: number; // associativity (1 = direct-mapped)
  addrBits: number;
}

export type MissKind = "compulsory" | "capacity" | "conflict";

export interface Line {
  valid: boolean;
  tag: number;
  blockAddr: number; // address >> offsetBits (identifies the memory block)
  last: number; // LRU timestamp
}

export interface Access {
  addr: number;
  tag: number;
  set: number;
  offset: number;
  blockAddr: number;
  hit: boolean;
  way: number;
  kind?: MissKind;
  evicted: { blockAddr: number } | null;
}

export type Snapshot = Line[][]; // [set][way]

export const log2 = (n: number) => Math.round(Math.log2(n));

export function geometry(cfg: CacheCfg) {
  const sets = cfg.lines / cfg.ways;
  const offsetBits = log2(cfg.block);
  const indexBits = log2(sets);
  const tagBits = cfg.addrBits - offsetBits - indexBits;
  return { sets, offsetBits, indexBits, tagBits };
}

export function splitAddress(addr: number, cfg: CacheCfg) {
  const g = geometry(cfg);
  const offset = addr & (cfg.block - 1);
  const set = (addr >> g.offsetBits) & (g.sets - 1);
  const tag = addr >> (g.offsetBits + g.indexBits);
  return { offset, set, tag, blockAddr: addr >> g.offsetBits };
}

const emptyLine = (): Line => ({ valid: false, tag: 0, blockAddr: 0, last: 0 });

export function emptySnapshot(cfg: CacheCfg): Snapshot {
  const { sets } = geometry(cfg);
  return Array.from({ length: sets }, () => Array.from({ length: cfg.ways }, emptyLine));
}

/**
 * Simulate an access trace. snapshots[k] is the cache content after k accesses.
 * Misses are classified with the standard "3 C" model:
 *   compulsory — first ever touch of that block
 *   capacity   — a fully-associative LRU cache of the same size would also miss
 *   conflict   — only this cache's limited associativity caused it
 */
export function simulate(addrs: number[], cfg: CacheCfg): { accesses: Access[]; snapshots: Snapshot[] } {
  let state = emptySnapshot(cfg);
  const snapshots: Snapshot[] = [state];
  const accesses: Access[] = [];
  const seen = new Set<number>();
  const fa: number[] = []; // fully-associative LRU stack of blockAddrs (MRU at end)

  addrs.forEach((raw, t) => {
    const addr = raw & ((1 << cfg.addrBits) - 1);
    const { offset, set, tag, blockAddr } = splitAddress(addr, cfg);
    const next: Snapshot = state.map((s) => s.map((l) => ({ ...l })));
    const ways = next[set];
    let way = ways.findIndex((l) => l.valid && l.tag === tag);
    const hit = way >= 0;
    let kind: MissKind | undefined;
    let evicted: Access["evicted"] = null;

    // shadow fully-associative LRU cache
    const faIdx = fa.indexOf(blockAddr);
    const faHit = faIdx >= 0;
    if (faHit) fa.splice(faIdx, 1);
    fa.push(blockAddr);
    if (fa.length > cfg.lines) fa.shift();

    if (!hit) {
      kind = !seen.has(blockAddr) ? "compulsory" : faHit ? "conflict" : "capacity";
      way = ways.findIndex((l) => !l.valid);
      if (way < 0) {
        let lru = 0;
        ways.forEach((l, i) => {
          if (l.last < ways[lru].last) lru = i;
        });
        way = lru;
        evicted = { blockAddr: ways[way].blockAddr };
      }
      ways[way] = { valid: true, tag, blockAddr, last: t + 1 };
    } else {
      ways[way].last = t + 1;
    }
    seen.add(blockAddr);
    accesses.push({ addr, tag, set, offset, blockAddr, hit, way, kind, evicted });
    snapshots.push(next);
    state = next;
  });
  return { accesses, snapshots };
}

export function hitRate(accesses: Access[]) {
  if (!accesses.length) return 0;
  return accesses.filter((a) => a.hit).length / accesses.length;
}
