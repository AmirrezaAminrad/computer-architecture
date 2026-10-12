#pragma once
// Core of the pointer-chasing latency benchmark, shared by the benchmark and
// its correctness tests.
//
// Design:
//   * Each Node occupies exactly one 64-byte cache line, so one hop touches
//     exactly one line — "node" and "cache line" are the same unit.
//   * Nodes are linked into a single random cycle (seeded). A dependent chain
//     p = p->next across a random permutation is the standard way to measure
//     pure load latency: the next address is unknown until the load returns,
//     so the CPU cannot overlap hops, and a hardware prefetcher cannot predict
//     the pattern (unlike a sequential walk).
//   * The inline asm barrier per hop costs zero instructions; it only stops
//     the compiler from reordering or weakening the dependency chain.

#include <cstddef>
#include <cstdint>
#include <vector>

#include "common/hints.h"
#include "common/random.h"

namespace lab {

struct alignas(64) Node {
    Node* next;
};
static_assert(sizeof(Node) == 64, "Node must occupy exactly one 64-byte cache line");
static_assert(alignof(Node) == 64, "Node must be 64-byte aligned");

// Links `nodes[0..n-1]` into one cycle visiting every node exactly once,
// in an order determined by `seed` (same seed + same n = same cycle).
inline void link_random_cycle(Node* nodes, size_t n, uint64_t seed) {
    const std::vector<uint32_t> order = random_permutation(n, seed);
    for (size_t k = 0; k < n; ++k) {
        nodes[order[k]].next = &nodes[order[(k + 1) % n]];
    }
}

// Links `count` slots spaced `spacing_nodes` apart (arena must hold
// (count-1)*spacing_nodes + 1 nodes) into one random cycle. Used by the
// associativity benchmark (spacing = set period) and the TLB benchmark
// (spacing = one slot per page).
inline void link_spaced_cycle(Node* arena, size_t count, size_t spacing_nodes,
                              uint64_t seed) {
    std::vector<Node*> slots(count);
    for (size_t i = 0; i < count; ++i) slots[i] = arena + i * spacing_nodes;
    const std::vector<uint32_t> order = random_permutation(count, seed);
    for (size_t k = 0; k < count; ++k) {
        slots[order[k]]->next = slots[order[(k + 1) % count]];
    }
}

// Executes `hops` dependent loads starting at `start`, returning the final
// node. `sink` (optional) accumulates an observable value so the whole chain
// survives dead-code elimination at -O3.
inline Node* chase(Node* start, size_t hops, uint64_t* sink) {
    Node* p = start;
#if defined(__GNUC__) || defined(__clang__)
    for (size_t i = 0; i < hops; ++i) {
        p = p->next;
        asm volatile("" : "+r"(p) : : "memory");
    }
#else
    for (size_t i = 0; i < hops; ++i) {
        p = p->next;
        do_not_optimize(p);
    }
#endif
    do_not_optimize(p);
    if (sink) *sink += (uint64_t)(uintptr_t)p;
    return p;
}

}  // namespace lab
