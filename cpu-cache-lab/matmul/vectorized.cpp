// Rung 3 — vectorization (auto + runtime-detected AVX2/FMA).
#include "matmul/driver.h"

int main(int argc, char** argv) {
    return matmul::rung_main(argc, argv, 3);
}
