// Stage 1 benchmark: memory latency vs working-set size via randomized
// pointer chasing.
//
// What it measures: the time for one dependent load (p = p->next) as the
// working set grows from L1-sized to RAM-sized. The curve makes the cache
// hierarchy visible as latency steps at (roughly) each cache's capacity.
//
// Reproducibility: the access order comes from a seeded splitmix64
// permutation, iteration counts are recorded in the CSV, and machine.json
// captures the hardware/build context. Same machine + same flags = same CSV.
//
// Usage summary (full list: --help):
//   pointer_chase [--min 4K] [--max 256M] [--reps 5] [--seed 42]
//                 [--cpu 0] [--points 0] [--out-dir results]
//                 [--csv pointer_chase.csv] [--quiet]
//
// Output:
//   results/pointer_chase.csv   size_bytes,iterations,median_ns,min_ns,cycles_per_access
//   results/machine.json        hardware + build context for the run

#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/pointer_chase.h"
#include "common/pinning.h"
#include "common/timing.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <new>
#include <sstream>
#include <string>
#include <vector>

#ifndef BENCH_BUILD_FLAGS
#define BENCH_BUILD_FLAGS "unknown"
#endif

using namespace lab;

namespace {

constexpr uint64_t KIB = 1024;
constexpr uint64_t MIB = 1024 * KIB;
constexpr uint64_t GIB = 1024 * MIB;

// Per-repetition time budget. Short reps are dominated by timer noise; long
// reps make the whole sweep slow. ~40 ms per rep keeps reps above noise while
// a full sweep finishes in well under a minute.
constexpr double kTargetRepNs = 40.0e6;

struct Options {
    uint64_t min_size = 4 * KIB;
    uint64_t max_size = 0;  // 0 → auto: min(1 GiB, physical RAM / 4)
    int reps = 5;
    uint64_t seed = 42;
    int cpu = 0;        // -1 disables pinning
    int points = 0;     // 0 → powers of two + sqrt(2) midpoints; N → log-spaced
    std::string out_dir = "results";
    std::string csv_name = "pointer_chase.csv";
    bool quiet = false;
};

void print_usage(std::FILE* out) {
    std::fprintf(out,
        "pointer_chase — measure load latency across the cache hierarchy\n"
        "\n"
        "Chases a seeded random permutation of 64-byte nodes and reports\n"
        "nanoseconds per dependent load as the working set grows.\n"
        "\n"
        "Options (defaults in brackets):\n"
        "  --min SIZE    smallest working set [4K]        sizes accept K/M/G suffixes (KiB/MiB/GiB)\n"
        "  --max SIZE    largest working set [auto: min(1G, physical RAM / 4)]\n"
        "  --reps N      timed repetitions per size, reported as median and min [5]\n"
        "  --seed S      permutation seed (reproducible runs) [42]\n"
        "  --cpu N       pin to logical CPU N; -1 disables pinning [0]\n"
        "  --points N    0 = powers of two plus sqrt(2) midpoints;\n"
        "                N > 0 = N log-spaced points between --min and --max [0]\n"
        "  --out-dir DIR directory for CSV + machine.json [results]\n"
        "  --csv NAME    CSV file name inside --out-dir [pointer_chase.csv]\n"
        "  --quiet       suppress progress lines on stderr\n"
        "  --help        this text\n"
        "\n"
        "Examples:\n"
        "  pointer_chase --max 256M\n"
        "  pointer_chase --min 1M --max 1G --points 40 --cpu 4\n");
}

bool parse_size(const std::string& text, uint64_t* out) {
    if (text.empty()) return false;
    size_t i = 0;
    uint64_t value = 0;
    while (i < text.size() && std::isdigit((unsigned char)text[i])) {
        if (value > (UINT64_MAX - 9) / 10) return false;
        value = value * 10 + (uint64_t)(text[i] - '0');
        ++i;
    }
    if (i == text.size()) {
        *out = value;
        return true;
    }
    // Optional multiplier: K/M/G (case-insensitive), optional trailing B.
    char c = (char)std::toupper((unsigned char)text[i]);
    ++i;
    if (i < text.size()) {
        if ((char)std::toupper((unsigned char)text[i]) != 'B') return false;
        ++i;
    }
    if (i != text.size()) return false;
    switch (c) {
        case 'K': *out = value * KIB; return true;
        case 'M': *out = value * MIB; return true;
        case 'G': *out = value * GIB; return true;
        default: return false;
    }
}

// Parses argv. Returns: 0 = ok, 1 = help printed, -1 = bad arguments.
int parse_args(int argc, char** argv, Options* opt) {
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&](const char* name, std::string* value) -> bool {
            if (i + 1 >= argc) {
                std::fprintf(stderr, "error: %s requires a value\n", name);
                return false;
            }
            *value = argv[++i];
            return true;
        };
        std::string v;
        if (arg == "--help") {
            print_usage(stdout);
            return 1;
        } else if (arg == "--min" && next("--min", &v)) {
            if (!parse_size(v, &opt->min_size)) {
                std::fprintf(stderr, "error: bad --min size '%s'\n", v.c_str());
                return -1;
            }
        } else if (arg == "--max" && next("--max", &v)) {
            if (!parse_size(v, &opt->max_size)) {
                std::fprintf(stderr, "error: bad --max size '%s'\n", v.c_str());
                return -1;
            }
        } else if (arg == "--reps" && next("--reps", &v)) {
            opt->reps = std::atoi(v.c_str());
            if (opt->reps < 1 || opt->reps > 1000) {
                std::fprintf(stderr, "error: --reps must be in [1, 1000]\n");
                return -1;
            }
        } else if (arg == "--seed" && next("--seed", &v)) {
            opt->seed = std::strtoull(v.c_str(), nullptr, 10);
        } else if (arg == "--cpu" && next("--cpu", &v)) {
            opt->cpu = std::atoi(v.c_str());
        } else if (arg == "--points" && next("--points", &v)) {
            opt->points = std::atoi(v.c_str());
            if (opt->points < 0 || opt->points > 10000) {
                std::fprintf(stderr, "error: --points must be in [0, 10000]\n");
                return -1;
            }
        } else if (arg == "--out-dir" && next("--out-dir", &v)) {
            opt->out_dir = v;
        } else if (arg == "--csv" && next("--csv", &v)) {
            opt->csv_name = v;
        } else if (arg == "--quiet") {
            opt->quiet = true;
        } else {
            std::fprintf(stderr, "error: unknown argument '%s' (see --help)\n", arg.c_str());
            return -1;
        }
    }
    return 0;
}

uint64_t round_to_line(uint64_t bytes) {
    return std::max<uint64_t>(sizeof(Node), bytes & ~(uint64_t)(sizeof(Node) - 1));
}

std::vector<uint64_t> build_size_list(const Options& opt) {
    std::vector<uint64_t> sizes;
    auto push = [&](uint64_t s) {
        s = round_to_line(s);
        if (s < opt.min_size || s > opt.max_size) return;
        if (std::find(sizes.begin(), sizes.end(), s) == sizes.end()) sizes.push_back(s);
    };
    if (opt.points > 0) {
        for (int k = 0; k < opt.points; ++k) {
            const double frac = opt.points == 1 ? 0.0 : (double)k / (double)(opt.points - 1);
            const double v = (double)opt.min_size *
                             std::pow((double)opt.max_size / (double)opt.min_size, frac);
            push((uint64_t)v);
        }
    } else {
        for (uint64_t p = round_to_line(opt.min_size); p <= opt.max_size; p *= 2) {
            push(p);
            if (p <= opt.max_size / 2) push((uint64_t)(p * std::sqrt(2.0)));
            if (p > opt.max_size / 2) break;  // also stops before p *= 2 overflows
        }
    }
    std::sort(sizes.begin(), sizes.end());
    return sizes;
}

std::string human_bytes(uint64_t b) {
    char buf[32];
    if (b >= GIB)      std::snprintf(buf, sizeof buf, "%.1f GiB", (double)b / GIB);
    else if (b >= MIB) std::snprintf(buf, sizeof buf, "%.1f MiB", (double)b / MIB);
    else if (b >= KIB) std::snprintf(buf, sizeof buf, "%.1f KiB", (double)b / KIB);
    else               std::snprintf(buf, sizeof buf, "%llu B", (unsigned long long)b);
    return buf;
}

struct Sample {
    double median_ns;
    double min_ns;
};

Sample measure_size(std::vector<Node>& nodes, size_t iters, int reps, uint64_t* sink) {
    std::vector<double> per_hop;
    per_hop.reserve((size_t)reps);
    for (int r = 0; r < reps; ++r) {
        const int64_t t0 = now_ns();
        chase(nodes.data(), iters, sink);
        const int64_t t1 = now_ns();
        per_hop.push_back((double)(t1 - t0) / (double)iters);
    }
    std::sort(per_hop.begin(), per_hop.end());
    const size_t n = per_hop.size();
    const double median = n % 2 == 1
        ? per_hop[n / 2]
        : 0.5 * (per_hop[n / 2 - 1] + per_hop[n / 2]);
    return {median, per_hop.front()};
}

std::string join_args(int argc, char** argv) {
    std::ostringstream os;
    for (int i = 0; i < argc; ++i) {
        if (i) os << ' ';
        os << argv[i];
    }
    return os.str();
}

std::string compiler_string() {
#if defined(__GNUC__) && !defined(__clang__)
    return std::string("g++ ") + __VERSION__;
#elif defined(__clang__)
    return std::string("clang ") + __VERSION__;
#elif defined(_MSC_VER)
    return std::string("msvc ") + std::to_string(_MSC_VER);
#else
    return "unknown";
#endif
}

}  // namespace

int main(int argc, char** argv) {
    Options opt;
    const int parsed = parse_args(argc, argv, &opt);
    if (parsed == 1) return 0;
    if (parsed == -1) return 2;

    const MachineInfo machine = query_machine();
    if (opt.max_size == 0) {
        // Default ceiling: 1 GiB or a quarter of physical RAM, whichever is
        // smaller — big enough to be far past L3, small enough to never
        // threaten the machine's health.
        uint64_t cap = std::min<uint64_t>(1 * GIB, machine.physical_ram / 4);
        if (cap == 0) cap = 256 * MIB;  // RAM unknown: stay conservative
        opt.max_size = std::max(cap, opt.min_size);
    }
    if (opt.max_size < opt.min_size) {
        std::fprintf(stderr, "error: --max (%s) is smaller than --min (%s)\n",
                     human_bytes(opt.max_size).c_str(), human_bytes(opt.min_size).c_str());
        return 2;
    }

    if (opt.cpu >= 0) {
        std::string err;
        if (pin_to_cpu(opt.cpu, err)) {
            if (!opt.quiet) {
                std::fprintf(stderr, "pinned to logical CPU %d of %d\n", opt.cpu,
                             machine.logical_cpus);
            }
        } else {
            std::fprintf(stderr, "warning: pinning to CPU %d failed (%s); "
                                 "continuing UNPINNED — latency may be noisier\n",
                         opt.cpu, err.c_str());
        }
    }

    double tsc_hz = 0.0;
    if (calibrate_tsc(&tsc_hz)) {
        if (!opt.quiet) {
            std::fprintf(stderr, "measured TSC frequency: %.3f GHz "
                                 "(nominal, not turbo — see docs)\n", tsc_hz / 1e9);
        }
    } else {
        std::fprintf(stderr, "warning: TSC calibration unavailable; "
                             "cycles_per_access column will be empty\n");
    }

    const std::vector<uint64_t> sizes = build_size_list(opt);
    if (sizes.empty()) {
        std::fprintf(stderr, "error: no sizes in [%s, %s]\n",
                     human_bytes(opt.min_size).c_str(), human_bytes(opt.max_size).c_str());
        return 2;
    }

    const std::filesystem::path out_dir(opt.out_dir);
    std::error_code ec;
    std::filesystem::create_directories(out_dir, ec);
    const std::filesystem::path csv_path = out_dir / opt.csv_name;

    std::ofstream csv(csv_path, std::ios::binary | std::ios::trunc);
    if (!csv) {
        std::fprintf(stderr, "error: cannot open %s for writing\n", csv_path.string().c_str());
        return 2;
    }
    // Exact schema from the lab brief; cycles column is empty when the TSC
    // frequency could not be measured.
    csv << "size_bytes,iterations,median_ns,min_ns,cycles_per_access\n";

    std::string json_err;
    if (!write_machine_json((out_dir / "machine.json").string(), machine,
                            compiler_string(), BENCH_BUILD_FLAGS, join_args(argc, argv),
                            opt.seed, tsc_hz, json_err)) {
        // Keep going: the CSV is the primary result, but say so loudly.
        std::fprintf(stderr, "warning: could not write machine.json: %s\n", json_err.c_str());
    }

    if (!opt.quiet) {
        std::fprintf(stderr, "sweeping %zu sizes from %s to %s | reps=%d seed=%llu\n",
                     sizes.size(), human_bytes(sizes.front()).c_str(),
                     human_bytes(sizes.back()).c_str(), opt.reps,
                     (unsigned long long)opt.seed);
    }

    uint64_t sink = 0;
    double est_ns_per_hop = 5.0;
    size_t index = 0;

    for (uint64_t size : sizes) {
        const size_t n = (size_t)(size / sizeof(Node));
        std::vector<Node> nodes;
        try {
            nodes.resize(n);
        } catch (const std::bad_alloc&) {
            std::fprintf(stderr, "\nerror: out of memory allocating %s "
                                 "(%zu nodes) — rerun with a smaller --max\n",
                         human_bytes(size).c_str(), n);
            return 3;
        }

        // Linking writes every node once: pages are touched (first-touch) and
        // resident before any timing.
        link_random_cycle(nodes.data(), n, opt.seed);

        // Probe to calibrate the per-hop cost, then pick the iteration count
        // that makes one repetition last ~kTargetRepNs. Bounded so a wild
        // estimate can never explode a run.
        const size_t probe_iters =
            (size_t)std::clamp<uint64_t>((uint64_t)(kTargetRepNs / est_ns_per_hop),
                                         1 << 15, 1 << 19);
        const int64_t probe_t0 = now_ns();
        chase(nodes.data(), probe_iters, &sink);
        const int64_t probe_t1 = now_ns();
        est_ns_per_hop =
            std::max(0.1, (double)(probe_t1 - probe_t0) / (double)probe_iters);

        const size_t iters =
            (size_t)std::clamp<uint64_t>((uint64_t)(kTargetRepNs / est_ns_per_hop),
                                         1 << 14, 1 << 25);

        // Warm-up: one untimed pass so timed reps see steady state.
        chase(nodes.data(), iters, &sink);

        const Sample sample = measure_size(nodes, iters, opt.reps, &sink);

        char cycles[32] = "";
        if (tsc_hz > 0.0) {
            std::snprintf(cycles, sizeof cycles, "%.2f", sample.median_ns * tsc_hz / 1e9);
        }
        csv << size << ',' << iters << ','
            << sample.median_ns << ',' << sample.min_ns << ',' << cycles << '\n';

        if (!opt.quiet) {
            std::fprintf(stderr, "[%3zu/%3zu] %10s  median %8.3f ns  min %8.3f ns\n",
                         ++index, sizes.size(), human_bytes(size).c_str(),
                         sample.median_ns, sample.min_ns);
        }
    }

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed while writing %s\n", csv_path.string().c_str());
        return 2;
    }

    // Observable side effect of every chase; prints so nothing above can be
    // optimized away, and lets a reader confirm the chain was really walked.
    std::fprintf(stderr, "\nsink value (ignore): %llu\n", (unsigned long long)sink);

    std::printf("wrote %zu rows -> %s\n", sizes.size(), csv_path.string().c_str());
    std::printf("machine context -> %s\n", (out_dir / "machine.json").string().c_str());
    std::printf("plot with: python scripts/plot_pointer_chase.py\n");
    return 0;
}
