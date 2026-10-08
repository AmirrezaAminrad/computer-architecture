#pragma once
// The matmul ladder: six implementations of C = A·B (row-major, n×n doubles),
// each rung fixing the memory-behavior weakness of the previous one. Read
// top to bottom with the GFLOP/s numbers from results/matmul.csv open.
//
//   Rung 0  naive ijk     — B is walked down its columns: a new cache line
//                           (usually a new page) per element. The villain.
//   Rung 1  ikj           — same loops, permuted: the inner loop streams
//                           along rows of B and C. The single biggest win.
//   Rung 2  tiled ikj     — T×T tiles keep both streams cache-resident and
//                           reuse the B tile T times.
//   Rung 3  vectorized    — let the compiler use AVX2/FMA: __restrict so the
//                           aliasing proof succeeds, plus an explicit 4-wide
//                           FMA micro-kernel dispatched at RUNTIME (never
//                           assumed — falls back to the auto path).
//   Rung 4  reg-block+pack — a 4×4 block of C lives in registers while k
//                           runs; the B panel is PACKED into a contiguous
//                           buffer so the micro-kernel streams memory
//                           linearly (see the packing comment below).
//   Rung 5  OpenMP        — rung 4 with the row loop parallelized; rows of
//                           C are disjoint per thread and the packed B panel
//                           is read-only, so there are no locks and no races.
//   Rung 6  BLAS          — cblas_dgemm, dynamically loaded if present;
//                           detected, never assumed. Comparison only.
//
// Everything is correct for any n and tile (edge tiles/panels included),
// which the self-tests exercise on deliberately awkward sizes.

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

#if defined(_WIN32)
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #ifndef NOMINMAX
  #define NOMINMAX
  #endif
  #include <windows.h>
#else
  #include <dlfcn.h>
#endif

#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__)
  #define MATMUL_X86 1
  #include <immintrin.h>
#endif

#if defined(__GNUC__) && !defined(__clang__)
  // Compile the AVX2 micro-kernels for AVX2 even in PORTABLE (baseline
  // x86-64) builds; they are only CALLED after a runtime CPUID check.
  #define MATMUL_TARGET_AVX2 __attribute__((target("avx2,fma")))
#else
  #define MATMUL_TARGET_AVX2
#endif

#ifdef _OPENMP
  #include <omp.h>
#endif

namespace matmul {

// ---------------------------------------------------------------------------
// Rung 0 — naive ijk.
// The inner loop reads B[k*n + j] while k increases: consecutive iterations
// are n*8 bytes apart. On every step the hardware must fetch a new cache
// line for ONE useful double — 8 bytes out of 64, and with 4 KiB pages every
// second step also walks into a new page. This is the baseline all others
// are judged against.
// ---------------------------------------------------------------------------
inline void rung0_ijk(const double* A, const double* B, double* C, int n) {
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            double sum = 0.0;
            for (int k = 0; k < n; ++k) {
                sum += A[(size_t)i * n + k] * B[(size_t)k * n + j];
            }
            C[(size_t)i * n + j] = sum;
        }
    }
}

// ---------------------------------------------------------------------------
// Rung 1 — ikj. The innermost loop now walks C's row and B's row
// SEQUENTIALLY: two streaming reads per iteration, perfectly prefetchable,
// overlappable. Note there is no __restrict here on purpose: rung 1 shows
// what plain, un-annotated code gets from -O3; rung 3 owns vectorization.
// ---------------------------------------------------------------------------
inline void rung1_ikj(const double* A, const double* B, double* C, int n) {
    for (int i = 0; i < n; ++i) {
        for (int k = 0; k < n; ++k) {
            const double a = A[(size_t)i * n + k];
            for (int j = 0; j < n; ++j) {
                C[(size_t)i * n + j] += a * B[(size_t)k * n + j];
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Rung 2 — tiled ikj. Loop over T×T tiles (ii, kk, jj); inside, i/k/j walk
// the tiles. Two effects: the A and B tile streams fit in cache, and each
// T×T B tile is re-read T times — from cache, not memory. Edge tiles are
// clipped with min() so any (n, T) combination is correct.
// ---------------------------------------------------------------------------
inline void rung2_tiled(const double* A, const double* B, double* C, int n,
                        int tile) {
    const int T = tile > 0 ? tile : 64;
    for (int ii = 0; ii < n; ii += T) {
        const int iend = ii + T < n ? ii + T : n;
        for (int kk = 0; kk < n; kk += T) {
            const int kend = kk + T < n ? kk + T : n;
            for (int jj = 0; jj < n; jj += T) {
                const int jend = jj + T < n ? jj + T : n;
                for (int i = ii; i < iend; ++i) {
                    const double* Arow = A + (size_t)i * n;
                    double* Crow = C + (size_t)i * n;
                    for (int k = kk; k < kend; ++k) {
                        const double a = Arow[k];
                        const double* Brow = B + (size_t)k * n;
                        for (int j = jj; j < jend; ++j) {
                            Crow[j] += a * Brow[j];
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Rung 3 — vectorization.
//   * "auto": the ikj kernel with __restrict. restrict lets the compiler
//     PROVE C and B don't alias, which is what unlocks clean auto-vectorized
//     FMA code at -O3 -march=native.
//   * "avx2+fma": an explicit 4-wide FMA inner loop. Compiled via the
//     target("avx2,fma") attribute (so even PORTABLE builds contain it) and
//     only called when __builtin_cpu_supports says the CPU really has
//     AVX2+FMA — the feature is detected, never assumed.
// ---------------------------------------------------------------------------
inline void rung3_auto(const double* __restrict A, const double* __restrict B,
                       double* __restrict C, int n) {
    for (int i = 0; i < n; ++i) {
        for (int k = 0; k < n; ++k) {
            const double a = A[(size_t)i * n + k];
            const double* __restrict Brow = B + (size_t)k * n;
            double* __restrict Crow = C + (size_t)i * n;
            for (int j = 0; j < n; ++j) {
                Crow[j] += a * Brow[j];
            }
        }
    }
}

#if defined(MATMUL_X86) && defined(__GNUC__) && !defined(__clang__)
MATMUL_TARGET_AVX2
inline void rung3_avx2(const double* A, const double* B, double* C, int n) {
    for (int i = 0; i < n; ++i) {
        double* Crow = C + (size_t)i * n;
        for (int k = 0; k < n; ++k) {
            const __m256d a = _mm256_set1_pd(A[(size_t)i * n + k]);
            const double* Brow = B + (size_t)k * n;
            int j = 0;
            for (; j + 4 <= n; j += 4) {
                __m256d c = _mm256_loadu_pd(Crow + j);
                c = _mm256_fmadd_pd(a, _mm256_loadu_pd(Brow + j), c);
                _mm256_storeu_pd(Crow + j, c);
            }
            for (; j < n; ++j) {
                Crow[j] += A[(size_t)i * n + k] * Brow[j];
            }
        }
    }
}
#endif

inline bool cpu_has_avx2_fma() {
#if defined(MATMUL_X86) && (defined(__GNUC__) || defined(__clang__))
    return __builtin_cpu_supports("avx2") && __builtin_cpu_supports("fma");
#else
    return false;
#endif
}

// Dispatches rung 3 and reports which implementation actually ran.
inline void rung3_vectorized(const double* A, const double* B, double* C,
                             int n, std::string* impl) {
#if defined(MATMUL_X86) && defined(__GNUC__) && !defined(__clang__)
    if (cpu_has_avx2_fma()) {
        rung3_avx2(A, B, C, n);
        if (impl) *impl = "avx2+fma";
        return;
    }
#endif
    rung3_auto(A, B, C, n);
    if (impl) *impl = "restrict-auto";
}

// ---------------------------------------------------------------------------
// Rung 4 — register blocking + B packing.
//
// Register blocking: instead of one C element per k-loop, hold a 4×4 block
// of C in registers (4 AVX2 vectors, one per row) while k runs. Per k-step:
// 4 broadcasts of A + 1 load of B feed 16 FMAs — the arithmetic-to-memory
// ratio rises ~4× over rung 3's 1×4.
//
// Packing: the micro-kernel needs B[k][j..j+3] for consecutive k — four
// doubles from rows n*8 bytes apart. Unpacked, every k-step of every block
// touches 4 scattered cache lines. So each (k-tile × 4) B panel is copied
// ONCE into a small contiguous buffer, and the micro-kernel then reads it as
// a pure sequential stream. Each packed byte is re-read n/4 times (once per
// row-block) but from L1/registers, not memory. This is the same idea BLAS
// libraries (Goto's algorithm) use: spend a cheap one-time copy to make the
// hot loop's memory behavior perfect.
// ---------------------------------------------------------------------------
constexpr int kRegBlock = 4;

// Packed-panel micro-kernel: C[i0..i0+4) x [j0..j0+4) += A-block * Bp.
// Reads C first and writes back so successive k-tiles accumulate.
#if defined(MATMUL_X86) && defined(__GNUC__) && !defined(__clang__)
MATMUL_TARGET_AVX2
inline void micro_4x4_avx2(const double* A, const double* Bp, double* C,
                           int n, int i0, int j0, int kk, int kt) {
    __m256d c0 = _mm256_loadu_pd(C + (size_t)(i0 + 0) * n + j0);
    __m256d c1 = _mm256_loadu_pd(C + (size_t)(i0 + 1) * n + j0);
    __m256d c2 = _mm256_loadu_pd(C + (size_t)(i0 + 2) * n + j0);
    __m256d c3 = _mm256_loadu_pd(C + (size_t)(i0 + 3) * n + j0);
    for (int k = 0; k < kt; ++k) {
        const __m256d b = _mm256_loadu_pd(Bp + (size_t)k * 4);
        c0 = _mm256_fmadd_pd(_mm256_set1_pd(A[(size_t)(i0 + 0) * n + kk + k]), b, c0);
        c1 = _mm256_fmadd_pd(_mm256_set1_pd(A[(size_t)(i0 + 1) * n + kk + k]), b, c1);
        c2 = _mm256_fmadd_pd(_mm256_set1_pd(A[(size_t)(i0 + 2) * n + kk + k]), b, c2);
        c3 = _mm256_fmadd_pd(_mm256_set1_pd(A[(size_t)(i0 + 3) * n + kk + k]), b, c3);
    }
    _mm256_storeu_pd(C + (size_t)(i0 + 0) * n + j0, c0);
    _mm256_storeu_pd(C + (size_t)(i0 + 1) * n + j0, c1);
    _mm256_storeu_pd(C + (size_t)(i0 + 2) * n + j0, c2);
    _mm256_storeu_pd(C + (size_t)(i0 + 3) * n + j0, c3);
}
#endif

// Scalar twin of the micro-kernel: used for edge rows/panels (n not
// divisible by 4) and as the fallback when AVX2 is absent.
inline void micro_4x4_scalar(const double* A, const double* Bp, double* C,
                             int n, int i0, int j0, int kk, int kt) {
    double c[4][4];
    for (int r = 0; r < 4; ++r) {
        for (int q = 0; q < 4; ++q) {
            c[r][q] = C[(size_t)(i0 + r) * n + j0 + q];
        }
    }
    for (int k = 0; k < kt; ++k) {
        for (int r = 0; r < 4; ++r) {
            const double a = A[(size_t)(i0 + r) * n + kk + k];
            for (int q = 0; q < 4; ++q) {
                c[r][q] += a * Bp[(size_t)k * 4 + q];
            }
        }
    }
    for (int r = 0; r < 4; ++r) {
        for (int q = 0; q < 4; ++q) {
            C[(size_t)(i0 + r) * n + j0 + q] = c[r][q];
        }
    }
}

// Shared body of rungs 4 and 5. `parallel` enables the OpenMP pragma (only
// effective when compiled with -fopenmp); threads>0 pins the team size.
// Reports the impl string actually used.
inline void rung4_blocked_impl(const double* A, const double* B, double* C,
                               int n, int tile, bool parallel, int threads,
                               std::string* impl) {
    (void)parallel;  // used only when compiled with -fopenmp
    (void)threads;
    const int T = tile > 0 ? tile : 256;
    std::vector<double> pack((size_t)T * kRegBlock);

#ifdef _OPENMP
    if (threads > 0) omp_set_num_threads(threads);
#endif

    for (int kk = 0; kk < n; kk += T) {
        const int kt = kk + T < n ? T : n - kk;  // COUNT of k steps in this tile
        for (int jj = 0; jj < n; jj += kRegBlock) {
            const int w = jj + kRegBlock < n ? kRegBlock : n - jj;
            if (w == kRegBlock) {
                // Pack the B panel once; every row-block reuses it.
                for (int k = 0; k < kt; ++k) {
                    const double* Brow = B + (size_t)(kk + k) * n + jj;
                    for (int q = 0; q < kRegBlock; ++q) {
                        pack[(size_t)k * kRegBlock + q] = Brow[q];
                    }
                }
#ifdef _OPENMP
#pragma omp parallel for schedule(dynamic) if (parallel)
#endif
                for (int i0 = 0; i0 < n; i0 += kRegBlock) {
                    if (i0 + kRegBlock <= n) {
#if defined(MATMUL_X86) && defined(__GNUC__) && !defined(__clang__)
                        if (cpu_has_avx2_fma()) {
                            micro_4x4_avx2(A, pack.data(), C, n, i0, jj, kk, kt);
                        } else {
                            micro_4x4_scalar(A, pack.data(), C, n, i0, jj, kk, kt);
                        }
#else
                        micro_4x4_scalar(A, pack.data(), C, n, i0, jj, kk, kt);
#endif
                    } else {
                        // Edge rows: scalar tail (fewer than 4 rows left).
                        for (int i = i0; i < n; ++i) {
                            for (int k = 0; k < kt; ++k) {
                                const double a = A[(size_t)i * n + kk + k];
                                for (int q = 0; q < kRegBlock; ++q) {
                                    C[(size_t)i * n + jj + q] +=
                                        a * pack[(size_t)k * kRegBlock + q];
                                }
                            }
                        }
                    }
                }
            } else {
                // Edge panel (n % 4 != 0): plain scalar loops.
                for (int i = 0; i < n; ++i) {
                    for (int k = 0; k < kt; ++k) {
                        const double a = A[(size_t)i * n + kk + k];
                        const double* Brow = B + (size_t)(kk + k) * n + jj;
                        double* Crow = C + (size_t)i * n + jj;
                        for (int q = 0; q < w; ++q) {
                            Crow[q] += a * Brow[q];
                        }
                    }
                }
            }
        }
    }
    if (impl) {
        *impl = cpu_has_avx2_fma() ? "4x4-regblock+pack(avx2)"
                                   : "4x4-regblock+pack(scalar)";
#ifdef _OPENMP
        if (parallel && threads != 1) {
            *impl += "+openmp";
        }
#endif
    }
}

inline void rung4_blocked(const double* A, const double* B, double* C, int n,
                          int tile, std::string* impl) {
    rung4_blocked_impl(A, B, C, n, tile, /*parallel=*/false, /*threads=*/1, impl);
}

// ---------------------------------------------------------------------------
// Rung 5 — OpenMP. Same kernel as rung 4 with `parallel = true`: the row
// loop is split across threads. Correctness by construction: each thread
// owns disjoint 4-row bands of C (distinct cache lines), the packed B panel
// is built BEFORE the parallel region and only read inside it, and A is
// read-only. No locks anywhere.
// ---------------------------------------------------------------------------
inline void rung5_openmp(const double* A, const double* B, double* C, int n,
                         int tile, int threads, std::string* impl) {
#ifdef _OPENMP
    rung4_blocked_impl(A, B, C, n, tile, /*parallel=*/threads != 1, threads, impl);
    if (impl && threads > 1) {
        *impl += "(" + std::to_string(threads) + "thr)";
    }
#else
    (void)threads;  // OpenMP support is not compiled in for this binary
    // Compiled without -fopenmp: report honestly instead of pretending.
    rung4_blocked_impl(A, B, C, n, tile, false, 1, impl);
    if (impl) *impl += " (openmp-not-compiled-in)";
#endif
}

// ---------------------------------------------------------------------------
// Rung 6 — BLAS comparison. cblas_dgemm is loaded dynamically from whichever
// BLAS is present on the machine; if none is found the caller reports
// "skipped" and the ladder still completes. The lab never assumes BLAS
// exists — and never links it statically.
// ---------------------------------------------------------------------------
using cblas_dgemm_fn = void (*)(int, int, int, int, int, int, double,
                                const double*, int, const double*, int, double,
                                double*, int);
// CBLAS layout/order constants (from the cblas standard header):
// RowMajor=101, ColMajor=102; NoTrans=111, Trans=112, ConjTrans=113.
constexpr int kCblasRowMajor = 101;
constexpr int kCblasNoTrans = 111;

struct BlasHandle {
    void* library = nullptr;
    cblas_dgemm_fn dgemm = nullptr;
    std::string name;
};

inline bool blas_load(BlasHandle* out) {
    if (!out) return false;
    *out = BlasHandle{};
#if defined(_WIN32)
    const char* candidates[] = {"openblas.dll", "libopenblas.dll", "blis.dll",
                                "mkl_rt.dll"};
#elif defined(__APPLE__)
    const char* candidates[] = {"libopenblas.0.dylib", "libopenblas.dylib",
                                "libblis.3.dylib", "libaccelerate.dylib"};
#else
    const char* candidates[] = {"libopenblas.so.0", "libopenblas.so",
                                "libblis.so.3", "libblis.so", "libmkl_rt.so"};
#endif
    for (const char* name : candidates) {
        void* lib;
#if defined(_WIN32)
        lib = (void*)LoadLibraryA(name);
        if (!lib) continue;
        void* sym = (void*)GetProcAddress((HMODULE)lib, "cblas_dgemm");
#else
        lib = dlopen(name, RTLD_LAZY | RTLD_LOCAL);
        if (!lib) continue;
        void* sym = dlsym(lib, "cblas_dgemm");
#endif
        if (!sym) {
#if defined(_WIN32)
            FreeLibrary((HMODULE)lib);
#else
            dlclose(lib);
#endif
            continue;
        }
        out->library = lib;
        out->dgemm = (cblas_dgemm_fn)sym;
        out->name = name;
        return true;
    }
    return false;
}

inline void blas_unload(BlasHandle* h) {
    if (h && h->library) {
#if defined(_WIN32)
        FreeLibrary((HMODULE)h->library);
#else
        dlclose(h->library);
#endif
        h->library = nullptr;
        h->dgemm = nullptr;
    }
}

inline void rung6_blas(const BlasHandle& h, const double* A, const double* B,
                       double* C, int n) {
    h.dgemm(kCblasRowMajor, kCblasNoTrans, kCblasNoTrans, n, n, n, 1.0, A, n,
            B, n, 0.0, C, n);
}

}  // namespace matmul
