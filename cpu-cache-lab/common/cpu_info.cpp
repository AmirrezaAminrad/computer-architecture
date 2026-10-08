#include "common/cpu_info.h"

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <map>
#include <sstream>
#include <tuple>

#if defined(_WIN32)
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #ifndef NOMINMAX
  #define NOMINMAX
  #endif
  #include <windows.h>
  #if defined(__GNUC__)
    #include <cpuid.h>
  #endif
#else
  #include <unistd.h>
#endif

namespace lab {

#if defined(_WIN32)

static std::string cpu_brand() {
    char brand[49] = {0};
#if defined(__GNUC__)
    unsigned a, b, c, d;
    if (__get_cpuid(0x80000000, &a, &b, &c, &d) && a >= 0x80000004) {
        for (unsigned leaf = 0x80000002; leaf <= 0x80000004; ++leaf) {
            __get_cpuid(leaf, &a, &b, &c, &d);
            char* dst = brand + (leaf - 0x80000002) * 16;
            std::memcpy(dst + 0, &a, 4);
            std::memcpy(dst + 4, &b, 4);
            std::memcpy(dst + 8, &c, 4);
            std::memcpy(dst + 12, &d, 4);
        }
    }
#elif defined(_MSC_VER)
    int regs[4];
    __cpuid(regs, 0x80000000);
    if ((unsigned)regs[0] >= 0x80000004) {
        for (unsigned leaf = 0x80000002; leaf <= 0x80000004; ++leaf) {
            __cpuid(regs, (int)leaf);
            std::memcpy(brand + (leaf - 0x80000002) * 16, regs, 16);
        }
    }
#endif
    // cpuid pads with spaces; trim both ends.
    std::string s(brand);
    const auto first = s.find_first_not_of(' ');
    if (first == std::string::npos) return "";
    const auto last = s.find_last_not_of(' ');
    return s.substr(first, last - first + 1);
}

static std::vector<CacheInfo> detect_caches() {
    std::vector<CacheInfo> out;
    // One entry per (processor, cache); we deduplicate because every logical
    // CPU reports its own copy of each level. On hybrid CPUs distinct sizes
    // for the same level (P vs E cores) are kept — that is real information.
    //
    // Uses the classic GetLogicalProcessorInformation: its CACHE_DESCRIPTOR
    // carries the cache Size directly, unlike CACHE_RELATIONSHIP in the _Ex
    // API (which has no size field in MinGW-w64 headers).
    DWORD len = 0;
    if (!GetLogicalProcessorInformation(nullptr, &len) &&
        GetLastError() != ERROR_INSUFFICIENT_BUFFER) {
        return out;
    }
    const size_t count = len / sizeof(SYSTEM_LOGICAL_PROCESSOR_INFORMATION);
    std::vector<SYSTEM_LOGICAL_PROCESSOR_INFORMATION> buf(count);
    if (!GetLogicalProcessorInformation(buf.data(), &len)) {
        return out;
    }
    std::map<std::tuple<int, int, int, int, int>, bool> seen;
    for (const SYSTEM_LOGICAL_PROCESSOR_INFORMATION& entry : buf) {
        if (entry.Relationship != RelationCache) continue;
        const CACHE_DESCRIPTOR& c = entry.Cache;
        const char* type = c.Type == CacheData       ? "data"
                           : c.Type == CacheInstruction ? "instruction"
                           : c.Type == CacheUnified     ? "unified"
                                                        : "trace";
        auto key = std::make_tuple((int)c.Level, (int)c.Type, (int)c.Size,
                                   (int)c.LineSize, (int)c.Associativity);
        if (!seen[key]) {
            seen[key] = true;
            out.push_back({(int)c.Level, type, (int)c.Size, (int)c.LineSize,
                           (int)c.Associativity});
        }
    }
    std::sort(out.begin(), out.end(), [](const CacheInfo& x, const CacheInfo& y) {
        return std::tie(x.level, x.type, x.size_bytes) <
               std::tie(y.level, y.type, y.size_bytes);
    });
    return out;
}

static void query_ram(MachineInfo& m) {
    MEMORYSTATUSEX ms{};
    ms.dwLength = sizeof(ms);
    if (GlobalMemoryStatusEx(&ms)) {
        m.physical_ram = ms.ullTotalPhys;
        m.available_ram = ms.ullAvailPhys;
    }
}

#else  // POSIX

static std::string cpu_brand() {
    std::ifstream in("/proc/cpuinfo");
    std::string line;
    while (std::getline(in, line)) {
        const std::string key = "model name";
        if (line.compare(0, key.size(), key) == 0) {
            const auto colon = line.find(':');
            if (colon != std::string::npos) {
                std::string v = line.substr(colon + 1);
                if (!v.empty() && v.front() == ' ') v.erase(0, 1);
                return v;
            }
        }
    }
    return "";
}

static int parse_cache_size(const std::string& text) {
    // sysfs writes e.g. "32K", "512K", "12288K", "16M".
    char suffix = 'B';
    unsigned long long value = 0;
    std::istringstream ss(text);
    ss >> value >> suffix;
    switch (suffix) {
        case 'K': return (int)(value * 1024);
        case 'M': return (int)(value * 1024 * 1024);
        default:  return (int)value;
    }
}

static std::string read_file(const std::string& path) {
    std::ifstream in(path);
    std::string v;
    std::getline(in, v);
    while (!v.empty() && (v.back() == '\n' || v.back() == ' ')) v.pop_back();
    return v;
}

static std::vector<CacheInfo> detect_caches() {
    std::vector<CacheInfo> out;
    const std::string base = "/sys/devices/system/cpu/cpu0/cache";
    for (int idx = 0;; ++idx) {
        const std::string dir = base + "/index" + std::to_string(idx);
        std::ifstream probe(dir + "/level");
        if (!probe) break;
        CacheInfo c{};
        c.level = std::atoi(read_file(dir + "/level").c_str());
        const std::string type = read_file(dir + "/type");
        c.type = type == "Data" ? "data" : type == "Instruction" ? "instruction" : "unified";
        c.size_bytes = parse_cache_size(read_file(dir + "/size"));
        c.line_size = std::atoi(read_file(dir + "/coherency_line_size").c_str());
        c.ways = std::atoi(read_file(dir + "/ways_of_associativity").c_str());
        if (c.ways < 0) c.ways = 0;
        out.push_back(c);
    }
    return out;
}

static void query_ram(MachineInfo& m) {
    const long pages = sysconf(_SC_PHYS_PAGES);
    const long page_size = sysconf(_SC_PAGE_SIZE);
    if (pages > 0 && page_size > 0) m.physical_ram = (uint64_t)pages * (uint64_t)page_size;
    const long avail = sysconf(_SC_AVPHYS_PAGES);
    if (avail > 0 && page_size > 0) m.available_ram = (uint64_t)avail * (uint64_t)page_size;
}

#endif  // platform

MachineInfo query_machine() {
    MachineInfo m;
    m.cpu_brand = cpu_brand();
    m.caches = detect_caches();
    query_ram(m);
#if defined(_WIN32)
    SYSTEM_INFO si;
    GetSystemInfo(&si);
    m.logical_cpus = (int)si.dwNumberOfProcessors;
    m.cache_info_source = "GetLogicalProcessorInformationEx";
#else
    m.logical_cpus = (int)sysconf(_SC_NPROCESSORS_ONLN);
    m.cache_info_source = m.caches.empty() ? "none" : "/sys/devices/system/cpu/.../cache";
#endif
    return m;
}

// ---------------------------------------------------------------------------
// JSON output (hand-rolled: the schema is fixed, tiny, and dependency-free).
// ---------------------------------------------------------------------------

static std::string json_escape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 8);
    for (char ch : s) {
        switch (ch) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if ((unsigned char)ch < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof buf, "\\u%04x", (unsigned char)ch);
                    out += buf;
                } else {
                    out += ch;
                }
        }
    }
    return out;
}

static std::string iso_timestamp() {
    std::time_t t = std::time(nullptr);
    std::tm tmv{};
#if defined(_WIN32)
    localtime_s(&tmv, &t);
#else
    localtime_r(&t, &tmv);
#endif
    char buf[32];
    std::strftime(buf, sizeof buf, "%Y-%m-%dT%H:%M:%S", &tmv);
    return buf;
}

bool write_machine_json(const std::string& path, const MachineInfo& info,
                        const std::string& compiler, const std::string& build_flags,
                        const std::string& command_line, uint64_t seed,
                        double tsc_hz, std::string& error) {
    std::error_code ec;
    const auto parent = std::filesystem::path(path).parent_path();
    if (!parent.empty()) std::filesystem::create_directories(parent, ec);

    std::ostringstream os;
    os << "{\n";
    os << "  \"timestamp\": \"" << json_escape(iso_timestamp()) << "\",\n";
    os << "  \"cpu_brand\": \"" << json_escape(info.cpu_brand) << "\",\n";
    os << "  \"logical_cpus\": " << info.logical_cpus << ",\n";
    os << "  \"physical_ram_bytes\": " << info.physical_ram << ",\n";
    os << "  \"available_ram_bytes\": " << info.available_ram << ",\n";
    os << "  \"cache_info_source\": \"" << json_escape(info.cache_info_source) << "\",\n";
    os << "  \"detected_caches\": [\n";
    for (size_t i = 0; i < info.caches.size(); ++i) {
        const CacheInfo& c = info.caches[i];
        os << "    {\"level\": " << c.level
           << ", \"type\": \"" << c.type
           << "\", \"size_bytes\": " << c.size_bytes
           << ", \"line_size\": " << c.line_size
           << ", \"ways\": " << c.ways << "}"
           << (i + 1 < info.caches.size() ? "," : "") << "\n";
    }
    os << "  ],\n";
    os << "  \"tsc_cycles_per_second\": " << (tsc_hz > 0 ? std::to_string((long long)tsc_hz) : "null") << ",\n";
    os << "  \"compiler\": \"" << json_escape(compiler) << "\",\n";
    os << "  \"build_flags\": \"" << json_escape(build_flags) << "\",\n";
    os << "  \"command_line\": \"" << json_escape(command_line) << "\",\n";
    os << "  \"seed\": " << seed << "\n";
    os << "}\n";

    std::ofstream out(path, std::ios::binary | std::ios::trunc);
    if (!out) {
        error = "cannot open " + path + " for writing";
        return false;
    }
    out << os.str();
    out.flush();
    if (!out.good()) {
        error = "failed while writing " + path;
        return false;
    }
    return true;
}

}  // namespace lab
