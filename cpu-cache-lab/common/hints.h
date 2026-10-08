#pragma once
// Compiler barriers that keep benchmarks honest.
//
//   do_not_optimize(v)  — tells the compiler that v is observable from outside
//                         the program, so dead-code elimination cannot remove
//                         the computation that produced it.
//   clobber_memory()    — compiler-level memory barrier: loads/stores may not
//                         be reordered across it and cached values must be
//                         re-loaded.
//
// Without these, an optimized build is allowed to delete a benchmark entirely
// because its result is unused. The GCC/Clang path emits no machine code at
// all (zero runtime cost); the MSVC path is best-effort.

#if defined(__GNUC__) || defined(__clang__)

template <class T>
inline void do_not_optimize(T const& value) {
    asm volatile("" : : "r,m"(value) : "memory");
}

template <class T>
inline void do_not_optimize(T& value) {
#if defined(__clang__)
    asm volatile("" : "+r,m"(value) : : "memory");
#else
    // GCC cannot combine "+" with alternative constraints ("impossible
    // constraint in 'asm'"); register-only is correct for the scalar values
    // this lab passes.
    asm volatile("" : "+r"(value) : : "memory");
#endif
}

inline void clobber_memory() {
    asm volatile("" : : : "memory");
}

#elif defined(_MSC_VER)

#include <intrin.h>

template <class T>
inline void do_not_optimize(T const& value) {
    (void)*reinterpret_cast<char const volatile*>(&value);
    _ReadWriteBarrier();
}

template <class T>
inline void do_not_optimize(T& value) {
    (void)*reinterpret_cast<char volatile*>(&value);
    _ReadWriteBarrier();
}

inline void clobber_memory() {
    _ReadWriteBarrier();
}

#else
#error "No compiler barrier implementation for this compiler"
#endif
