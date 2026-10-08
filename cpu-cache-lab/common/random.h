#pragma once
// Seeded, reproducible random number generation.
//
// splitmix64: tiny, fast, well-distributed, and identical on every platform
// and compiler — the lab's measurements must be reproducible, which rules out
// std::mt19937 (implementation-defined output) and rand() (everything worse).

#include <cstdint>
#include <vector>

namespace lab {

struct SplitMix64 {
    uint64_t state;
    explicit SplitMix64(uint64_t seed) : state(seed) {}

    uint64_t next() {
        state += 0x9E3779B97F4A7C15ULL;
        uint64_t z = state;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
        return z ^ (z >> 31);
    }
};

// Fisher-Yates shuffle of 0..n-1. The modulo introduces a negligible bias
// that is irrelevant here: what the benchmark needs is unpredictability, not
// perfect uniformity. n must fit in 32 bits (>= 64 GiB of nodes — out of scope).
inline std::vector<uint32_t> random_permutation(size_t n, uint64_t seed) {
    std::vector<uint32_t> perm(n);
    for (size_t i = 0; i < n; ++i) perm[i] = (uint32_t)i;
    if (n <= 1) return perm;
    SplitMix64 rng(seed);
    for (size_t i = n - 1; i >= 1; --i) {
        const size_t j = (size_t)(rng.next() % (i + 1));
        const uint32_t tmp = perm[i];
        perm[i] = perm[j];
        perm[j] = tmp;
    }
    return perm;
}

}  // namespace lab
