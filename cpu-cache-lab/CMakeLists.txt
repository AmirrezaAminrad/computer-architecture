# cpu-cache-lab — CMake build (alternative to the Makefile).
#
# Builds the same targets as the Makefile; CI builds and runs ctest on Linux.
#
#   cmake -B build -DCMAKE_BUILD_TYPE=Release        # add -DLAB_PORTABLE=ON to drop -march=native
#   cmake --build build
#   ctest --test-dir build --output-on-failure

cmake_minimum_required(VERSION 3.16)
project(cpu-cache-lab CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(LAB_PORTABLE "Do not use -march=native" OFF)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

if(NOT MSVC)
  add_compile_options(-Wall -Wextra)
  if(NOT LAB_PORTABLE)
    add_compile_options(-march=native)
  endif()
endif()

find_package(OpenMP)

# Helper: one benchmark/test executable sharing common/cpu_info.cpp.
function(lab_exe name source)
  add_executable(${name} ${source} common/cpu_info.cpp)
  target_include_directories(${name} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
  target_compile_definitions(${name} PRIVATE BENCH_BUILD_FLAGS="cmake ${CMAKE_BUILD_TYPE}")
  if(NOT MSVC)
    # Static C++ runtime: self-contained binaries (also avoids a MinGW dynamic-link quirk).
    target_link_options(${name} PRIVATE -static-libstdc++ -static-libgcc)
  endif()
endfunction()

function(lab_openmp name)
  if(OpenMP_CXX_FOUND)
    target_link_libraries(${name} PRIVATE OpenMP::OpenMP_CXX)
  endif()
endfunction()

enable_testing()

lab_exe(pointer_chase benchmarks/pointer_chase.cpp)
lab_exe(test_pointer_chase tests/test_pointer_chase.cpp)
add_test(NAME unit_tests COMMAND test_pointer_chase)

foreach(b cache_line associativity tlb branch instruction_latency)
  lab_exe(${b} benchmarks/${b}.cpp)
  add_test(NAME ${b}_self_test COMMAND ${b} --self-test)
endforeach()

lab_exe(false_sharing benchmarks/false_sharing.cpp)
lab_openmp(false_sharing)
add_test(NAME false_sharing_smoke
         COMMAND false_sharing --threads 2 --iters 20000 --reps 1
                 --out-dir ${CMAKE_BINARY_DIR}/smoke --quiet)

foreach(r naive ikj tiled vectorized blocked openmp sweep)
  lab_exe(matmul_${r} matmul/${r}.cpp)
endforeach()
lab_openmp(matmul_openmp)
lab_openmp(matmul_sweep)
target_link_libraries(matmul_sweep PRIVATE ${CMAKE_DL_LIBS})
add_test(NAME matmul_self_test COMMAND matmul_sweep --self-test)
