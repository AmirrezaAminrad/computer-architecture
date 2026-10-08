<div align="center">

# Computer Architecture

**Learn how computers work by playing with them, then measure a real one.**

[![CI](https://github.com/AmirrezaAminrad/computer-architecture/actions/workflows/ci.yml/badge.svg)](https://github.com/AmirrezaAminrad/computer-architecture/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** · [فارسی](README.fa.md) · [Live demo](https://amirrezaaminrad.github.io/computer-architecture/)

</div>

This repository holds two projects that teach the same subject from two sides:

| | What it is | Start here |
|---|---|---|
| **ArchLab** | An interactive web app. You flip gates, step a CPU, run a cache, trigger pipeline hazards and watch what happens. Available in English and Persian (فارسی, right-to-left). | [`webapp/`](webapp/) |
| **cpu-cache-lab** | A measurement lab. C++ microbenchmarks and Python simulators that show the cache hierarchy, TLB, branch prediction, matrix-multiply optimization and false sharing on real hardware. Every number comes from a recorded run, never from assumption. | [`cpu-cache-lab/`](cpu-cache-lab/) |

The two feed each other. The lab's `results/*.csv` are exported into ArchLab, so
its memory-hierarchy pages can switch between textbook numbers and numbers
measured on a real machine, and ArchLab links back to the lab write-up behind
each claim.

## Quick start

### Try ArchLab

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
./start.sh        # macOS / Linux  (on Windows: double-click start.bat)
```

The script installs dependencies on the first run, starts the dev server and opens
<http://localhost:5180>. Prefer to do it by hand?

```bash
cd webapp
npm install
npm run dev          # dev server with hot reload
npm run build        # one self-contained dist/index.html
```

### Run the lab

You need a C++17 compiler, GNU make and Python 3.10+ (plotting also wants `matplotlib` and `numpy`).

```bash
cd cpu-cache-lab
make            # build all benchmarks into build/bin/
make test       # self-tests (correctness only, no timing assertions)
make run        # measure; writes results/*.csv
make plot       # draw PNGs from the CSVs
```

Windows users: use MSYS2 UCRT64 `g++` and run from an MSYS2 or Git Bash shell.
Details, flags and CMake instructions are in the [lab README](cpu-cache-lab/README.md).

After re-measuring, refresh the numbers shown in ArchLab with `npm run lab:data`.

## What ArchLab covers

| # | Module | Topics |
|---|---|---|
| 01 | Logic and number systems | Gates and truth tables, adders, base conversion, two's complement, Booth multiplication |
| 02 | Digital design | Boolean algebra, Karnaugh maps, multiplexers and decoders, flip-flops, shift registers and counters, RAM and ROM |
| 03 | CPU | Register transfer and the common bus, ALU, fetch-decode-execute datapath, a small assembler, ASM charts and control design |
| 04 | Memory | Memory hierarchy (textbook and measured), cache simulator, locality, virtual memory and TLB, MSI/MESI coherence |
| 05 | Pipelining | Hazards, forwarding, stalls and branch handling on a Gantt chart |
| 06 | Motion reels | Short animations drawn live in the browser from code (no video files) |

## What the lab measures

| Experiment | Question it answers |
|---|---|
| Pointer chase | How does latency grow as the working set outgrows L1, L2, L3? |
| Cache line, associativity, TLB | What are the line size and L1 associativity, and what does address translation cost? |
| Branch prediction, instruction latency | What does a misprediction cost, and how do latency and throughput differ? |
| Matrix multiply ladder | How far do loop order, tiling, SIMD, blocking and threads take you (0.7 to 22 GFLOP/s on the reference machine)? |
| Cache and coherence simulators | Do simulated hit-rate cliffs match the real cache sizes? How much traffic does false sharing create? |
| False sharing and roofline | What does padding buy on real threads, and where does each kernel sit against the machine's limits? |

Per-experiment guides are in [`cpu-cache-lab/docs/`](cpu-cache-lab/docs/README.md).

## How it maps to the textbook

The material follows *Computer System Architecture*, 3rd edition, by M. Morris Mano.

| Chapter | Where to find it |
|---|---|
| 1 Digital logic circuits | ArchLab 01, 02 |
| 2 Digital components | ArchLab 03 (registers and memory on a bus) |
| 3 Data representation | ArchLab 01 (base converter, two's complement) |
| 4 Register transfer and microoperations | ArchLab 03 (bus explorer, ALU, shifts) |
| 5 Basic computer organization and design | ArchLab 03 (datapath, ASM charts, control) |
| 6 Programming the basic computer | ArchLab 03 (assembler and program presets) |
| 7 Microprogrammed control | ArchLab 03 (state tables and MUX control; microprogram store only noted) |
| 8 Central processing unit | ArchLab 03 (ALU, ISA reference; addressing modes and stacks not covered) |
| 9 Pipeline and vector processing | ArchLab 05; lab matmul ladder (tiling, SIMD, threads) |
| 10 Computer arithmetic | ArchLab 01 (Booth's algorithm; division and floating point not covered) |
| 11 Input-output organization | Not covered |
| 12 Memory organization | ArchLab 02 and 04; lab stages 1 to 4 |
| 13 Multiprocessors | ArchLab 04 (MSI/MESI, false sharing); lab stage 5 |

## Persian (فارسی) support

Use the **EN | فا** switch in the sidebar to translate the whole interface. The layout
flips to right-to-left with the bundled Vazirmatn font, and the choice is remembered.
Diagrams and technical labels (register names, mnemonics, hex) deliberately stay
left-to-right. See [README.fa.md](README.fa.md) for this page in Persian.

## Useful commands

Run from the repository root:

| Command | What it does |
|---|---|
| `npm start` | ArchLab dev server |
| `npm run build` | Build the single-file site to `webapp/dist/index.html` |
| `npm run preview` | Serve the built site locally |
| `npm run typecheck` | TypeScript check |
| `npm run i18n:check` | Find missing or duplicate Persian translations |
| `npm run ci` | Typecheck, i18n check and build (what CI runs for the webapp) |
| `npm run lab:build`, `lab:test`, `lab:run`, `lab:plot` | Build, test, measure, plot the lab (uses `mingw32-make`; on Linux/macOS run `make` inside `cpu-cache-lab/`) |
| `npm run lab:data` | Export lab results into ArchLab |

## Repository layout

```text
webapp/            ArchLab: Vite, React 19, Tailwind 4, TypeScript
  src/modules/     one folder per module (logic, digital, cpu, memory, pipeline)
  src/reels/       motion reels drawn on canvas
  src/lib/strings/ Persian dictionary (the English text is the key)
cpu-cache-lab/     C++ benchmarks, Python simulators, results/, docs/
.github/           CI, GitHub Pages deploy, issue and PR templates, Dependabot
```

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Release notes are in [CHANGELOG.md](CHANGELOG.md).

## Reference

M. Morris Mano, *Computer System Architecture*, 3rd edition, Pearson.

## License

[MIT](LICENSE) © 2026 Amirreza Aminrad. The referenced textbook remains under its own copyright.
