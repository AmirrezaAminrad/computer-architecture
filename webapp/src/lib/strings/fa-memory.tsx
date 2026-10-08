import type { ReactNode } from "react";

/**
 * Farsi strings for the Memory module (Memory.tsx + memory/*).
 * Keys are the exact English strings as written in the components;
 * dynamic sentences use {param} placeholders filled by tf().
 */
export const FA_MEMORY: Record<string, ReactNode> = {
  /* ── Module page · Memory.tsx ───────────────────────────── */
  "A modern core can finish an instruction in a fraction of a nanosecond, but DRAM takes ~80 ns to answer. Caches bridge that gap by betting that programs reuse data — a bet that usually pays off.":
    "هستهٔ مدرن می‌تواند یک دستور را در کسری از نانوثانیه تمام کند، اما DRAM حدود ۸۰ نانوثانیه طول می‌کشد تا جواب بدهد. کش‌ها این شکاف را با این فرض که برنامه‌ها داده را دوباره به کار می‌برند پر می‌کنند — فرضی که معمولاً درست از آب درمی‌آید.",
  "The memory hierarchy": "سلسله‌مراتب حافظه",
  "There is no single memory that is simultaneously fast, large and cheap. So we stack several: small and fast near the CPU, big and slow far away, each level acting as a cache for the one below it.":
    "حافظه‌ای واحد وجود ندارد که همزمان سریع، بزرگ و ارزان باشد. پس چند لایه روی هم می‌چینیم: کوچک و سریع نزدیک CPU، بزرگ و کند در دوردست؛ و هر سطح به‌مثابهٔ کشی برای سطح زیرین خود عمل می‌کند.",
  "Numbers are typical — or measured": "عددها نمونه‌اند — یا اندازه‌گیری‌شده",
  "The textbook view shows order-of-magnitude values for a ~3 GHz desktop core; the ratios — about 4× per cache level, ~100× to DRAM — are what matter. Flip the pyramid to":
    "دید کتاب درسی مرتبهٔ بزرگیِ مقادیر را برای یک هستهٔ دسکتاپ ~۳ گیگاهرتزی نشان می‌دهد؛ آنچه اهمیت دارد نسبت‌هاست — حدود ۴× به‌ازای هر سطح کش و ~۱۰۰× تا DRAM. هرم را به",
  "Measured": "اندازه‌گیری‌شده",
  "to see the same hierarchy on a real 13th-gen Intel laptop, measured in this repo's":
    "تغییر دهید تا همین سلسله‌مراتب را روی یک لپ‌تاپ واقعی اینتل نسل ۱۳ ببینید؛ اندازه‌گیری در",
  "(see": "همین مخزن (ببینید",
  "Cache simulator": "شبیه‌ساز کش",
  "Memory is divided into blocks. A cache keeps a few blocks. Each address splits into tag | index | offset: the index picks the set, the tag says which block is stored there, and the offset picks the byte inside it. Feed in a sequence of accesses and watch hits and misses light up.":
    "حافظه به بلوک‌هایی بخش‌بندی می‌شود. کش تعدادی بلوک را نگه می‌دارد. هر آدرس به برچسب | اندیس | آفست شکسته می‌شود: اندیس مجموعه را برمی‌گزیند، برچسب می‌گوید کدام بلوک آن‌جاست و آفست بایت درون آن را انتخاب می‌کند. دنباله‌ای از دسترسی‌ها بدهید و روشن‌شدن برخوردها و خطاها را تماشا کنید.",
  "Why access patterns matter": "چرا الگوی دسترسی مهم است",
  "Caches only work because real programs show locality: recently used data is likely to be used again (temporal), and nearby data is likely to be used next (spatial). Break locality and the same program can run many times slower.":
    "کش‌ها فقط از این رو کار می‌کنند که برنامه‌های واقعی موضعیت نشان می‌دهند: دادهٔ به‌تازگی استفاده‌شده به‌احتمال زیاد دوباره استفاده می‌شود (زمانی) و داده‌های مجاور به‌احتمال زیاد بعدی‌اند (مکانی). موضعیت را بشکنید تا همان برنامه چندین برابر کندتر اجرا شود.",
  "From toy to real: the matmul ladder": "از اسباب‌بازی تا واقعیت: نردبان matmul",
  "Everything above is a toy you can watch. The repo's cpu-cache-lab took the same story to a real machine and a real workload — matrix multiplication — and measured what each cache idea is worth.":
    "همهٔ چیزهای بالا اسباب‌بازی‌هایی هستند که می‌توانید تماشاشان کنید. مخزنِ cpu-cache-lab همین داستان را به یک ماشین واقعی و بار کاری واقعی — ضرب ماتریسی — برد و اندازه گرفت که هر ایدهٔ کشی چقدر می‌ارزد.",
  "When cores share a cache line": "وقتی هسته‌ها یک خط کش را شریک‌اند",
  "One cache per core is fast — until two cores touch the same line. Hardware keeps every core's view consistent with a coherence protocol, and the bill for ignoring line boundaries is called false sharing.":
    "یک کش به‌ازای هر هسته سریع است — تا وقتی دو هسته به یک خط دست نزنند. سخت‌افزار با یک پروتکل انسجام دید همهٔ هسته‌ها را سازگار نگه می‌دارد و هزینهٔ نادیده‌گرفتن مرز خط‌ها، اشتراک کاذب نام دارد.",
  "Virtual memory & the TLB": "حافظهٔ مجازی و TLB",
  "Caches translate addresses between levels; the address itself is translated too. Virtual memory maps each program's addresses onto physical memory through a page table — and a TLB caches that mapping, because it runs on every single access.":
    "کش‌ها آدرس‌ها را میان سطح‌ها ترجمه می‌کنند؛ خود آدرس هم ترجمه می‌شود. حافظهٔ مجازی آدرس‌های هر برنامه را از طریق جدول صفحه روی حافظهٔ فیزیکی نگاشت می‌کند — و جدول TLB همان نگاشت را کش می‌کند، چون روی تک‌تک دسترسی‌ها اجرا می‌شود.",

  /* ── Pyramid ────────────────────────────────────────────── */
  "The hierarchy (click a level)": "سلسله‌مراتب (روی یک سطح کلیک کنید)",
  "Textbook": "کتاب درسی",
  "Order-of-magnitude values for a ~3 GHz desktop core": "مقادیر مرتبهٔ بزرگی برای یک هستهٔ دسکتاپ ~۳ گیگاهرتزی",
  "Detected caches + pointer-chase latencies on the lab machine ({date})": "کش‌های شناسایی‌شده + تأخیرهای pointer-chase روی ماشین آزمایشگاه ({date})",
  "Memory hierarchy pyramid": "هرم سلسله‌مراتب حافظه",
  "faster": "سریع‌تر",
  "smaller": "کوچک‌تر",
  "costlier/B": "گران‌تر/بایت",
  "slower": "کندتر",
  "bigger": "بزرگ‌تر",
  "cheaper/B": "ارزان‌تر/بایت",

  /* level names */
  "Registers": "رجیسترها",
  "L1 cache": "کش L1",
  "L2 cache": "کش L2",
  "L3 cache": "کش L3",
  "Main memory (DRAM)": "حافظهٔ اصلی (DRAM)",
  "Storage (SSD / HDD)": "ذخیره‌ساز (SSD / HDD)",
  "LEVEL {n}": "سطح {n}",

  /* level notes (textbook) */
  "Operands the ALU can use this very cycle.": "عملوندهایی که ALU همین سیکل می‌تواند به کار ببرد.",
  "Small enough to be accessed in a few cycles.": "به‌اندازهٔ کافی کوچک که دسترسی به آن در چند سیکل ممکن باشد.",
  "Catches most L1 misses.": "بیشتر خطاهای L1 را می‌گیرد.",
  "Last line of defence before DRAM; also the sharing point between cores.":
    "آخرین خط دفاع پیش از DRAM؛ همچنین نقطهٔ اشتراک میان هسته‌ها.",
  "Off-chip: wires, row activation and refresh make it ~100× slower than L1.":
    "خارج از تراشه: سیم‌ها، فعال‌سازی سطر و نوسازی آن را حدود ۱۰۰ برابر کندتر از L1 می‌کند.",
  "The only level that survives power-off — and is millions of times slower than a register.":
    "تنها سطحی که با قطع برق می‌ماند — و میلیون‌ها برابر کندتر از یک رجیستر است.",

  /* level notes (measured) */
  "Pointer-chase plateau below 48 KiB on the lab machine.": "فلات pointer-chase زیر 48 KiB روی ماشین آزمایشگاه.",
  "The staircase steps ×3 exactly where this cache ends.": "پله‌های پلکانی دقیقاً جایی که این کش تمام می‌شود ۳ برابر می‌شوند.",
  "First step past L2; the climb up to 32 MiB is L3 sharing and replacement effects.":
    "نخستین پله پس از L2؛ بالا رفتن تا 32 MiB ناشی از اشتراک L3 و اثرهای جایگزینی است.",
  "Working sets beyond L3 land here: the ~100× cliff between L1 and DRAM, measured.":
    "مجموعه‌های کاری بزرگ‌تر از L3 به این‌جا می‌رسند: پرتگاه ~۱۰۰ برابری میان L1 و DRAM، اندازه‌گیری‌شده.",

  /* level sizes (textbook) */
  "≈ 1 KB (e.g. 16–32 × 64-bit architectural)": "≈ 1 KB (مثلاً ۱۶–۳۲ رجیستر ۶۴ بیتیِ معماری)",
  "32–64 KB per core (split I$ / D$)": "32–64 KB به‌ازای هر هسته (تفکیک I$ / D$)",
  "256 KB – 2 MB per core": "256 KB تا 2 MB به‌ازای هر هسته",
  "8–64 MB, shared by all cores": "8–64 MB، مشترک میان همهٔ هسته‌ها",
  "0.5 – 8 TB (SSD) · up to 20+ TB (HDD)": "0.5 تا 8 TB (SSD) · تا بیش از 20 TB (HDD)",

  /* level sizes (measured templates) */
  "{cap} per core, {type} ({ways}-way, {line} B lines)": "{cap} به‌ازای هر هسته، {type} ({ways}-راهه، خط‌های {line} بایتی)",
  "{cap} per core, unified ({ways}-way)": "{cap} به‌ازای هر هسته، یکپارچه ({ways}-راهه)",
  "{cap} shared, unified ({ways}-way)": "{cap} اشتراکی، یکپارچه ({ways}-راهه)",

  /* level latencies */
  "≈ 1 ns (3–5 cycles)": "≈ 1 ns (3–5 سیکل)",
  "≈ 4 ns (12–15 cycles)": "≈ 4 ns (12–15 سیکل)",
  "≈ 12 ns (≈ 40 cycles)": "≈ 12 ns (≈ ۴۰ سیکل)",
  "≈ 80 ns (≈ 240 cycles)": "≈ 80 ns (≈ ۲۴۰ سیکل)",
  "≈ {ns} ns ({cyc} cycles) — measured": "≈ {ns} ns ({cyc} سیکل) — اندازه‌گیری‌شده",
  "≈ {ns} ns plateau ({cyc} cycles) — measured": "≈ {ns} ns فلات ({cyc} سیکل) — اندازه‌گیری‌شده",

  /* level costs */
  "Most expensive per bit: multi-ported, on the critical path": "گران‌ترین به‌ازای هر بیت: چنددرگاهه، روی مسیر بحرانی",
  "On-die SRAM: ≳ $1,000 per GB-equivalent of die area": "‏SRAM روی خود تراشه: ≳ ۱۰۰۰ دلار به‌ازای هر GB معادلِ مساحت تراشه",
  "On-die SRAM, denser but slower than L1": "‏SRAM روی خود تراشه، متراکم‌تر اما کندتر از L1",
  "Large chunk of die area": "بخش بزرگی از مساحت تراشه",
  "≈ $3–6 per GB": "≈ 3–6 دلار به‌ازای هر GB",
  "SSD ≈ $0.05–0.10 / GB · HDD ≈ $0.02 / GB": "SSD ≈ 0.05–0.10 دلار / GB · HDD ≈ 0.02 دلار / GB",

  /* level technology */
  "Flip-flops / multi-ported SRAM": "فلیپ‌فلاپ / ‏SRAM چنددرگاهه",
  "SRAM (6T), tiny & heavily optimised": "‏SRAM (6T)، بسیار کوچک و به‌شدت بهینه‌شده",
  "SRAM, banked, often on a ring/mesh": "‏SRAM، بانک‌بندی‌شده، اغلب روی حلقه/مش",
  "DRAM: 1 transistor + 1 capacitor per bit, needs refresh": "‏DRAM: یک ترانزیستور + یک خازن به‌ازای هر بیت، به نوسازی نیاز دارد",
  "NAND flash (SSD) · magnetic platters (HDD) — non-volatile": "فلش NAND (SSD) · صفحات مغناطیسی (HDD) — غیرفرّار",

  /* level managed-by */
  "Compiler (register allocation)": "کامپایلر (تخصیص رجیستر)",
  "Hardware": "سخت‌افزار",
  "OS (virtual memory) + memory controller": "سیستم‌عامل (حافظهٔ مجازی) + کنترل‌گر حافظه",
  "OS (file system, paging)": "سیستم‌عامل (فایل‌سیستم، صفحه‌بندی)",

  /* the human-scale box */
  "If one cycle (~0.33 ns) were one second…": "اگر یک سیکل (~0.33 نانوثانیه) یک ثانیه بود…",
  "≈ 3.5 days (SSD) · ≈ 1 year (HDD)": "≈ ۳٫۵ روز (SSD) · ≈ ۱ سال (HDD)",
  "…a trip to this level would take this long.": "…سفر تا این سطح این‌قدر طول می‌کشید.",
  "{n} second{s}": "{n} ثانیه",
  "{n} minutes": "{n} دقیقه",
  "{n} hours": "{n} ساعت",
  "{n} days": "{n} روز",
  "{n} years": "{n} سال",

  /* measured-mode footnote */
  "Measured on a": "اندازه‌گیری‌شده روی",
  "({date}): caches detected via the OS, latencies from the pointer-chase benchmark in the folder":
    "({date}): کش‌ها از طریق سیستم‌عامل شناسایی شده‌اند و تأخیرها از بنچمارک pointer-chase در پوشهٔ",
  "of this repo.": "همین مخزن می‌آید.",

  /* log-scale table */
  "Same data, log scale": "همان داده‌ها، مقیاس لگاریتمی",
  "Level": "سطح",
  "Capacity (log)": "ظرفیت (لگاریتمی)",
  "Latency in cycles (log)": "تأخیر بر حسب سیکل (لگاریتمی)",
  "Capacity": "ظرفیت",
  "Latency": "تأخیر",
  "Cost": "هزینه",
  "Technology": "فناوری",
  "Managed by": "مدیریت‌شده توسط",

  /* ── CacheSim ───────────────────────────────────────────── */
  "Configure the cache": "پیکربندی کش",
  "Lines": "خط‌ها",
  "Block size (bytes)": "اندازهٔ بلوک (بایت)",
  "Associativity": "انجمنی‌بودن",
  "direct-mapped": "نگاشت مستقیم",
  "2-way": "2-راهه",
  "4-way": "4-راهه",
  "capacity": "گنجایش",
  "sets": "مجموعه‌ها",
  "address =": "آدرس =",
  "bits ({n}-bit addresses)": "بیت (آدرس‌های {n} بیتی)",
  "Access pattern": "الگوی دسترسی",

  /* presets */
  "Sequential scan": "پویش ترتیبی",
  "Walk bytes 0…31 in order. Each miss brings in a whole block, so the following bytes hit — spatial locality.":
    "بایت‌های 0…31 را به‌ترتیب بپیمایید. هر خطا یک بلوک کامل می‌آورد، پس بایت‌های بعدی برخورد می‌زنند — موضعیت مکانی.",
  "Tight loop": "حلقهٔ فشرده",
  "Revisit the same three blocks over and over — temporal locality. After the cold misses, everything hits.":
    "باز و باز سراغ همان سه بلوک بروید — موضعیت زمانی. پس از خطاهای سرد، همه‌چیز برخورد می‌زند.",
  "Stride = block size": "گام = اندازهٔ بلوک",
  "Touch one byte per block: no spatial reuse at all, so every first touch misses.":
    "در هر بلوک فقط یک بایت را لمس کنید: هیچ استفادهٔ مجدد مکانی در کار نیست، پس هر لمسِ نخست خطا می‌زند.",
  "Ping-pong (conflict)": "پینگ‌پنگ (تداخل)",
  "Two addresses exactly one cache-size apart share an index. Direct-mapped: they evict each other forever. Try 2-way!":
    "دو آدرس که دقیقاً به‌اندازهٔ یک کش از هم فاصله دارند، اندیس مشترکی دارند. نگاشت مستقیم: تا ابد یکدیگر را جایگزین می‌کنند. حالت 2-راهه را امتحان کنید!",
  "Array 2× cache, twice": "آرایهٔ 2× کش، دو بار",
  "Sweep an array twice as large as the cache, then sweep again. The second pass finds nothing left (capacity misses).":
    "آرایه‌ای دو برابر کش را پیمایش کنید، سپس دوباره. گذر دوم چیزی نمی‌یابد (خطاهای گنجایش).",
  "Random": "تصادفی",
  "No pattern, no locality: the hit rate is roughly cache size ÷ footprint.":
    "بدون الگو، بدون موضعیت: نرخ برخورد تقریباً اندازهٔ کش تقسیم بر گسترهٔ داده است.",
  "Matmul ijk (naive)": "Matmul ijk (ابتدایی)",
  "Tiny 4×4 C += A·B, arrays at 0x00/0x40/0x80. Inner loop strides down B's rows — a fresh cache line per multiply, exactly the lab's naive rung.":
    "ضرب کوچک 4×4 با C += A·B، آرایه‌ها در 0x00/0x40/0x80. حلقهٔ درونی با گام روی B حرکت می‌کند — به‌ازای هر ضرب یک خط کش تازه؛ دقیقاً پلهٔ ابتدایی آزمایشگاه.",
  "Matmul ikj (reordered)": "Matmul ikj (ترتیب عوض‌شده)",
  "Same arithmetic, loops swapped: the inner loop walks B and C rows contiguously. Try running ijk vs ikj on the same cache — this gap is the measured 15× at full scale.":
    "همان محاسبات با حلقه‌های جابه‌جا: حلقهٔ درونی سطرهای B و C را پیوسته می‌پیماید. ijk و ikj را روی یک کش اجرا و مقایسه کنید — همین شکاف در مقیاس کامل همان ۱۵ برابرِ اندازه‌گیری‌شده است.",

  "Memory address sequence": "دنبالهٔ آدرس‌های حافظه",
  "Byte addresses 0–255, decimal or": "آدرس‌های بایتی 0–255، دهدهی یا",
  "hex, separated by commas/spaces.": "هگز، جداشده با ویرگول/فاصله.",
  "{n} accesses.": "{n} دسترسی.",
  "Ignored: {list}": "نادیده گرفته شد: {list}",

  "Run to end »": "اجرا تا انتها »",

  "Cache contents": "محتوای کش",
  "HIT": "برخورد",
  "MISS · {k}": "خطا · {k}",
  "empty": "خالی",
  "Last access": "آخرین دسترسی",
  "Next access": "دسترسی بعدی",

  /* miss kinds */
  "compulsory": "اجباری",
  "conflict": "تداخل",
  "first touch of this block — unavoidable (cold miss)": "نخستین لمس این بلوک — ناگزیر (خطای سرد)",
  "even a fully-associative cache this size would have evicted it": "حتی یک کش کاملاً انجمنی با همین اندازه هم آن را جایگزین می‌کرد",
  "a fully-associative cache would have hit — mapping restrictions caused this":
    "کش کاملاً انجمنی برخورد می‌زد — محدودیت‌های جای‌گذاری باعث این خطا شد",

  /* cache-table explanations */
  "Address {addr} → set {set}: valid bit set and tag {tag} matches → HIT, no memory traffic.":
    "آدرس {addr} → مجموعه {set}: بیت معتبر ۱ است و برچسب {tag} مطابقت دارد → برخورد، بدون ترافیک حافظه.",
  "Address {addr} → set {set}: tag mismatch — block [{ev}] is evicted{lru}; block [{blk}] is fetched from memory. ({kind})":
    "آدرس {addr} → مجموعه {set}: ناهمخوانی برچسب — بلوک [{ev}] جایگزین می‌شود{lru}؛ بلوک [{blk}] از حافظه آورده می‌شود. ({kind})",
  "Address {addr} → set {set}: line is empty (valid = 0); block [{blk}] is fetched from memory. ({kind})":
    "آدرس {addr} → مجموعه {set}: خط خالی است (معتبر = ۰)؛ بلوک [{blk}] از حافظه آورده می‌شود. ({kind})",
  "Step to feed the first address through the cache. Dashed rows show the set the next address will probe.":
    "گام بزنید تا نخستین آدرس از کش عبور کند. سطرهای خط‌چین مجموعه‌ای را نشان می‌دهند که آدرس بعدی به آن نگاه می‌کند.",

  "Hit rate": "نرخ برخورد",
  "hits": "برخورد",
  "misses": "خطا",
  "Average memory access time": "میانگین زمان دسترسی به حافظه",
  "Hit time": "زمان برخورد",
  "Miss penalty": "جریمهٔ خطا",
  "hit time + miss rate × penalty": "زمان برخورد + نرخ خطا × جریمه",
  "Without cache": "بدون کش",
  "every access pays the penalty": "هر دسترسی جریمه را می‌پردازد",

  "Access trace": "ردیابی دسترسی‌ها",
  "hit": "برخورد",
  "pending": "در انتظار",
  "{k} miss": "خطای {k}",
  "found in cache": "در کش پیدا شد",
  "dashed = next access": "خط‌چین = دسترسی بعدی",

  /* ── Locality ───────────────────────────────────────────── */
  "Locality lab": "آزمایشگاه موضعیت",
  "Spatial: array order": "مکانی: ترتیب آرایه",
  "Temporal: working set": "زمانی: مجموعهٔ کاری",
  "{pct}% hit": "{pct}% برخورد",
  "The same 8×8 array of 4-byte integers, stored row by row in memory, is summed twice — once along rows, once down columns. Identical work, identical cache (8 lines, direct-mapped). Press play.":
    "همان آرایهٔ 8×8 از صحیح‌های ۴ بایتی که سطربه‌سطر در حافظه چیده شده، دو بار جمع زده می‌شود — یک‌بار در امتداد سطرها و یک‌بار در امتداد ستون‌ها. کار یکسان، کش یکسان (۸ خط، نگاشت مستقیم). پخش کنید.",
  "Cache block": "بلوک کش",
  "Row-major walk": "پیمایش سطرمحور",
  "Column-major walk": "پیمایش ستون‌محور",
  "Row-walk cycles": "سیکل‌های پیمایش سطری",
  "hit 1 · miss {m}": "برخورد ۱ · خطا {m}",
  "Column-walk cycles": "سیکل‌های پیمایش ستونی",
  "same data, same cache": "همان داده، همان کش",
  "Final hit rate (row)": "نرخ برخورد نهایی (سطر)",
  "Final hit rate (col)": "نرخ برخورد نهایی (ستون)",
  "What to notice": "به این نکته‌ها دقت کنید",
  "With 16-byte blocks, one miss pulls in 4 consecutive ints, so the row walk hits 3 times out of 4 (75%). The column walk jumps 32 bytes per step: each access lands in a different block, and rows 0 and 4 (and 1 and 5…) collide on the same cache line before the next column can reuse anything — 0% hits.":
    "با بلوک‌های ۱۶ بایتی، هر خطا ۴ صحیح متوالی را می‌آورد، پس پیمایش سطری از هر ۴ بار ۳ بار برخورد می‌زند (۷۵%). پیمایش ستونی در هر گام ۳۲ بایت می‌پرد: هر دسترسی در بلوکی متفاوت فرود می‌آید و سطرهای ۰ و ۴ (و ۱ و ۵ و…) پیش از آنکه ستون بعدی بتواند چیزی را دوباره به کار ببرد، روی یک خط کش برخورد می‌کنند — ۰% برخورد.",
  "With 4-byte blocks, a block is exactly one int: there is no spatial locality to exploit, so neither order ever hits. Block size is how hardware cashes in on spatial locality.":
    "با بلوک‌های ۴ بایتی، هر بلوک دقیقاً یک صحیح است: موضعیت مکانی برای بهره‌برداری وجود ندارد، پس هیچ‌کدام از دو ترتیب هرگز برخورد نمی‌زنند. اندازهٔ بلوک همان راهی است که سخت‌افزار از موضعیت مکانی سود می‌برد.",
  "A 32-byte block is exactly one row, and 8 lines × 32 B = 256 B holds the entire matrix — so the column walk works too after the first column (cold misses only). Same code, same cache size: block size and capacity change the verdict.":
    "بلوک ۳۲ بایتی دقیقاً یک سطر است و ۸ خط × 32 B = 256 B کل ماتریس را جا می‌دهد — پس پیمایش ستونی هم بعد از ستون اول کار می‌کند (فقط خطاهای سرد). همان کد، همان اندازهٔ کش: اندازهٔ بلوک و گنجایش نتیجه را عوض می‌کنند.",

  "A loop touches": "یک حلقه به",
  "different cache blocks, {n} times in a row (one word per block, so there is no spatial reuse — only temporal). The cache holds 8 blocks (128 B). Drag W and watch the hit rate fall off a cliff when the working set stops fitting.":
    "بلوک متفاوتِ کش دست می‌زند — {n} بار پشت‌سرهم (در هر بلوک یک واژه، پس استفادهٔ مجدد مکانی در کار نیست — فقط زمانی). کش ۸ بلوک (128 B) جا دارد. W را بکشید و ببینید وقتی مجموعهٔ کاری دیگر جا نمی‌شود نرخ برخورد از پرتگاه سقوط می‌کند.",
  "Hit rate versus working set size": "نرخ برخورد برحسب اندازهٔ مجموعهٔ کاری",
  "working set W (blocks of 16 B)": "مجموعهٔ کاری W (بلوک‌های ۱۶ بایتی)",
  "cache capacity (8 blocks)": "گنجایش کش (۸ بلوک)",
  "fully-assoc. LRU": "کاملاً انجمنی LRU",
  "Working set W": "مجموعهٔ کاری W",
  "{v} blocks · {b} B": "{v} بلوک · {b} B",
  "Direct-mapped": "نگاشت مستقیم",
  "Fully-assoc. LRU": "کاملاً انجمنی LRU",
  "Why LRU falls off a hard cliff": "چرا LRU یک‌باره از پرتگاه سقوط می‌کند",
  "Looping over just": "دور زدن فقط",
  "one more block": "یک بلوک بیشتر",
  "than the cache holds is LRU's worst case: each block is evicted right before it's needed again, so the hit rate drops from {pct}% straight to 0%.":
    "از گنجایش کش، بدترین حالت LRU است: هر بلوک درست پیش از آنکه دوباره لازم شود جایگزین می‌شود، پس نرخ برخورد از {pct}% مستقیم به ۰% می‌رسد.",
  "Direct-mapped degrades more gently here (try W = 9–15), because only blocks that collide on an index thrash while the rest stay put — a reminder that associativity and replacement policy shape":
    "نگاشت مستقیم این‌جا ملایم‌تر افت می‌کند (‏W = 9–15 را امتحان کنید)، چون فقط بلوک‌هایی که روی یک اندیس برخورد می‌کنند مدام عوض می‌شوند و بقیه سر جایشان می‌مانند — یادآور اینکه انجمنی‌بودن و سیاست جایگزینی تعیین می‌کنند پرتگاه چه",
  "how": "شکلی",
  "the cliff looks, while capacity decides": "داشته باشد؛ گنجایش اما تعیین می‌کند پرتگاه",
  "where": "کجا",
  "it is.": "باشد.",

  /* ── MatmulLadder ───────────────────────────────────────── */
  "Measured on real hardware — matmul n = 1024": "اندازه‌گیری‌شده روی سخت‌افزار واقعی — matmul با n = 1024",
  "The two toys above are 8×8. The lab took the same ideas to a real 1024×1024 matrix multiply on a":
    "دو نمونهٔ بالا 8×8 بودند. آزمایشگاه همین ایده‌ها را به یک ضرب ماتریسی واقعی 1024×1024 روی",
  "and climbed an optimization ladder one rung at a time, measuring at every step. Click a rung:":
    "برد و نردبان بهینه‌سازی را پله‌به‌پله بالا رفت و در هر پله اندازه گرفت. روی یک پله کلیک کنید:",

  /* ladder run labels + notes (from lib/lab-data) */
  "Naive ijk": "ijk ابتدایی",
  "a miss per multiply — DRAM latency on the critical path": "به‌ازای هر ضرب یک خطا — تأخیر DRAM روی مسیر بحرانی",
  "Loop order → ikj": "ترتیب حلقه‌ها → ikj",
  "inner loop walks C and B rows contiguously: 15× faster, zero cleverness":
    "حلقهٔ درونی سطرهای C و B را پیوسته می‌پیماید: ۱۵ برابر سریع‌تر، بدون هیچ ترفندی",
  "+ Tiling": "+ تایل‌بندی",
  "best tile: works in cache-sized squares": "بهترین تایل: کار در مربع‌های هم‌اندازهٔ کش",
  "+ AVX2/FMA": "+ AVX2/FMA",
  "SIMD alone doesn't fix the memory bound": "‏SIMD به‌تنهایی محدودیت حافظه را حل نمی‌کند",
  "+ Reg-block & pack": "+ بلوک رجیستری و بسته‌بندی",
  "registers as the innermost cache level": "رجیسترها به‌مثابهٔ درونی‌ترین سطح کش",
  "+ OpenMP ×12": "+ OpenMP ×12",
  "12 threads on the same optimized core": "۱۲ رشته روی همان هستهٔ بهینه‌شده",
  "OpenMP ×12": "OpenMP ×12",

  "{g} GFLOP/s ⇒ one multiplication takes": "{g} GFLOP/s ⇒ زمان هر ضرب:",
  "First rung": "پلهٔ نخست",
  "naive ijk, 1 thread": "ijk ابتدایی، ۱ رشته",
  "Top rung": "بالاترین پله",
  "Total speedup": "افزایش سرعت کل",
  "same arithmetic, same machine — only the memory story changed": "همان محاسبات، همان ماشین — فقط روایت حافظه عوض شد",
  "The first rung is the biggest": "بزرگ‌ترین پله، پلهٔ اول است",
  "from reordering three nested loops": "فقط با جابه‌جایی سه حلقهٔ تودرتو",
  "No vectors, no threads, no tiling — the inner loop just walks rows contiguously so every cache line is used 4× before eviction. Everything the row/column demo showed, at full scale.":
    "بدون برداری‌سازی، بدون رشته، بدون تایل‌بندی — حلقهٔ درونی فقط سطرها را پیوسته می‌پیماید تا هر خط کش پیش از جایگزین‌شدن ۴ بار استفاده شود. همان چیزی که نمایش سطر/ستون نشان داد، این‌بار در مقیاس کامل.",
  "measured {date}": "اندازه‌گیری {date}",
  "Go deeper — this repo measured it": "بیشتر بدانید — همین مخزن اندازه گرفته است",
  "Full ladder, verification and build context:": "نردبان کامل، وارسی و زمینهٔ ساخت:",
  "and": "و",
  "Rerun with": "بازاجرا با",
  "in": "در",
  "regenerate these numbers with": "بازتولید این عددها با",

  /* ── Coherence ──────────────────────────────────────────── */
  "Coherence lab": "آزمایشگاه انسجام",
  "MSI / MESI state machine": "ماشین حالت MSI / MESI",
  "False sharing": "اشتراک کاذب",

  /* MSI/MESI state names */
  "Modified": "تغییریافته",
  "Exclusive": "انحصاری",
  "Shared": "اشتراکی",
  "Invalid": "نامعتبر",

  "Core {c}": "هستهٔ {c}",
  "— no copy —": "— نسخه‌ای ندارد —",
  "line X = v{v}": "خط X = v{v}",
  "dirty — only copy, must write back": "کثیف — تنها نسخه، باید بازنویسی شود",
  "clean, sole owner (MESI: can write silently)": "تمیز، مالک انحصاری (در MESI: می‌تواند بی‌سروصدا بنویسد)",
  "clean, read-only copy": "تمیز، نسخهٔ فقط‌خواندنی",
  "must fetch before touching the line": "پیش از دست زدن به خط باید آن را بیاورد",
  "MSI: writing from S costs a BusUpgr": "‏MSI: نوشتن از حالت S هزینهٔ BusUpgr دارد",

  "Two cores cache the same line": "دو هسته همان خط",
  ". Each write must make the other core's copy invalid — that's what a cache":
    " را کش می‌کنند. هر نوشتن باید نسخهٔ هستهٔ دیگر را نامعتبر کند — کارِ",
  "coherence protocol": "پروتکل انسجام",
  " (MSI / MESI) does, one bus transaction at a time. Read and write from each core, or run the scripted single-writer handoff under both protocols and compare the bus counters.":
    " کش (MSI / MESI) همین است؛ تراکنش‌به‌تراکنشِ گذرگاه. از هر هسته بخوانید و بنویسید، یا سناریوی تحویلِ نویسندهٔ واحد را زیر هر دو پروتکل اجرا کنید و شمارنده‌های گذرگاه را مقایسه کنید.",
  "Core {c} reads X": "هستهٔ {c} خط X را می‌خواند",
  "Core {c} writes X": "هستهٔ {c} در خط X می‌نویسد",
  "{c} reads": "{c} می‌خواند",
  "{c} writes": "{c} می‌نویسد",
  "‖ Stop": "‖ توقف",
  "▶ Run handoff script": "▶ اجرای سناریوی تحویل",
  "Core A": "هستهٔ A",
  "coherent bus": "گذرگاه انسجام‌یافته",
  "Core B": "هستهٔ B",
  "memory X =": "حافظه X =",
  "bus transactions:": "تراکنش‌های گذرگاه:",
  "Handoff · MSI": "تحویل · MSI",
  "Handoff · MESI": "تحویل · MESI",
  "{n} bus txns": "{n} تراکنش گذرگاه",
  "E lets the sole reader write silently": "حالت E به تنها خواننده اجازهٔ نوشتن بی‌سروصدا می‌دهد",
  "Bus log (newest first)": "گزارش گذرگاه (جدیدترین اول)",
  "— nothing yet —": "— هنوز چیزی نیست —",

  /* bus-log templates */
  "read hit — already holds v{x}": "برخورد خواندن — از قبل v{x} را دارد",
  "read miss → BusRd; {o} was M: writes back, M→S; {name}→{st}": "خطای خواندن → BusRd؛ {o} در M بود: بازنویسی کرد، M→S؛ {name}→{st}",
  "read miss → BusRd; {o} was E: E→S (no writeback); {name}→{st}": "خطای خواندن → BusRd؛ {o} در E بود: E→S (بدون بازنویسی)؛ {name}→{st}",
  "read miss → BusRd; {o} keeps S; {name}→{st}": "خطای خواندن → BusRd؛ {o} در S ماند؛ {name}→{st}",
  "read miss → BusRd; cold miss, served by memory; {name}→{st}": "خطای خواندن → BusRd؛ خطای سرد، از سوی حافظه سرویس شد؛ {name}→{st}",
  "write hit (M) — local update to v{x}, no bus traffic": "برخورد نوشتن (M) — به‌روزرسانی محلی به v{x}، بدون ترافیک گذرگاه",
  "write hit (E) — silent E→M, no bus traffic. v{x}": "برخورد نوشتن (E) — ‏E→M بی‌سروصدا، بدون ترافیک گذرگاه. v{x}",
  "write miss → {txn}; {o} writes back, {o} invalidated; {name}→M, v{x}": "خطای نوشتن → {txn}؛ {o} بازنویسی می‌کند، {o} نامعتبر شد؛ {name}→M، v{x}",
  "write miss → {txn}; {o} invalidated; {name}→M, v{x}": "خطای نوشتن → {txn}؛ {o} نامعتبر شد؛ {name}→M، v{x}",
  "write miss → {txn}; cold miss, served by memory; {name}→M, v{x}": "خطای نوشتن → {txn}؛ خطای سرد، از سوی حافظه سرویس شد؛ {name}→M، v{x}",

  "What the lab's simulator measured — same rules, 4 cores × 200 iterations":
    "آنچه شبیه‌ساز آزمایشگاه اندازه گرفت — همان قواعد، ۴ هسته × ۲۰۰ تکرار",
  "adjacent counters:": "شمارنده‌های مجاور:",
  "padded counters:": "شمارنده‌های پدینگ‌دار:",
  "bus txns, {m} invalidations": "تراکنش گذرگاه، {m} ابطال",
  "Same eight stores: padding each counter onto its own cache line removes ~1590 of 1600 bus transactions. Source:":
    "همان هشت نوشتن: پدینگ‌گذاری هر شمارنده روی خط کش خودش، از ۱۶۰۰ تراکنش گذرگاه حدود ۱۵۹۰ تا را حذف می‌کند. منبع:",

  "Two threads, each incrementing": "دو رشته، هرکدام شمارندهٔ",
  "its own": "خودش",
  " counter — logically zero sharing. But both counters are 8 bytes, and a 64-byte cache line holds them both. The cache knows nothing about variables: coherence works on":
    " را زیاد می‌کند — از نظر منطقی صفر اشتراک. اما هر دو شمارنده ۸ بایت‌اند و یک خط کش ۶۴ بایتی هر دو را در خود جا می‌دهد. کش از متغیرها چیزی نمی‌داند: انسجام روی",
  "lines": "خط‌ها",
  ". Flip the layout and press play.": " کار می‌کند. چیدمان را عوض کنید و پخش را بزنید.",
  "Adjacent (one line)": "مجاور (یک خط)",
  "Padded to 64 B": "پدینگ‌دار تا 64 B",
  "one 64 B line: [ counter {a} = {na} · counter {b} = … ]": "یک خط ۶۴ بایتی: [ شمارندهٔ {a} = {na} · شمارندهٔ {b} = … ]",
  "own line: [ counter {c} = {n} ]": "خط خودش: [ شمارندهٔ {c} = {n} ]",
  "· 56 B pad": "· ۵۶ بایت پدینگ",
  "← the line lives here right now": "← خط همین حالا همین‌جاست",
  "Line transfers": "جابه‌جایی خط‌ها",
  "line ping-pongs A↔B": "خط میان A↔B رفت‌وبرگشت می‌کند",
  "each core keeps its own": "هر هسته مال خودش را نگه می‌دارد",
  "Invalidations": "ابطال‌ها",
  "after {p} of {n} increments": "پس از {p} افزایش از {n} افزایش",
  "Measured: adjacent": "اندازه‌گیری‌شده: مجاور",
  "12 threads × 5M increments": "۱۲ رشته × ۵ میلیون افزایش",
  "Measured: padded": "اندازه‌گیری‌شده: پدینگ‌دار",
  "{n}× more increments/s": "{n}× افزایش بیشتر بر ثانیه",
  "Real-machine result": "نتیجهٔ ماشین واقعی",
  "adjacent counters": "شمارنده‌های مجاور",
  "padded to own lines": "پدینگ‌دار روی خط خودش",
  "Measured on the lab machine with": "اندازه‌گیری روی ماشین آزمایشگاه با",
  "— a {n}× slowdown from nothing but cache-line geometry. See": "— کندی {n}× که فقط از هندسهٔ خط کش می‌آید. بیشتر در",

  "Where this fits the textbook": "جای این بخش در کتاب درسی",
  "Mano Ch. 13 stops at “semaphores for mutual exclusion”. Real multiprocessors keep cores coherent with invalidation protocols like the ones above — the lab's":
    "مانو فصل ۱۳ در «سمافورها برای متقابل‌سازی» می‌ایستد. چندپردازنده‌های واقعی با پروتکل‌های ابطال — مثل همین‌ها — هسته‌ها را با انسجام نگه می‌دارند؛",
  "implements MSI and MESI with machine-checked invariants, and": "در آزمایشگاه MSI و MESI را با ناوردهای ماشین‌وارسی‌شده پیاده کرده و",
  "measures the cost on real silicon.": "هزینه را روی سیلیکون واقعی می‌سنجد.",

  /* ── VirtualMemory ──────────────────────────────────────── */
  "Virtual memory & TLB — one load, translated": "حافظهٔ مجازی و TLB — یک بارگذاری، ترجمه‌شده",
  "The CPU never sees a physical address. Every load goes through a two-step lookup: a tiny, fast, fully-associative":
    "‏CPU هرگز آدرس فیزیکی نمی‌بیند. هر بارگذاری از یک جست‌وجوی دومرحله‌ای می‌گذرد: یک",
  "(hardware) caches recent translations of the": "کوچک، سریع و کاملاً انجمنی (سخت‌افزاری) ترجمه‌های اخیرِ",
  "page table": "جدول صفحه",
  "(owned by the OS). Miss the TLB and you walk the table; the page isn't even mapped and you trap to the OS — a":
    "(مالکیت با سیستم‌عامل است) را کش می‌کند. اگر TLB را از دست بدهید باید جدول را پیمایش کنید؛ اگر صفحه اصلاً نگاشت نشده باشد به سیستم‌عامل تله می‌زنید — یک",
  "page fault": "خطای صفحه",
  "— which maps it in, evicting another page if memory is full.":
    " — که آن را نگاشت می‌کند و اگر حافظه پر باشد صفحهٔ دیگری را جایگزین می‌کند.",

  "Loop in 2 pages": "حلقه در ۲ صفحه",
  "Alternate between pages 0 and 1. After two walks the TLB holds both translations — everything hits.":
    "بین صفحه‌های ۰ و ۱ رفت‌وبرگشت کنید. پس از دو پیمایش TLB هر دو ترجمه را دارد — همه‌چیز برخورد می‌زند.",
  "Touch all 8 pages": "لمس هر ۸ صفحه",
  "More distinct pages than TLB slots: LRU thrash becomes visible, and pages 4 and 6 are unmapped at first.":
    "صفحه‌های متمایز بیش از جای TLB: آشوب LRU دیده می‌شود و صفحه‌های ۴ و ۶ در ابتدا نگاشت ندارند.",
  "No locality at all — expect TLB misses and a few page faults mapping the unmapped pages.":
    "هیچ موضعیتی نیست — منتظر خطاهای TLB و چند خطای صفحه برای نگاشت صفحه‌های بی‌نگاشت باشید.",

  "Translate": "ترجمه",
  "Translate one address": "ترجمهٔ یک آدرس",
  "Virtual address in hex": "آدرس مجازی در هگز",
  "Virtual address": "آدرس مجازی",
  "Physical address": "آدرس فیزیکی",
  "PAGE FAULT → OS maps it": "خطای صفحه → سیستم‌عامل نگاشت می‌کند",
  "TLB hit — 1 cycle-ish": "برخورد TLB — حدود ۱ سیکل",
  "TLB miss → page-table walk": "خطای TLB → پیمایش جدول صفحه",
  "Accesses": "دسترسی‌ها",
  "TLB hit rate": "نرخ برخورد TLB",
  "4 TLB entries · LRU": "۴ ورودی TLB · LRU",
  "Page faults": "خطاهای صفحه",
  "OS mapped the page": "سیستم‌عامل صفحه را نگاشت کرد",
  "Pages evicted": "صفحه‌های جایگزین‌شده",
  "no free frame left": "قاب آزادی نمانده بود",
  "— translate something —": "— چیزی ترجمه کنید —",

  /* VM log templates */
  "0x{va} → TLB hit (vpn {vpn} → frame {pfn})": "0x{va} → برخورد TLB (vpn {vpn} → قاب {pfn})",
  "0x{va} → PAGE FAULT: no free frame, evicted page {vpn} (frame {pfn})": "0x{va} → خطای صفحه: قاب آزاد نبود، صفحهٔ {vpn} جایگزین شد (قاب {pfn})",
  "0x{va} → PAGE FAULT: mapped page {vpn} into free frame {pfn}": "0x{va} → خطای صفحه: صفحهٔ {vpn} در قاب آزاد {pfn} نگاشت شد",
  "0x{va} → TLB miss → page-table walk (vpn {vpn} → frame {pfn})": "0x{va} → خطای TLB → پیمایش جدول صفحه (vpn {vpn} → قاب {pfn})",

  "TLB — 4 entries, fully associative": "TLB — ۴ ورودی، کاملاً انجمنی",
  "hardware": "سخت‌افزار",
  "→ frame {n}": "→ قاب {n}",
  "Page table — 8 pages": "جدول صفحه — ۸ صفحه",
  "OS-owned": "مالکیت سیستم‌عامل",
  "page {n}": "صفحهٔ {n}",
  "unmapped": "بدون نگاشت",

  "Measured: what a TLB miss costs": "اندازه‌گیری‌شده: هزینهٔ خطای TLB",
  "Measured hop latency versus pages touched": "تأخیر اندازه‌گیری‌شدهٔ هر گام برحسب صفحه‌های لمس‌شده",
  "TLB-resident 1.1 ns": "مقیم TLB: 1.1 ns",
  "beyond TLB ~2.7 ns": "فراتر از TLB: ~2.7 ns",
  "walk + DRAM ~12 ns": "پیمایش + DRAM: ~12 ns",
  "distinct 4 KiB pages touched (log scale: 1 → 16 k)": "تعداد صفحه‌های متمایز ۴ KiB لمس‌شده (مقیاس لگاریتمی: ۱ → ۱۶k)",
  "Real numbers from this repo": "عددهای واقعی از همین مخزن",
  "The lab's": "فایل",
  "chases pointers across": "نشانگرها را در سراسر",
  "distinct 4 KiB pages. While the working set fits the TLB, a hop costs":
    "صفحهٔ متمایز 4 KiB دنبال می‌کند. تا وقتی مجموعهٔ کاری در TLB جا می‌شود، هر گام",
  ". Past ~90 pages it doubles (2.7 ns — second-level TLB), and past ~4 k pages the full walk + DRAM lands at":
    " طول می‌کشد. بعد از حدود ۹۰ صفحه دو برابر می‌شود (2.7 ns — TLB سطح دوم) و بعد از حدود ۴ هزار صفحه، پیمایش کامل + DRAM به",
  ": a 10× penalty for losing one translation. Details:": "می‌رسد: جریمه‌ای 10× برای از دست دادن یک ترجمه. جزئیات:",
  "This is Mano §12-6 “Virtual memory” and §12-4 “Associative memory” made concrete: the TLB is exactly the associative page table from the book, and the LRU eviction above is the book's page-replacement problem — except here it runs in microseconds, not on paper.":
    "این همان Mano §12-6 «حافظهٔ مجازی» و §12-4 «حافظهٔ انجمنی» است که عینی شده: جدول TLB دقیقاً همان جدول صفحهٔ انجمنی کتاب است و جایگزینی LRUِ بالا همان مسئلهٔ جایگزینی صفحهٔ کتاب — با این تفاوت که این‌جا در مقیاس میکروثانیه اجرا می‌شود، نه روی کاغذ.",
};
