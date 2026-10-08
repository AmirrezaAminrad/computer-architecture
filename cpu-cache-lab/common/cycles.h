#pragma once
// Converting nanoseconds to CPU cycles via the invariant TSC.
//
// Modern x86 CPUs tick the TSC at a fixed *nominal* frequency, independent of
// turbo/boost and core migration. That makes TSC-derived "cycles" ideal for
// comparing ratios across working-set sizes, but they are NOT cycles at the
// current boosted core frequency — absolute counts carry that caveat
// (documented in docs/pointer_chase.md). The frequency here is measured, not
// assumed: __rdtsc is compared against the monotonic clock over a window.
//
// On non-x86 targets this returns false and callers must leave cycle columns
// empty rather than inventing a number.

#include <cstdint>

#if defined(__x86_64__) || defined(__i386__) || defined(_M_X64) || defined(_M_IX86)
  #define LAB_HAVE_TSC 1
  #if defined(__GNUC__) || defined(__clang__)
    #include <x86intrin.h>
  #else
    #include <intrin.h>
  #endif
#endif

#include "common/timing.h"

namespace lab {

// Measures TSC frequency over a busy-wait window of `calibrate_ms`.
// Returns true and writes cycles/second on success; false if unsupported.
inline bool calibrate_tsc(double* cycles_per_second, int calibrate_ms = 60) {
#if defined(LAB_HAVE_TSC)
    if (!cycles_per_second || calibrate_ms <= 0) return false;
    _mm_lfence();                       // serialize so the first rdtsc is exact
    const int64_t t0 = now_ns();
    const uint64_t c0 = __rdtsc();
    int64_t elapsed;
    do {
        elapsed = now_ns() - t0;
    } while (elapsed < (int64_t)calibrate_ms * 1000000LL);
    const uint64_t c1 = __rdtsc();
    _mm_lfence();
    const int64_t t1 = now_ns();
    const double seconds = (double)(t1 - t0) / 1e9;
    if (seconds <= 0.0) return false;
    const double cps = (double)(c1 - c0) / seconds;
    if (cps < 1e6) return false;        // sanity: a TSC slower than 1 MHz is bogus
    *cycles_per_second = cps;
    return true;
#else
    (void)cycles_per_second;
    (void)calibrate_ms;
    return false;
#endif
}

}  // namespace lab
