// Correctness tests for Stage 1 (no timing claims here — performance lives in
// benchmarks/, correctness lives here).
//
// The critical property: the permutation produced by link_random_cycle must be
// a SINGLE cycle covering every node exactly once. If it were two disjoint
// cycles, the chase would sample only part of the working set and every
// measurement in the benchmark would be quietly wrong.

#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/hints.h"
#include "common/pointer_chase.h"
#include "common/timing.h"

#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

using namespace lab;

namespace {

int g_checks = 0;
int g_failures = 0;

#define CHECK(cond)                                                        \
    do {                                                                   \
        ++g_checks;                                                        \
        if (!(cond)) {                                                     \
            ++g_failures;                                                  \
            std::printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);   \
        }                                                                  \
    } while (0)

constexpr uint64_t kChaseSeed = 42;

void test_node_layout() {
    // One node must be exactly one 64-byte cache line, pointer at offset 0.
    CHECK(sizeof(Node) == 64);
    CHECK(alignof(Node) == 64);
    CHECK(offsetof(Node, next) == 0);
}

void test_permutation_is_single_cycle(size_t n, uint64_t seed) {
    std::vector<Node> nodes(n);
    link_random_cycle(nodes.data(), n, seed);
    std::set<size_t> visited;
    Node* p = nodes.data();
    for (size_t i = 0; i < n; ++i) {
        visited.insert((size_t)(p - nodes.data()));
        p = p->next;
    }
    CHECK(visited.size() == n);   // every node visited exactly once
    CHECK(p == nodes.data());     // after n hops we are back at the start
}

void test_cycle_validity_various_sizes() {
    // Includes n = 1 (degenerate self-loop), non-powers-of-two, and sizes
    // crossing the node-array allocation path.
    for (size_t n : {size_t(1), size_t(2), size_t(3), size_t(63), size_t(64),
                     size_t(65), size_t(1000), size_t(65536)}) {
        test_permutation_is_single_cycle(n, kChaseSeed);
    }
}

void test_permutation_is_deterministic() {
    const size_t n = 1000;
    std::vector<Node> a(n), b(n);
    link_random_cycle(a.data(), n, 7);
    link_random_cycle(b.data(), n, 7);
    bool identical = true;
    for (size_t i = 0; i < n; ++i) {
        if (a[i].next - a.data() != b[i].next - b.data()) {
            identical = false;
            break;
        }
    }
    CHECK(identical);  // same seed reproduces the same cycle

    link_random_cycle(b.data(), n, 8);
    bool differs = false;
    for (size_t i = 0; i < n; ++i) {
        if (a[i].next - a.data() != b[i].next - b.data()) {
            differs = true;
            break;
        }
    }
    CHECK(differs);  // a different seed changes the layout (probabilistically
                     // certain at n=1000: collision chance is astronomically low)
}

void test_chase_completes_full_cycles() {
    // Whatever the permutation is, n hops must return to the start node, for
    // any number of full laps. This validates the kernel the benchmark times.
    for (size_t n : {size_t(1), size_t(3), size_t(7), size_t(64), size_t(100)}) {
        std::vector<Node> nodes(n);
        link_random_cycle(nodes.data(), n, 99);
        for (size_t laps : {size_t(1), size_t(2), size_t(5)}) {
            Node* end = chase(nodes.data(), n * laps, nullptr);
            CHECK(end == nodes.data());
        }
    }
}

void test_chase_sink_observable() {
    std::vector<Node> nodes(16);
    link_random_cycle(nodes.data(), 16, 5);
    uint64_t sink = 0;
    chase(nodes.data(), 16, &sink);
    CHECK(sink != 0);  // sink received a non-null pointer value
}

void test_timing_is_monotonic() {
    const int64_t a = now_ns();
    const int64_t b = now_ns();
    CHECK(b >= a);
    std::this_thread::sleep_for(std::chrono::milliseconds(2));
    const int64_t c = now_ns();
    CHECK(c - a >= 1000000);  // a 2 ms sleep must advance a monotonic clock
                              // by at least ~1 ms (very loose on purpose)
}

void test_tsc_calibration() {
#if defined(__x86_64__) || defined(__i386__) || defined(_M_X64) || defined(_M_IX86)
    double cps = 0.0;
    CHECK(calibrate_tsc(&cps));
    // Sanity band 0.1–10 GHz: this bounds the value, it does not claim the
    // machine's actual frequency anywhere.
    CHECK(cps > 1e8 && cps < 1e10);
#else
    double cps = 0.0;
    CHECK(!calibrate_tsc(&cps));  // must report "unsupported", not guess
#endif
}

void test_do_not_optimize_preserves_values() {
    int x = 42;
    do_not_optimize(x);
    CHECK(x == 42);

    const int y = 7;
    do_not_optimize(y);
    CHECK(y == 7);

    clobber_memory();
    CHECK(true);
}

void test_machine_info_and_json() {
    MachineInfo m = query_machine();
    CHECK(m.logical_cpus >= 1);
    // On x86 with CPUID we expect a brand string; on exotic setups an empty
    // string is allowed but must not crash anything downstream.
    printf("note: cpu_brand = \"%s\", caches detected = %zu\n",
           m.cpu_brand.c_str(), m.caches.size());

    const std::string path = "build/test_machine.json";
    std::filesystem::create_directories("build");
    std::string err;
    if (write_machine_json(path, m, "test-compiler", "test-flags", "test-cmd",
                           42, 0.0, err)) {
        std::ifstream in(path);
        std::stringstream ss;
        ss << in.rdbuf();
        const std::string text = ss.str();
        CHECK(text.find("\"cpu_brand\"") != std::string::npos);
        CHECK(text.find("\"detected_caches\"") != std::string::npos);
        CHECK(text.find("\"compiler\": \"test-compiler\"") != std::string::npos);
        std::error_code ec;
        std::filesystem::remove(path, ec);
    } else {
        std::printf("note: write_machine_json failed: %s\n", err.c_str());
        CHECK(false);
    }
}

}  // namespace

int main() {
    test_node_layout();
    test_cycle_validity_various_sizes();
    test_permutation_is_deterministic();
    test_chase_completes_full_cycles();
    test_chase_sink_observable();
    test_timing_is_monotonic();
    test_tsc_calibration();
    test_do_not_optimize_preserves_values();
    test_machine_info_and_json();

    std::printf("%d checks, %d failures — %s\n", g_checks, g_failures,
                g_failures == 0 ? "ALL TESTS PASSED" : "TESTS FAILED");
    return g_failures == 0 ? 0 : 1;
}
