# Contributing

Thanks for helping improve ArchLab and cpu-cache-lab!

## Setup

```bash
git clone https://github.com/AmirrezaAminrad/computer-architecture.git
cd computer-architecture
npm --prefix webapp ci
npm run dev            # http://localhost:5180
```

Requires Node 20+ (22 recommended, see `.nvmrc`). The lab's Python tests need Python 3.10+;
the C++ benchmarks need `g++`/`clang++` and GNU make (MSYS2 UCRT64 on Windows; see `cpu-cache-lab/README.md`).

## Before you open a PR

```bash
npm run ci                                        # typecheck + i18n check + build
cd cpu-cache-lab && make PORTABLE=1 test    # C++ self-tests + simulator tests (CI runs this on Linux and Windows)
```

## Guidelines

- **Bilingual UI.** User-visible English text goes through `t("…")` / `ts("…")`; add the
  Farsi entry to a file in `webapp/src/lib/strings/`. `npm run i18n:check` must pass
  (no duplicate keys, no untranslated literals). Keys are the exact English string.
- **Measured numbers only** in the lab: every performance claim must come from a CSV in
  `cpu-cache-lab/results/`. Regenerate the webapp data with `npm run lab:data`.
- Match the surrounding code style (`.editorconfig`; TypeScript strict, no unused locals).
- Keep modules self-contained; shared UI lives in `webapp/src/components/`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …).
- Don't commit large binaries or copyrighted material (PDFs, books, slide decks).

## Reporting bugs

Use the issue templates; include browser/OS and the module you were in.
