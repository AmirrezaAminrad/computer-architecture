// Rung 2 — tiled ikj. Example: matmul_tiled --size 1024 --tile 32
#include "matmul/driver.h"

int main(int argc, char** argv) {
    return matmul::rung_main(argc, argv, 2);
}
