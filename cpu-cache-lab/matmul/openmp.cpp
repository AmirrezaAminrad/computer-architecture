// Rung 5 — OpenMP (compile with -fopenmp; the pragma is inert otherwise).
#include "matmul/driver.h"

int main(int argc, char** argv) {
    return matmul::rung_main(argc, argv, 5);
}
