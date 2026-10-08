#pragma once
// Monotonic wall-clock timing.
//
// Linux/macOS: clock_gettime(CLOCK_MONOTONIC), as specified in the lab brief.
// Windows:     QueryPerformanceCounter — the platform's equivalent monotonic,
//              high-resolution clock (MinGW's winpthreads also exposes
//              clock_gettime, but QPC is the canonical Windows API and avoids
//              a libwinpthread link dependency).
//
// The clock never goes backwards and is unaffected by system time changes.
// It is suitable for elapsed-time measurement only.

#include <cstdint>

#if defined(_WIN32)
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #ifndef NOMINMAX
  #define NOMINMAX
  #endif
  #include <windows.h>
#else
  #include <time.h>
#endif

namespace lab {

// Nanoseconds elapsed on the monotonic clock since an arbitrary fixed point.
inline int64_t now_ns() {
#if defined(_WIN32)
    static const LARGE_INTEGER freq = [] {
        LARGE_INTEGER f;
        QueryPerformanceFrequency(&f);
        return f;
    }();
    LARGE_INTEGER counter;
    QueryPerformanceCounter(&counter);
    // Scale to ns without overflowing int64: whole seconds first, then the
    // remainder. (freq is typically 10 MHz, so the naive multiply would also
    // fit — this form stays correct for any frequency.)
    return (int64_t)((uint64_t)counter.QuadPart / (uint64_t)freq.QuadPart) * 1000000000LL
         + (int64_t)(((uint64_t)counter.QuadPart % (uint64_t)freq.QuadPart) * 1000000000LL
                     / (uint64_t)freq.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (int64_t)ts.tv_sec * 1000000000LL + ts.tv_nsec;
#endif
}

}  // namespace lab
