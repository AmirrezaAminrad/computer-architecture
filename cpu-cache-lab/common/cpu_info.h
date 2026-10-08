#pragma once
// Machine introspection: CPU brand, cache topology, memory.
//
// Everything reported here is *detected* through OS/CPUDID interfaces — the
// lab never hard-codes a cache size or frequency. On Windows this uses
// GetLogicalProcessorInformationEx; on Linux, sysfs; the source is recorded
// in the output JSON so readers know where the numbers came from.

#include <cstdint>
#include <string>
#include <vector>

namespace lab {

struct CacheInfo {
    int level;           // 1, 2, 3, ...
    std::string type;    // "data", "instruction", "unified", "trace"
    int size_bytes;
    int line_size;
    int ways;            // 0 = unknown / fully associative
};

struct MachineInfo {
    std::string cpu_brand;
    int logical_cpus = 0;
    uint64_t physical_ram = 0;    // 0 = unknown
    uint64_t available_ram = 0;   // 0 = unknown
    std::vector<CacheInfo> caches;
    std::string cache_info_source;  // e.g. "GetLogicalProcessorInformationEx", "sysfs"
};

MachineInfo query_machine();

// Writes a self-describing JSON file for reproducibility (no JSON library —
// the schema is fixed and tiny). `tsc_hz` may be 0 if calibration failed.
// Returns false with `error` filled if the file cannot be written.
bool write_machine_json(const std::string& path, const MachineInfo& info,
                        const std::string& compiler, const std::string& build_flags,
                        const std::string& command_line, uint64_t seed,
                        double tsc_hz, std::string& error);

}  // namespace lab
