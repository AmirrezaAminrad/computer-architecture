# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Fixed
- cpu-cache-lab: Linux `--cpu N` now indexes the process's allowed CPUs (works in containers/cpusets) and unpinning restores the original mask.
- cpu-cache-lab: `-ldl` is passed at link end; `make test` now covers `false_sharing` and the full simulator suite; `PYTHON` is configurable (`python3` on Linux).

### Changed
- CI builds and tests the C++ lab on Linux (make + CMake) and Windows (MSYS2), and the simulator on Python 3.10/3.12.
- `CMakeLists.txt` now builds every benchmark and registers `ctest` self-tests.
- Root README rewritten for newcomers, plus a Persian version (`README.fa.md`).
- Lab docs: portable quickstart, reference-machine wording, new `docs/README.md` index.

## [0.1.0] - 2026-10-08

### Added
- ArchLab: interactive modules for logic, digital design, CPU, memory hierarchy, pipelining.
- Full English / Persian (RTL) UI with bundled Vazirmatn font.
- Three motion reels drawn live on canvas from source (history of the processor, ArchLab showreel, Antikythera mechanism).
- cpu-cache-lab: microbenchmarks, matmul ladder, Python cache & coherence simulators, measured results.
- `npm run i18n:check`, `npm run ci`, GitHub Actions workflow, contribution docs.

### Changed
- Motion reels no longer ship as 69 MB of MP4 files; they render in the browser.
