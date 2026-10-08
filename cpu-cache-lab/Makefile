# cpu-cache-lab — microbenchmark suite (stages 1-2)
#
# Primary build   : GNU make + g++ (or clang++) with a POSIX shell. CI builds
#                   and tests it on Linux (ubuntu) and Windows (MSYS2 UCRT64
#                   g++ 14 + mingw32-make). Recipes use sh syntax (mkdir -p,
#                   rm -rf); mingw32-make from cmd.exe will NOT work.
# Alternative     : CMakeLists.txt (same targets; CI builds it on Linux).
#
# Targets:
#   make            build all benchmarks + tests into build/bin/
#   make test       stage-1 unit tests + every benchmark's --self-test
#   make run        run every benchmark with its default sweep (writes results/)
#   make plot       regenerate every PNG in results/ from the CSVs
#   make clean      remove build/
#   make help       list targets
#
# Flags:
#   PORTABLE=1      drop -march=native (builds on any x86-64, slightly slower)
#   CXX=g++         override the compiler
#   PYTHON=python3  override the Python interpreter (default python3, or
#                   python on Windows)

ifeq ($(OS),Windows_NT)
  EXE := .exe
else
  EXE :=
endif

CXX    ?= g++
ifeq ($(OS),Windows_NT)
  PYTHON ?= python
else
  PYTHON ?= python3
endif
BUILD  := build
BINDIR := $(BUILD)/bin

ifeq ($(PORTABLE),1)
  ARCHFLAGS :=
else
  ARCHFLAGS := -march=native
endif

# -O3 + -march=native: benchmarks must be compiled the way you would ship
# performance code, or you measure the compiler's pessimism, not the hardware.
#
# -static-libstdc++/-static-libgcc: on this machine the default dynamic C++
# runtime link dies inside collect2->ld with a silent "ld returned 116 exit
# status" (any program touching libstdc++, deterministic, MSYS2 GCC 14.2 /
# binutils 2.43.1). Static runtime linking avoids it and makes the binaries
# self-contained; harmless on Linux/WSL.
COMMON_FLAGS := -std=c++17 -Wall -Wextra
BENCH_FLAGS  := -O3 $(ARCHFLAGS) -static-libstdc++ -static-libgcc
TEST_FLAGS   := -O2 -static-libstdc++ -static-libgcc
DEFS         := -DBENCH_BUILD_FLAGS='"$(BENCH_FLAGS)"'

COMMON_SRCS := common/cpu_info.cpp
COMMON_HDRS := common/cpu_info.h common/cycles.h common/timing.h common/pinning.h \
               common/hints.h common/random.h common/pointer_chase.h \
               common/bench_utils.h

STAGE2_BENCHES := cache_line associativity tlb branch instruction_latency
MATMUL_BENCHES := matmul_naive matmul_ikj matmul_tiled matmul_vectorized \
                  matmul_blocked matmul_openmp matmul_sweep
STAGE5_BENCHES := false_sharing

# BLAS is loaded dynamically at runtime (rung 6); on Linux that needs -ldl.
ifeq ($(OS),Windows_NT)
  LDLIBS_DL :=
else
  LDLIBS_DL := -ldl
endif

.PHONY: all test run plot clean help

all: $(BINDIR)/pointer_chase$(EXE) $(BINDIR)/test_pointer_chase$(EXE) \
     $(addprefix $(BINDIR)/,$(STAGE2_BENCHES:=$(EXE))) \
     $(addprefix $(BINDIR)/,$(MATMUL_BENCHES:=$(EXE))) \
     $(addprefix $(BINDIR)/,$(STAGE5_BENCHES:=$(EXE)))

$(BINDIR)/pointer_chase$(EXE): benchmarks/pointer_chase.cpp $(COMMON_SRCS) $(COMMON_HDRS)
	@mkdir -p $(BINDIR)
	$(CXX) $(COMMON_FLAGS) $(BENCH_FLAGS) $(DEFS) -I. benchmarks/pointer_chase.cpp common/cpu_info.cpp -o $@

$(BINDIR)/test_pointer_chase$(EXE): tests/test_pointer_chase.cpp $(COMMON_SRCS) $(COMMON_HDRS)
	@mkdir -p $(BINDIR)
	$(CXX) $(COMMON_FLAGS) $(TEST_FLAGS) $(DEFS) -I. tests/test_pointer_chase.cpp common/cpu_info.cpp -o $@

# Stage-2 benchmarks share one rule; each depends on its own source.
$(BINDIR)/%$(EXE): benchmarks/%.cpp $(COMMON_SRCS) $(COMMON_HDRS)
	@mkdir -p $(BINDIR)
	$(CXX) $(COMMON_FLAGS) $(BENCH_FLAGS) $(DEFS) -I. $< common/cpu_info.cpp -o $@

# Matmul binaries share the kernels header; the OpenMP rung and the sweep are
# compiled with -fopenmp (the pragma is inert without it, so rung 4 and 5
# share one kernel implementation).
MATMUL_HDRS := matmul/kernels.h matmul/driver.h

$(BINDIR)/matmul_openmp$(EXE): EXTRA_CXXFLAGS := -fopenmp
$(BINDIR)/matmul_sweep$(EXE): EXTRA_CXXFLAGS := -fopenmp
$(BINDIR)/matmul_sweep$(EXE): EXTRA_LDLIBS := $(LDLIBS_DL)
$(BINDIR)/false_sharing$(EXE): EXTRA_CXXFLAGS := -fopenmp

# The -fopenmp binaries link libgomp dynamically, which pulls in the runtime
# DLLs (libgcc_s, libwinpthread). If another MinGW installation's bin dir
# shadows the compiler's on PATH (it does on this machine: Git Bash's
# /mingw64 precedes /c/msys64/ucrt64), Windows loads the WRONG, ABI-mismatched
# DLLs and the process dies with exit 127 before main(). Copying the
# compiler's own DLLs next to the executables fixes resolution: the exe's
# directory is searched before PATH.
ifeq ($(OS),Windows_NT)
  CXX_BINDIR := $(patsubst %/,%,$(dir $(shell command -v $(CXX) 2>/dev/null)))
  OPENMP_DLLS := libgomp-1.dll libwinpthread-1.dll libgcc_s_seh-1.dll
endif

define copy_openmp_dlls
@if [ -n "$(CXX_BINDIR)" ]; then for d in $(OPENMP_DLLS); do \
  if [ ! -f "$(BINDIR)/$$d" ] && [ -f "$(CXX_BINDIR)/$$d" ]; then \
    cp "$(CXX_BINDIR)/$$d" "$(BINDIR)/"; echo "copied $$d next to the -fopenmp binaries"; \
  fi; done; fi
endef

$(BINDIR)/matmul_%$(EXE): matmul/%.cpp $(COMMON_SRCS) $(COMMON_HDRS) $(MATMUL_HDRS)
	@mkdir -p $(BINDIR)
	$(CXX) $(COMMON_FLAGS) $(BENCH_FLAGS) $(EXTRA_CXXFLAGS) $(DEFS) -I. $< common/cpu_info.cpp -o $@ $(EXTRA_LDLIBS)
	$(copy_openmp_dlls)

# false_sharing needs -fopenmp but lives in benchmarks/, where the generic
# stage-2 pattern rule would otherwise shadow the OpenMP flags.
$(BINDIR)/false_sharing$(EXE): benchmarks/false_sharing.cpp $(COMMON_SRCS) $(COMMON_HDRS)
	@mkdir -p $(BINDIR)
	$(CXX) $(COMMON_FLAGS) $(BENCH_FLAGS) -fopenmp $(DEFS) -I. $< common/cpu_info.cpp -o $@
	$(copy_openmp_dlls)

test: all
	$(BINDIR)/test_pointer_chase$(EXE)
	$(BINDIR)/cache_line$(EXE) --self-test
	$(BINDIR)/associativity$(EXE) --self-test
	$(BINDIR)/tlb$(EXE) --self-test
	$(BINDIR)/branch$(EXE) --self-test
	$(BINDIR)/instruction_latency$(EXE) --self-test
	$(BINDIR)/matmul_sweep$(EXE) --self-test
	$(BINDIR)/false_sharing$(EXE) --threads 2 --iters 20000 --reps 1 --out-dir $(BUILD)/smoke --quiet
	$(PYTHON) -m unittest discover -s simulator/tests -t .

run: all
	$(BINDIR)/pointer_chase$(EXE) --max 256M
	$(BINDIR)/cache_line$(EXE)
	$(BINDIR)/associativity$(EXE)
	$(BINDIR)/tlb$(EXE)
	$(BINDIR)/branch$(EXE)
	$(BINDIR)/instruction_latency$(EXE)
	$(BINDIR)/matmul_sweep$(EXE)
	$(PYTHON) simulator/study.py
	$(BINDIR)/false_sharing$(EXE)

plot:
	$(PYTHON) scripts/plot_pointer_chase.py
	$(PYTHON) scripts/plot_cache_line.py
	$(PYTHON) scripts/plot_associativity.py
	$(PYTHON) scripts/plot_tlb.py
	$(PYTHON) scripts/plot_branch.py
	$(PYTHON) scripts/plot_instruction_latency.py
	$(PYTHON) scripts/plot_matmul.py
	$(PYTHON) scripts/plot_simulator.py
	$(PYTHON) scripts/plot_coherence.py
	$(PYTHON) scripts/roofline.py

clean:
	rm -rf $(BUILD)

help:
	@echo "make        build all benchmarks + tests into $(BINDIR)/"
	@echo "make test   unit tests + every benchmark --self-test + simulator tests"
	@echo "make run    run every benchmark with its default sweep (writes results/)"
	@echo "make plot   regenerate every PNG in results/ from the CSVs"
	@echo "make clean  remove $(BUILD)/"
	@echo "Flags: PORTABLE=1 (no -march=native)  CXX=...  PYTHON=..."
