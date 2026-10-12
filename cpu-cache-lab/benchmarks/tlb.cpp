// Stage 2 benchmark: TLB behavior via one access per page.
//
// A randomized chase touches exactly one cache line at the start of each
// "page". Sweeping the number of pages makes translation costs visible:
// within the dTLB the per-hop cost is cache-only; past the L1 dTLB (and
// later past the second-level TLB) each hop adds a page walk.
//
// Random page order (seeded) is essential: a sequential page walk looks like
// a stream and hardware prefetchers/TLB prefetching hide the effect.
//
// --page-size defaults to 4 KiB — the OS's own page size, so "page" means
// what the MMU means. Larger values are SIMULATED pages (the MMU still uses
// 4 KiB pages underneath): they change the access pattern's density, not the
// translation granularity, and the docs explain what that does and does not
// show.
//
// Caveat documented in docs/tlb.md: page-count and buffer-size grow together,
// so the curve mixes TLB steps with the cache hierarchy steps from Stage 1.
//
// Output CSV: pages,page_size_bytes,buffer_bytes,hops,median_ns,min_ns

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/pointer_chase.h"
#include "common/pinning.h"

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

#ifndef BENCH_BUILD_FLAGS
#define BENCH_BUILD_FLAGS "unknown"
#endif

using namespace lab;

namespace {

constexpr double kTargetRepNs = 40.0e6;

// The line touched inside page `page`. Page-start slots would put every
// accessed line at a 4 KiB-multiple address — exactly the L1 set period —
// turning the sweep into the associativity experiment's same-set thrash
// (measured: a false "step" from 16 pages on). A pseudo-random line per page
// spreads the accesses across L1 sets; the touched DATA is then only
// pages x 64 B (<= 1 MiB at the default sweep end), which stays cache-resident
// for the entire sweep, so rises in the curve are translation costs.
size_t slot_line_in_page(size_t page, size_t lines_per_page) {
    // 37 is coprime with the power-of-two line counts used here, so pages
    // spread over all lines. Page 0 maps to line 0, so arena[0] is always a
    // valid cycle start for the chase kernel.
    return (page * 37) % lines_per_page;
}

// One slot per page at the pseudo-random line, linked in a random cycle.
void link_page_cycle(Node* arena, size_t pages, size_t nodes_per_page,
                     uint64_t seed) {
    const size_t lines_per_page = nodes_per_page;
    std::vector<Node*> slots(pages);
    for (size_t i = 0; i < pages; ++i) {
        slots[i] = arena + i * nodes_per_page + slot_line_in_page(i, lines_per_page);
    }
    const std::vector<uint32_t> order = random_permutation(pages, seed);
    for (size_t k = 0; k < pages; ++k) {
        slots[order[k]]->next = slots[order[(k + 1) % pages]];
    }
}

int self_test() {
    int failures = 0;
    auto check = [&](bool ok, const char* what) {
        if (!ok) { ++failures; std::printf("FAIL: %s\n", what); }
    };

    // Spaced cycle with in-page offsets: 7 "pages" of 4 nodes (256 B pages).
    std::vector<Node> arena(7 * 4);
    link_page_cycle(arena.data(), 7, 4, 42);
    Node* p = arena.data();
    std::vector<bool> visited(7 * 4, false);
    size_t hops = 0;
    do {
        const size_t idx = (size_t)(p - arena.data());
        check(idx / 4 < 7, "chase stays inside the slotted pages");
        check(!visited[idx], "each page slot visited once per lap");
        visited[idx] = true;
        p = p->next;
        ++hops;
    } while (p != arena.data() && hops <= 7);
    check(hops == 7, "one lap touches every page exactly once");

    // The in-page offset spreads across lines: for 64-line pages, distinct
    // pages must usually map to distinct lines (no 4 KiB set-collision trap).
    std::vector<bool> line_used(64, false);
    size_t distinct = 0;
    for (size_t page = 0; page < 64; ++page) {
        const size_t line = slot_line_in_page(page, 64);
        if (!line_used[line]) { line_used[line] = true; ++distinct; }
    }
    check(distinct >= 60, "in-page offsets spread over most lines");

    std::printf("tlb self-test: %s\n", failures ? "FAILED" : "OK");
    return failures ? 1 : 0;
}

void print_usage(std::FILE* out) {
    std::fprintf(out,
        "tlb — translation-cost probe: one access per page, page count swept\n"
        "\n"
        "Options (defaults in brackets):\n"
        "  --pages-max N    largest page count (power-of-two + midpoint sweep) [16384]\n"
        "  --page-size SIZE page size; 4K = the OS's real page size; larger values\n"
        "                   are SIMULATED pages (see --help header) [4K]\n"
        "  --reps N         timed repetitions per point [5]\n"
        "  --seed S         page-order seed [42]\n"
        "  --cpu N          pin to logical CPU N; -1 disables [0]\n"
        "  --out-dir DIR    output directory [results]\n"
        "  --csv NAME       CSV file name [tlb.csv]\n"
        "  --quiet          suppress progress lines\n"
        "  --self-test      run correctness checks and exit\n"
        "  --help           this text\n");
}

}  // namespace

int main(int argc, char** argv) {
    size_t pages_max = 16384;
    uint64_t page_size = 4096, seed = 42;
    int reps = 5, cpu = 0;
    std::string out_dir = "results", csv_name = "tlb.csv";
    bool quiet = false;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&](std::string* v) -> bool {
            if (i + 1 >= argc) return false;
            *v = argv[++i];
            return true;
        };
        std::string v;
        if (arg == "--help") { print_usage(stdout); return 0; }
        else if (arg == "--self-test") { return self_test(); }
        else if (arg == "--pages-max" && next(&v)) pages_max = (size_t)std::atoi(v.c_str());
        else if (arg == "--page-size" && next(&v)) {
            if (!parse_size_bytes(v, &page_size) || page_size < 64 ||
                page_size % 64 != 0) {
                std::fprintf(stderr, "error: --page-size must be a multiple of 64 "
                                     "and fit the line layout\n");
                return 2;
            }
        }
        else if (arg == "--reps" && next(&v)) reps = std::atoi(v.c_str());
        else if (arg == "--seed" && next(&v)) seed = std::strtoull(v.c_str(), nullptr, 10);
        else if (arg == "--cpu" && next(&v)) cpu = std::atoi(v.c_str());
        else if (arg == "--out-dir" && next(&v)) out_dir = v;
        else if (arg == "--csv" && next(&v)) csv_name = v;
        else if (arg == "--quiet") quiet = true;
        else {
            std::fprintf(stderr, "error: unknown argument '%s' (see --help)\n", arg.c_str());
            return 2;
        }
    }
    if (pages_max < 1 || pages_max > (1u << 22)) {
        std::fprintf(stderr, "error: --pages-max must be in [1, 4194304]\n");
        return 2;
    }

    if (cpu >= 0) {
        std::string err;
        if (pin_to_cpu(cpu, err)) {
            if (!quiet) std::fprintf(stderr, "pinned to logical CPU %d\n", cpu);
        } else {
            std::fprintf(stderr, "warning: pinning failed (%s); continuing UNPINNED\n",
                         err.c_str());
        }
    }

    double tsc_hz = 0.0;
    const MachineInfo machine = query_machine();
    if (!calibrate_tsc(&tsc_hz)) {
        std::fprintf(stderr, "warning: TSC calibration unavailable\n");
    }

    // One node per page (at the page start). Largest buffer first, allocated
    // once; smaller sweeps reuse the front of it.
    const size_t nodes_max = (size_t)pages_max * (size_t)(page_size / sizeof(Node));
    std::vector<Node> arena;
    try {
        arena.resize(nodes_max);
    } catch (const std::bad_alloc&) {
        std::fprintf(stderr, "error: out of memory for %zu pages x %s "
                             "(needs %s) — reduce --pages-max\n",
                     pages_max, human_bytes(page_size).c_str(),
                     human_bytes((uint64_t)nodes_max * sizeof(Node)).c_str());
        return 3;
    }

    const std::string csv_path = out_dir + "/" + csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "pages,page_size_bytes,buffer_bytes,hops,median_ns,min_ns", err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(out_dir + "/machine_tlb.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "tlb", seed, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_tlb.json: %s\n", err.c_str());
    }

    // Sweep page counts: powers of two plus sqrt(2) midpoints.
    struct Point { size_t pages; };
    std::vector<size_t> sweep;
    auto push = [&](size_t pages) {
        if (pages >= 1 && pages <= pages_max &&
            std::find(sweep.begin(), sweep.end(), pages) == sweep.end()) {
            sweep.push_back(pages);
        }
    };
    for (size_t p = 1; p <= pages_max && p > 0; p *= 2) {
        push(p);
        if (p <= pages_max / 2) push((size_t)(p * 1.4142135623730951));
        if (p > pages_max / 2) break;
    }
    std::sort(sweep.begin(), sweep.end());

    if (!quiet) {
        std::fprintf(stderr, "sweeping %zu page counts, page size %s "
                             "(max buffer %s)\n",
                     sweep.size(), human_bytes(page_size).c_str(),
                     human_bytes((uint64_t)pages_max * page_size).c_str());
    }

    const size_t nodes_per_page = (size_t)(page_size / sizeof(Node));
    size_t point = 0;
    for (size_t pages : sweep) {
        link_page_cycle(arena.data(), pages, nodes_per_page, seed + pages);
        uint64_t last_ops = 0;
        const Sample s = measure_ns_per_op(
            [&](size_t target) {
                chase(arena.data(), target, nullptr);
                last_ops = target;
                return last_ops;
            },
            kTargetRepNs, reps);
        const uint64_t buffer_bytes = (uint64_t)pages * page_size;
        csv << pages << ',' << page_size << ',' << buffer_bytes << ',' << last_ops
            << ',' << s.median_ns << ',' << s.min_ns << '\n';
        if (!quiet) {
            std::fprintf(stderr, "[%2zu/%2zu] %6zu pages (%10s)  median %8.3f ns  min %8.3f\n",
                         ++point, sweep.size(), pages, human_bytes(buffer_bytes).c_str(),
                         s.median_ns, s.min_ns);
        }
    }

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }
    std::printf("wrote %s\nplot with: python scripts/plot_tlb.py\n", csv_path.c_str());
    return 0;
}
