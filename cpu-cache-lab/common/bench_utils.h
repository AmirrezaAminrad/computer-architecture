#pragma once
// Shared measurement infrastructure for the lab's benchmarks (Stage 2+).
//
// The pattern every benchmark follows:
//   1. a kernel that performs ~N operations and returns how many it actually
//      performed (kernels may round up to whole passes),
//   2. measure_ns_per_op(): probe to estimate the per-op cost, size the
//      repetition to a fixed time budget, warm up, then time `reps`
//      repetitions and report median and min ns/op.
//
// Probing first keeps every data point at a comparable signal-to-noise ratio
// without hard-coding iteration counts that would be wrong on other hardware.

#include <algorithm>
#include <cctype>
#include <cstdint>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <string>
#include <vector>

#include "common/timing.h"

namespace lab {

struct Sample {
    double median_ns;
    double min_ns;
};

inline double median_of_sorted(std::vector<double> v) {
    std::sort(v.begin(), v.end());
    const size_t n = v.size();
    return n % 2 == 1 ? v[n / 2] : 0.5 * (v[n / 2 - 1] + v[n / 2]);
}

// Kernel signature: size_t target_ops -> uint64_t actual_ops.
template <class Kernel>
Sample measure_ns_per_op(Kernel&& kernel, double target_ns, int reps) {
    // Stage-1 probe: a small fixed batch estimates the per-op cost.
    const size_t probe_ops = 1u << 12;
    const int64_t t0 = now_ns();
    const uint64_t probe_actual = kernel(probe_ops);
    const int64_t t1 = now_ns();
    const double est_ns = std::max(0.05,
        (double)(t1 - t0) / (double)(probe_actual ? probe_actual : 1));

    const size_t iters =
        (size_t)std::clamp<double>(target_ns / est_ns, 1u << 10, 1u << 27);

    kernel(iters);  // warm-up (untimed)

    std::vector<double> per_op;
    per_op.reserve((size_t)reps);
    for (int r = 0; r < reps; ++r) {
        const int64_t a = now_ns();
        const uint64_t actual = kernel(iters);
        const int64_t b = now_ns();
        per_op.push_back((double)(b - a) / (double)(actual ? actual : 1));
    }
    // Min must be taken BEFORE the vector is moved into median_of_sorted.
    const double min_ns = *std::min_element(per_op.begin(), per_op.end());
    return {median_of_sorted(std::move(per_op)), min_ns};
}

// Parses sizes like "4096", "4K", "256M", "1G" (KiB/MiB/GiB, case-insensitive,
// optional trailing B). Returns false on malformed input.
inline bool parse_size_bytes(const std::string& text, uint64_t* out) {
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
    const char c = (char)std::toupper((unsigned char)text[i]);
    ++i;
    if (i < text.size()) {
        if ((char)std::toupper((unsigned char)text[i]) != 'B') return false;
        ++i;
    }
    if (i != text.size()) return false;
    switch (c) {
        case 'K': *out = value * 1024ull; return true;
        case 'M': *out = value * 1024ull * 1024ull; return true;
        case 'G': *out = value * 1024ull * 1024ull * 1024ull; return true;
        default: return false;
    }
}

// Opens the parent directory and the CSV file with the given header line.
// Returns a stream that fails if the file cannot be opened and fills `error` —
// callers must check and report, not continue silently.
inline std::ofstream open_csv(const std::string& path, const std::string& header,
                              std::string& error) {
    std::error_code ec;
    const auto parent = std::filesystem::path(path).parent_path();
    if (!parent.empty()) std::filesystem::create_directories(parent, ec);
    std::ofstream out(path, std::ios::binary | std::ios::trunc);
    if (!out) {
        error = "cannot open " + path + " for writing";
        return out;
    }
    out << header << '\n';
    return out;
}

inline std::string human_bytes(uint64_t b) {
    char buf[32];
    if (b >= (1ull << 30))      std::snprintf(buf, sizeof buf, "%.1f GiB", (double)b / (1ull << 30));
    else if (b >= (1ull << 20)) std::snprintf(buf, sizeof buf, "%.1f MiB", (double)b / (1ull << 20));
    else if (b >= (1ull << 10)) std::snprintf(buf, sizeof buf, "%.1f KiB", (double)b / (1ull << 10));
    else                        std::snprintf(buf, sizeof buf, "%llu B", (unsigned long long)b);
    return buf;
}

}  // namespace lab
