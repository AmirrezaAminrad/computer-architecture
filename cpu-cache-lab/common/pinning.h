#pragma once
// CPU pinning for benchmarks.
//
// Why pin: an unpinned thread migrates between cores, losing warm L1/L2 state
// on every hop; on hybrid CPUs (Intel P/E cores) it also decides *which*
// microarchitecture you measure. Latency numbers from a migrating thread are
// averages over different hardware — much less useful.
//
// cpu_index refers to the OS's logical processor numbering, restricted to the
// CPUs the process is allowed to run on.

#include <string>

#if defined(_WIN32)
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #ifndef NOMINMAX
  #define NOMINMAX
  #endif
  #include <windows.h>
#elif defined(__linux__)
  #ifndef _GNU_SOURCE
  #define _GNU_SOURCE 1
  #endif
  #include <cerrno>
  #include <sched.h>
  #include <unistd.h>
  #include <cstring>
#endif

namespace lab {

// Number of logical processors (hardware threads) visible to the process.
inline int logical_cpu_count() {
#if defined(_WIN32)
    SYSTEM_INFO si;
    GetSystemInfo(&si);
    return (int)si.dwNumberOfProcessors;
#elif defined(__linux__)
    return (int)sysconf(_SC_NPROCESSORS_ONLN);
#else
    return 0;  // unknown on this platform
#endif
}

#if defined(__linux__)
// The affinity mask the process started with, captured on first use (always
// before the first pin) so unpin_thread can restore exactly what was allowed.
inline cpu_set_t& process_affinity() {
    static cpu_set_t mask = [] {
        cpu_set_t m;
        CPU_ZERO(&m);
        if (sched_getaffinity(0, sizeof(m), &m) != 0) {
            for (int c = 0; c < CPU_SETSIZE; ++c) CPU_SET(c, &m);
        }
        return m;
    }();
    return mask;
}
#endif

// Pins the calling thread to logical CPU `cpu_index`.
// On success returns true. On failure returns false and fills `error` with a
// human-readable reason (callers should report it, not swallow it).
inline bool pin_to_cpu(int cpu_index, std::string& error) {
#if defined(_WIN32)
    DWORD_PTR proc_mask = 0, sys_mask = 0;
    if (!GetProcessAffinityMask(GetCurrentProcess(), &proc_mask, &sys_mask)) {
        error = "GetProcessAffinityMask failed";
        return false;
    }
    // cpu_index indexes the CPUs the process may use, in OS order.
    int seen = 0;
    for (int bit = 0; bit < 64; ++bit) {
        if (proc_mask & ((DWORD_PTR)1 << bit)) {
            if (seen == cpu_index) {
                DWORD_PTR prev = SetThreadAffinityMask(GetCurrentThread(),
                                                       (DWORD_PTR)1 << bit);
                if (prev == 0) {
                    error = "SetThreadAffinityMask failed";
                    return false;
                }
                return true;
            }
            ++seen;
        }
    }
    error = "cpu index " + std::to_string(cpu_index) + " out of range (" +
            std::to_string(seen) + " usable)";
    return false;
#elif defined(__linux__)
    // cpu_index indexes the CPUs this process may use (cgroup/cpuset-aware),
    // matching the Windows branch; raw CPU numbers would fail in containers.
    const cpu_set_t& allowed = process_affinity();
    int seen = 0;
    for (int c = 0; c < CPU_SETSIZE; ++c) {
        if (!CPU_ISSET(c, &allowed)) continue;
        if (seen++ != cpu_index) continue;
        cpu_set_t set;
        CPU_ZERO(&set);
        CPU_SET(c, &set);
        if (sched_setaffinity(0, sizeof(set), &set) != 0) {
            error = std::string("sched_setaffinity failed: ") + std::strerror(errno);
            return false;
        }
        return true;
    }
    error = "cpu index " + std::to_string(cpu_index) + " out of range (" +
            std::to_string(seen) + " usable)";
    return false;
#else
    // macOS: thread affinity APIs are advisory and often ignored; report
    // rather than pretend.
    (void)cpu_index;
    error = "CPU pinning not supported on this platform";
    return false;
#endif
}

// Restores the calling thread's affinity to the full process affinity mask
// (i.e., undoes a previous pin_to_cpu). Needed before multithreaded runs:
// Windows worker threads inherit their creator's affinity mask, so an OpenMP
// team spawned from a thread pinned to one core would all land on that core.
inline bool unpin_thread(std::string& error) {
#if defined(_WIN32)
    DWORD_PTR proc_mask = 0, sys_mask = 0;
    if (!GetProcessAffinityMask(GetCurrentProcess(), &proc_mask, &sys_mask)) {
        error = "GetProcessAffinityMask failed";
        return false;
    }
    if (SetThreadAffinityMask(GetCurrentThread(), proc_mask) == 0) {
        error = "SetThreadAffinityMask failed";
        return false;
    }
    return true;
#elif defined(__linux__)
    // Restore the process-wide mask captured the first time anything pinned.
    cpu_set_t& full = process_affinity();
    if (sched_setaffinity(0, sizeof(full), &full) != 0) {
        error = std::string("sched_setaffinity failed: ") + std::strerror(errno);
        return false;
    }
    return true;
#else
    error = "CPU unpinning not supported on this platform";
    return false;
#endif
}

}  // namespace lab
