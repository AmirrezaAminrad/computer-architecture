import type { ReactNode } from "react";

/**
 * Farsi strings for Overview.tsx, Videos.tsx, Pipeline.tsx (+ pipeline/*),
 * cpu/Datapath.tsx and cpu/BusTransfer.tsx.
 * Keys are the exact English strings as written in the components;
 * dynamic sentences use {param} placeholders filled by tf().
 * Stage names/verbs and module metadata live in the core dict (fa.tsx).
 */
export const FA_MISC: Record<string, ReactNode> = {
  "Address": "آدرس",
  "Data in": "داده ورودی",
  "Language": "زبان",
  /* ── Overview.tsx · hero ────────────────────────────────── */
  "AN EXPLORABLE EXPLANATION": "شرحی قابل‌کاوش",
  "How a computer": "چگونه یک کامپیوتر",
  "actually works.": "واقعاً کار می‌کند.",
  "Five ideas — logic, digital design, the CPU, memory and pipelining — stack up into every processor you've ever used. Don't read about them: flip the gates, shrink the logic, step the CPU, miss the cache, and break the pipeline.":
    "پنج ایده — منطق، طراحی دیجیتال، CPU، حافظه و خط لوله — روی هم می‌نشینند و هر پردازنده‌ای را که تاکنون استفاده کرده‌اید می‌سازند. درباره‌شان نخوانید: گیت‌ها را برعکس کنید، منطق را کمینه کنید، CPU را گام‌به‌گام جلو ببرید، کش را خطا بدهید و خط لوله را بشکنید.",
  "Start with bits →": "از بیت‌ها شروع کنید →",
  "See the big picture": "تصویر کلان را ببینید",
  "same bits, different meaning": "همان بیت‌ها، معنایی متفاوت",

  /* ── Overview.tsx · machine map ─────────────────────────── */
  "The big picture": "تصویر کلان",
  "A processor runs a program by repeatedly doing one tiny thing: fetch an instruction, do it. Everything else exists to make that loop":
    "پردازنده برنامه را با تکرارِ همان یک کار کوچک اجرا می‌کند: دستوری را واکشی کن، اجرایش کن. همهٔ بقیهٔ اجزا هست‌اند تا این حلقه را",
  "possible": "ممکن",
  ",": "،",
  "correct": "درست",
  " and ": " و ",
  ". Hover a region to see which module covers it; click to dive in.":
    " سازد. نشانگر را روی هر ناحیه ببرید تا ببینید کدام ماژول آن را پوشش می‌دهد؛ برای ورود عمیق‌تر کلیک کنید.",
  "Map of how the five modules fit together inside a computer":
    "نقشهٔ جای‌گیری پنج ماژول درون یک کامپیوتر",
  "Module 2: Digital design — registers and memory chips":
    "ماژول ۲: طراحی دیجیتال — رجیسترها و تراشه‌های حافظه",
  "flip-flops remember; counters and K-maps build on them":
    "فلیپ‌فلاپ‌ها به یاد می‌سپارند؛ شمارنده‌ها و جدول‌های کارنو روی آن‌ها ساخته می‌شوند",
  "Module 1: Numbers and logic gates": "ماژول ۱: اعداد و گیت‌های منطقی",
  "Module 3: CPU design": "ماژول ۳: طراحی CPU",
  "Module 4: Memory hierarchy": "ماژول ۴: سلسله‌مراتب حافظه",
  "Module 5: Pipelining": "ماژول ۵: خط لوله",
  "CPU CORE": "هستهٔ CPU",
  "MEMORY HIERARCHY": "سلسله‌مراتب حافظه",
  "data": "داده",
  "overlap the stages so every unit stays busy": "هم‌پوشانی مرحله‌ها تا هر واحد همیشه مشغول بماند",
  "decode instructions, steer the datapath": "رمزگشایی دستورها و هدایت مسیر داده",
  "the ALU is gates all the way down": "ALU در نهایت چیزی جز گیت نیست",
  "bigger, slower, cheaper per byte ↓": "بزرگ‌تر، کندتر، ارزان‌تر به‌ازای هر بایت ↓",

  /* ── Overview.tsx · four questions ──────────────────────── */
  "Five questions, five modules": "پنج پرسش، پنج ماژول",
  "Boolean algebra and Karnaugh maps shrink a pile of gates to the minimum that does the job; flip-flops add memory. Registers, shifters, counters and the RAM chips everything talks to are built here.":
    "جبر بول و جدول کارنو، توده‌ای گیت را به کمینهٔ لازم برای انجام کار کوچک می‌کنند؛ فلیپ‌فلاپ‌ها حافظه می‌افزایند. رجیسترها، شیفت‌دهنده‌ها، شمارنده‌ها و تراشه‌های RAM که همه‌چیز با آن‌ها حرف می‌زند، این‌جا ساخته می‌شوند.",
  "Explore": "کاوش",
  "Prefer to watch? The Motion Reels (06) animate the processor's history, the five modules above, and the Antikythera mechanism.":
    "ترجیح می‌دهید تماشا کنید؟ نماهای متحرک (۰۶) تاریخ پردازنده، پنج ماژول بالا و سازوکار آنتی‌کیترا را به حرکت درمی‌آورند.",
  "Live canvas reels, drawn by code in this repo · ": "نماهای زنده روی بوم، کشیده‌شده با کد همین مخزن · ",
  "Watch →": "تماشا →",

  /* ── Overview.tsx · journey ─────────────────────────────── */
  "Follow one instruction: LOAD R1, [R3 + 4]": "یک دستور را دنبال کنید: LOAD R1, [R3 + 4]",
  "It starts as bits": "همه‌چیز از بیت‌ها آغاز می‌شود",
  "LOAD R1, [R3+4] is a 16-bit pattern — 0x6704. Numbers, addresses and instructions are all just bits; what they mean depends on who reads them.":
    "‏LOAD R1, [R3+4] یک الگوی ۱۶ بیتی است — 0x6704. اعداد، آدرس‌ها و دستورها همه فقط بیت‌اند؛ معنای آن‌ها به خواننده‌اش بستگی دارد.",
  "Fetch from the instruction cache": "واکشی از کش دستور",
  "The PC's value is an address. The L1 instruction cache usually answers in a few cycles; on a miss the request falls to L2, L3, then DRAM (~80 ns, hundreds of cycles).":
    "مقدار PC یک آدرس است. کش دستور L1 معمولاً در چند سیکل پاسخ می‌دهد؛ در صورت خطا، درخواست به L2 و L3 و سپس DRAM می‌رسد (~۸۰ نانوثانیه، صدها سیکل).",
  "Decode and read registers": "رمزگشایی و خواندن رجیسترها",
  "The control unit splits the bits: opcode LOAD, base register R3, offset 4. It sets MemRead, ALUSrc = immediate, RegWrite and MemToReg.":
    "واحد کنترل بیت‌ها را می‌شکافد: کد عمل LOAD، رجیستر پایه R3 و آفست ۴. سپس MemRead و ALUSrc = immediate و RegWrite و MemToReg را فعال می‌کند.",
  "The ALU adds R3 + 4": "‏ALU جمع R3 + 4 را انجام می‌دهد",
  "The effective address is computed by an adder — the same full-adder chain from Module 01, built entirely from XOR, AND and OR gates.":
    "آدرس مؤثر با یک جمع‌کننده محاسبه می‌شود — همان زنجیرهٔ جمع‌کنندهٔ کامل ماژول ۰۱ که تماماً از گیت‌های XOR و AND و OR ساخته شده است.",
  "Data-cache lookup": "جست‌وجو در کش داده",
  "The address splits into tag | index | offset. Tag match → hit, data in ~1 ns. Mismatch → miss, and the whole 64-byte block is pulled up the hierarchy.":
    "آدرس به tag | index | offset می‌شکند. برابری tag → برخورد، داده در ~۱ نانوثانیه. نابرابری → خطا، و کل بلوک ۶۴ بایتی از پایین سلسله‌مراتب بالا کشیده می‌شود.",
  "Meanwhile, the pipeline moves on": "در همین حال، خط لوله به کارش ادامه می‌دهد",
  "While LOAD sits in MEM, the next instructions are already in EX, ID and IF. If the next instruction needs R1, it must wait one bubble — the load-use hazard.":
    "در حالی که LOAD در MEM نشسته، دستورهای بعدی از قبل در EX و ID و IF هستند. اگر دستور بعدی به R1 نیاز داشته باشد، باید یک حباب صبر کند — مخاطرهٔ بارگیری و استفاده.",
  "Next ▸": "بعدی ▸",
  "Explore {mod} →": "کاوش {mod} →",

  /* ── Overview.tsx · iron law ────────────────────────────── */
  "One equation ties them together: the Iron Law of performance":
    "یک معادله همه را به هم گره می‌زند: قانون آهنِ اجرا",
  "CPU time": "زمان CPU",
  "Instructions": "دستورها",
  "Clock period": "دورهٔ کلاک",
  "Instruction count — ISA & compiler (Module 03)": "شمار دستورها — ISA و کامپایلر (ماژول ۰۳)",
  "Clock frequency — gate & wire delay (Module 01)": "بسامد کلاک — تأخیر گیت و سیم (ماژول ۰۱)",
  "Base CPI — pipeline hazards (Module 05)": "CPI پایه — مخاطره‌های خط لوله (ماژول ۰۵)",
  "L1 miss rate per memory reference (Module 04)": "نرخ خطای L1 به‌ازای هر ارجاع به حافظه (ماژول ۰۴)",
  "Average miss penalty (Module 04)": "جریمهٔ میانگین خطا (ماژول ۰۴)",
  "Run time": "زمان اجرا",
  "Where the cycles go (effective CPI = {cpi})": "سیکل‌ها کجا می‌روند (CPI مؤثر = {cpi})",
  "pipeline: {n}": "خط لوله: {n}",
  "memory stalls: {n} ({p}%)": "توقف‌های حافظه: {n} ({p}%)",
  "memory CPI = {refs} refs/instr × {miss}% × {pen} cycles. A fast clock and a perfect pipeline are wasted if the cache keeps missing — each module attacks a different term of the same product.":
    "‏CPI حافظه = {refs} ارجاع/دستور × {miss}% × {pen} سیکل. کلاک سریع و خط لولهٔ بی‌نقص، اگر کش مدام خطا بدهد، هدر می‌روند — هر ماژول بر یکی از جمله‌های همین ضرب اثر می‌گذارد.",

  /* ── Overview.tsx · WHY cards ───────────────────────────── */
  "Hardware only knows high and low voltage. Bits encode everything; gates transform them; adders prove that arithmetic is just logic. The ALU you'll meet in Module 03 is built from exactly these parts.":
    "سخت‌افزار فقط ولتاژ بالا و پایین را می‌شناسد. بیت‌ها همه‌چیز را کد می‌کنند؛ گیت‌ها آن‌ها را دگرگون می‌کنند؛ جمع‌کننده‌ها ثابت می‌کنند که حساب، چیزی جز منطق نیست. ALUای که در ماژول ۰۳ می‌بینید از دقیقاً همین قطعه‌ها ساخته شده است.",
  "A datapath moves data, a control unit decides what it does each cycle. The fetch–decode–execute loop turns a list of numbers in memory into behaviour — you'll write and single-step a program yourself.":
    "مسیر داده، داده را جابه‌جا می‌کند و واحد کنترل تصمیم می‌گیرد که در هر سیکل با آن چه کند. حلقهٔ واکشی–رمزگشایی–اجرا، فهرستی از اعداد در حافظه را به رفتار تبدیل می‌کند — خودتان برنامه‌ای می‌نویسید و گام‌به‌گام اجرایش می‌کنید.",
  "Compute is cheap, waiting for data is not. A hierarchy of caches exploits locality to make a huge slow memory behave like a fast one — until your access pattern breaks the bet.":
    "محاسبه ارزان است، اما منتظر داده ماندن نه. سلسله‌مراتب کش‌ها با بهره‌گیری از موضعیت، حافظهٔ بزرگ و کند را مانند حافظه‌ای سریع رفتار می‌دهد — تا وقتی الگوی دسترسی شما این فرض را خراب کند.",
  "Instead of finishing one instruction before starting the next, overlap them like an assembly line. Throughput soars — until dependencies and branches introduce stalls, forwarding, and flushes.":
    "به‌جای آن‌که یک دستور را پیش از آغاز دستور بعدی تمام کنید، آن‌ها را مانند یک خط مونتاژ هم‌پوشان کنید. گذردهی اوج می‌گیرد — تا وقتی وابستگی‌ها و انشعاب‌ها، توقف‌ها، فوروارد و پاک‌سازی‌ها را به میان می‌آورند.",

  /* ── Videos.tsx ─────────────────────────────────────────── */
  "Watch": "تماشا",
  "The same ideas this site teaches, rendered as motion design. Pick a reel: the processor's history, the four core modules set in motion, or the 2,000-year-old gearwork that started it all.":
    "همان ایده‌هایی که این سایت درس می‌دهد، این‌بار در قالب موشن‌دیزاین. نمایی انتخاب کنید: تاریخ پردازنده، ماژول‌های اصلی در حرکت، یا چرخ‌دنده‌کاری ۲۰۰۰ ساله‌ای که همه‌چیز را آغاز کرد.",
  "Every reel is drawn live on a canvas by TypeScript code in this repo (src/reels) — no video files. Click to play, scrub the timeline, press F for fullscreen, M for sound.":
    "هر نما به‌صورت زنده روی بوم (canvas) و با کد TypeScript همین مخزن (src/reels) کشیده می‌شود — بدون فایل ویدیویی. برای پخش کلیک کنید، خط زمان را بکشید، با F تمام‌صفحه و با M صدا را روشن کنید.",
  "Loading reel…": "در حال بارگذاری نما…",
  "A Short History of the Processor": "تاریخ کوتاه پردازنده",
  "The whole arc in one timeline: Babbage's Analytical Engine, von Neumann's stored-program design, the Intel 4004, RISC & pipelining, the multi-core era, and chiplets & AI silicon.":
    "تمام این مسیر در یک خط زمان: موتور تحلیلی بابیج، طراحی برنامهٔ ذخیره‌شوندهٔ فون نویمان، اینتل ۴۰۰۴، RISC و خط لوله، عصر چندهسته‌ای و چیپلت‌ها و تراشه‌های هوش مصنوعی.",
  "ArchLab Motion Showreel": "شوریل متحرک ArchLab",
  "4 scenes": "۴ صحنه",
  "The four core ideas of this site — logic, pipelining, memory and multi-core — as hand-drawn motion scenes. Module 01–04's material, set in motion.":
    "چهار ایدهٔ اصلی این سایت — منطق، خط لوله، حافظه و چندهسته‌ای — در قالب صحنه‌های متحرک دست‌کشیده. مطالب ماژول‌های ۰۱ تا ۰۴، به حرکت درآمده.",
  "The Antikythera Mechanism": "سازوکار آنتی‌کیترا",
  "~100 BC": "حدود ۱۰۰ پیش از میلاد",
  "Two thousand years before the CPU: hand-cut bronze gears, interlocking to track lunar months and the Saros eclipse cycle. The first analog computer — and the same lesson about mechanism and prediction.":
    "دو هزار سال پیش از CPU: چرخ‌دنده‌های برنزیِ دست‌تراش که درهم‌قفل شده‌اند تا ماه‌های قمری و چرخهٔ خورشیدگرفتگیِ ساروس را دنبال کنند. نخستین رایانهٔ آنالوگ — و همان درس دربارهٔ سازوکار و پیش‌بینی.",
  "timeline": "خط زمان",
  "history": "تاریخ",
  "logic": "منطق",
  "pipeline": "خط لوله",
  "memory": "حافظه",
  "multicore": "چندهسته‌ای",
  "analog": "آنالوگ",
  "gears": "چرخ‌دنده",
  "astronomy": "نجوم",

  /* ── Pipeline.tsx · 5.1 five-stage pipeline ─────────────── */
  "If each instruction used the whole datapath alone, most of the hardware would sit idle most of the time. Pipelining is assembly-line thinking: start the next instruction before the last one finishes.":
    "اگر هر دستور به‌تنهایی از تمام مسیر داده استفاده می‌کرد، بیشترِ سخت‌افزار بیشترِ وقت بیکار می‌ماند. خط لوله همان تفکر خط مونتاژ است: دستور بعدی را پیش از تمام‌شدن دستور قبلی شروع کنید.",
  "The five-stage pipeline": "خط لولهٔ پنج‌مرحله‌ای",
  "Split the work into five stages — ": "کار را به پنج مرحله بشکنید — ",
  " — with a register between each. While instruction 1 is in EX, instruction 2 is in ID and instruction 3 is in IF. Choose a program, then press ":
    " — و بین هر دو، یک رجیستر بگذارید. وقتی دستور ۱ در EX است، دستور ۲ در ID و دستور ۳ در IF است. برنامه‌ای انتخاب کنید و سپس ",
  "Play": "پخش",
  " or drag the cycle slider.": " یا لغزندهٔ سیکل را بکشید.",
  "Program & options": "برنامه و گزینه‌ها",
  "Independent": "مستقل",
  "No instruction uses another's result: the pipeline flows at one instruction per cycle.":
    "هیچ دستوری از نتیجهٔ دستور دیگر استفاده نمی‌کند: خط لوله با آهنگ یک دستور در هر سیکل جاری است.",
  "RAW chain": "زنجیرهٔ RAW",
  "The classic Hennessy & Patterson example: every instruction reads r2, which sub is still computing. Toggle forwarding!":
    "مثال کلاسیک هنسی و پترسون: هر دستور r2 را می‌خواند؛ همان r2 که sub هنوز در حال محاسبهٔ آن است. فوروارد را روشن/خاموش کنید!",
  "Load-use": "بارگیری و استفاده",
  "Data from lw isn't available until the end of MEM, so even with forwarding the very next instruction must stall one cycle.":
    "دادهٔ lw تا پایان MEM آماده نیست؛ بنابراین حتی با فوروارد هم، دستور بلافاصله بعدی باید یک سیکل بایستد.",
  "Taken branch": "انشعاب گرفته‌شده",
  "The branch outcome isn't known until it reaches the resolve stage; the two instructions fetched behind it are on the wrong path and are flushed.":
    "نتیجهٔ انشعاب تا رسیدن به مرحلهٔ تعیین تکلیف معلوم نیست؛ دو دستوری که پشت آن واکشی شده‌اند در مسیر اشتباه‌اند و پاک می‌شوند.",
  "Mixed": "ترکیبی",
  "A realistic blend: two loads, a dependent add, a store of the result, and a taken branch.":
    "ترکیبی واقع‌گرایانه: دو بارگیری، یک جمع وابسته، ذخیرهٔ نتیجه و یک انشعاب گرفته‌شده.",
  "Custom program.": "برنامهٔ دلخواه.",
  "Instruction sequence": "توالی دستورها",
  "line {n}: {msg}": "سطر {n}: {msg}",
  "Syntax:": "نحو:",
  "(T = taken, N = not taken). r0 is hard-wired to zero.": "(T = گرفته می‌شود، N = گرفته نمی‌شود). r0 همیشه به صفر سخت‌افزاری شده است.",
  "Data forwarding (bypassing)": "فوروارد داده (بای‌پس)",
  "results are routed straight to the ALU": "نتیجه‌ها مستقیم به ALU می‌رسند",
  "operands only come from the register file": "عملوندها فقط از فایل رجیسترها می‌آیند",
  "Branch resolved in": "تعیین تکلیف انشعاب در",
  "Earlier = smaller penalty, but needs extra comparator hardware (and forwarding into ID).":
    "هرچه جلوتر = جریمهٔ کمتر، اما به سخت‌افزار مقایسه‌گرِ اضافه نیاز دارد (و فوروارد به درون ID).",
  "Fetch policy after a branch": "سیاست واکشی پس از انشعاب",
  "predict not-taken": "پیش‌بینی انشعاب نگرفته",
  "always stall": "همیشه توقف",

  /* ── Pipeline.tsx · live pipeline & timing ──────────────── */
  "Live pipeline": "خط لولهٔ زنده",
  "cycle 0": "سیکل ۰",
  "cycle {n} / {total}": "سیکل {n} / {total}",
  "↺ Replay": "↺ پخش دوباره",
  "Cycle": "سیکل",
  "Timing diagram": "نمودار زمان‌بندی",
  "Pipeline timing diagram": "نمودار زمان‌بندی خط لوله",
  "CYCLE": "سیکل",
  "forwarding path": "مسیر فوروارد",
  "hazard (stall)": "مخاطره (توقف)",
  "stall": "توقف",
  "Enter some instructions above.": "چند دستور در کادر بالا وارد کنید.",
  "Each row is one instruction, each column one clock cycle. A diagonal staircase means a full pipeline. ":
    "هر سطر یک دستور است و هر ستون یک سیکل کلاک. پله‌های مورب یعنی خط لولهٔ پُر. ",
  "Hatched “stall” cells": "خانه‌های هاشورخوردهٔ «توقف»",
  " are cycles an instruction is held back; dashed red rows are wrong-path instructions that were fetched and then flushed.":
    " سیکل‌هایی‌اند که دستور در آن‌ها نگه داشته شده؛ سطرهای خط‌چین قرمز، دستورهای مسیر اشتباه‌اند که واکشی شدند و سپس پاک شدند.",
  "Total cycles": "کل سیکل‌ها",
  "ideal: {n} = N + 4": "ایده‌آل: {n} = N + 4",
  "cycles per instruction (incl. fill)": "سیکل به‌ازای هر دستور (با احتساب پرشدن)",
  "Data stalls": "توقف‌های داده",
  "bubbles from RAW hazards": "حباب‌های ناشی از مخاطره‌های RAW",
  "Branch bubbles": "حباب‌های انشعاب",
  "{n} instr flushed": "{n} دستور پاک شد",
  "no branches": "بدون انشعاب",

  /* ── Pipeline.tsx · 5.2 hazards ─────────────────────────── */
  "Hazards: when overlap goes wrong": "مخاطره‌ها: وقتی هم‌پوشانی خراب می‌شود",
  "Overlapping instructions assumes they're independent. When they aren't — or when the next PC is uncertain — the pipeline must insert bubbles. Three families of hazard:":
    "هم‌پوشانی دستورها فرض می‌کند که آن‌ها مستقل‌اند. وقتی مستقل نیستند — یا وقتی PC بعدی نامعلوم است — خط لوله باید حباب وارد کند. سه خانوادهٔ مخاطره:",
  "Structural hazard": "مخاطرهٔ ساختاری",
  "Two instructions need the same hardware in the same cycle.": "دو دستور در یک سیکل به یک سخت‌افزار نیاز دارند.",
  "Duplicate the resource. Here: separate instruction & data memories, and a register file with two read ports and one write port. (A single shared memory would make IF collide with MEM on every load/store.)":
    "منبع را تکثیر کنید. این‌جا: حافظهٔ جدای دستور و داده، و فایل رجیستری با دو درگاه خواندن و یک درگاه نوشتن. (یک حافظهٔ مشترک واحد، IF را در هر بارگیری/ذخیره با MEM تصادم می‌داد.)",
  "Data (RAW) hazard": "مخاطرهٔ داده (RAW)",
  "An instruction reads a register that an earlier, still-in-flight instruction hasn't written yet.":
    "دستوری رجیستری را می‌خواند که دستور قبلیِ هنوز در راه، هنوز چیزی در آن ننوشته است.",
  "Stall until the write-back happens — or forward the result straight from the EX/MEM or MEM/WB pipeline register into the ALU input. Loads still cost one bubble.":
    "تا انجام بازنویسی توقف کنید — یا نتیجه را مستقیم از رجیستر خط‌لولهٔ EX/MEM یا MEM/WB به ورودی ALU فوروارد کنید. بارگیری‌ها همچنان یک حباب هزینه دارند.",
  "Control hazard": "مخاطرهٔ کنترل",
  "The next PC isn't known until a branch resolves, but fetch has already moved on.":
    "‏PC بعدی تا تکلیف انشعاب روشن نشود معلوم نیست، اما واکشی از قبل جلو رفته است.",
  "Stall, predict (here: predict not-taken and flush on a mistake), or resolve branches earlier in the pipeline to shrink the penalty.":
    "توقف کنید، پیش‌بینی کنید (اینجا: پیش‌بینی انشعاب نگرفته و پاک‌سازی در صورت اشتباه)، یا انشعاب‌ها را جلوتر در خط لوله تکلیف کنید تا جریمه کوچک شود.",
  "Fix:": "راه‌حل:",
  "Hazards in your program": "مخاطره‌ها در برنامهٔ شما",
  "Forwarding": "فوروارد",
  "Without forwarding": "بدون فوروارد",
  "With forwarding": "با فوروارد",
  "cycles": "سیکل",
  "{n} stall cycle{s}": "{n} سیکل توقف",
  " · saves {n}": " · {n} سیکل صرفه‌جویی",
  "No hazards in this sequence — the pipeline sustains one instruction per cycle once full.":
    "در این توالی مخاطره‌ای نیست — خط لوله پس از پُر شدن، در هر سیکل یک دستور تکمیل می‌کند.",
  "needs the result of": "نیازمند نتیجهٔ",
  "stall × {n}": "توقف × {n}",
  "forward {label}": "فوروارد {label}",
  "Control": "کنترل",
  "Fetch stalls until each beq resolves in {stage}.": "واکشی متوقف می‌ماند تا تکلیف هر beq در {stage} روشن شود.",
  "Taken beq resolves in {stage}; the {n} instruction{s} fetched behind it were wrong-path and are flushed.":
    "‏beq گرفته‌شده در {stage} تعیین تکلیف می‌شود؛ {n} دستوری که پشت آن واکشی شد مسیر اشتباه بود و پاک می‌شود.",
  "Not-taken branches match the prediction, so there is no penalty.":
    "انشعاب‌های نگرفته با پیش‌بینی می‌خوانند، پس جریمه‌ای در کار نیست.",
  "{n} bubble{s}": "{n} حباب",
  "Try it: on ": "امتحان کنید: در ",
  ", turn forwarding on and the two stall cycles vanish — the result of ":
    "، فوروارد را روشن کنید و آن دو سیکل توقف محو می‌شوند — نتیجهٔ ",
  " is passed from the EX/MEM register straight into the next ALU operation. On ":
    " از رجیستر EX/MEM مستقیم به عملیات ALU بعدی می‌رسد. در ",
  ", one stall always remains: a load's data only exists at the end of MEM, one stage too late for the very next EX.":
    "، همیشه یک توقف باقی می‌ماند: دادهٔ بارگیری فقط در پایان MEM وجود دارد — یک مرحله دیر برای EXِ بلافاصله بعدی.",

  /* ── Pipeline.tsx · 5.3 pipelined vs non-pipelined ──────── */
  "Pipelined vs. non-pipelined": "خط‌لوله‌ای در برابر غیرخط‌لوله‌ای",
  "Same instructions, same hardware, same clock — one machine finishes each instruction before starting the next, the other overlaps them.":
    "همان دستورها، همان سخت‌افزار، همان کلاک — یک ماشین هر دستور را پیش از آغاز بعدی تمام می‌کند؛ دیگری آن‌ها را هم‌پوشان می‌کند.",
  "Non-pipelined (5 cycles per instruction)": "غیرخط‌لوله‌ای (۵ سیکل به‌ازای هر دستور)",
  "Pipelined (current options)": "خط‌لوله‌ای (گزینه‌های فعلی)",
  "Non-pipelined": "غیرخط‌لوله‌ای",
  "Pipelined": "خط‌لوله‌ای",
  "cycles (5 × N)": "سیکل (۵ × N)",
  "in cycles, same clock": "برحسب سیکل، با همان کلاک",
  "Speedup": "افزایش سرعت",
  "Limit as N → ∞": "حد در N → ∞",
  "(CPI → 1 vs. 5)": "(CPI → ۱ در برابر ۵)",
  "It's about throughput, not latency": "ماجرا گذردهی است، نه تأخیر",
  "Every instruction still takes ": "هر دستور همچنان ",
  "5 cycles": "۵ سیکل",
  " from fetch to write-back — latency didn't improve (it actually gets slightly worse from the pipeline registers). What changed is ":
    " از واکشی تا بازنویسی طول می‌کشد — تأخیر بهتر نشد (از رجیسترهای خط لوله حتی کمی بدتر هم می‌شود). آنچه عوض شد ",
  "throughput": "گذردهی",
  ": one instruction completes per cycle once the pipeline is full.":
    " است: پس از پُر شدن خط لوله، در هر سیکل یک دستور تمام می‌شود.",
  "Real stages aren't perfectly balanced, so the clock must fit the ":
    "مرحله‌های واقعی کاملاً متوازن نیستند، پس کلاک باید با ",
  "slowest": "کندترین",
  " one. With textbook delays below, the pipelined clock is 200 ps while a single-cycle design needs {n} ps per instruction.":
    "شان جور بیاید. با تأخیرهای کتاب‌درسیِ زیر، کلاک خط‌لوله‌ای 200 ps است، در حالی که طراحی تک‌سیکلی به {n} ps به‌ازای هر دستور نیاز دارد.",
  "single-cycle": "تک‌سیکلی",
  "multi-cycle": "چندسیکلی",
  "pipelined": "خط‌لوله‌ای",
  "Stage delays (ps) — the slowest sets the clock": "تأخیر مرحله‌ها (ps) — کندترین، کلاک را تعیین می‌کند",
  "idle for {n} ps each cycle": "در هر سیکل {n} ps بیکار",
  "Ideal speedup over single-cycle = {a} / 200 = {b}×, not 5× — imbalance costs a stage's worth.":
    "افزایش سرعت ایده‌آل نسبت به تک‌سیکلی = {a} / ۲۰۰ = {b}×، نه ۵× — نابرابری، به‌اندازهٔ یک مرحله هزینه دارد.",
  "Beyond the 5-stage pipe": "فراتر از خط لولهٔ ۵ مرحله‌ای",
  "Deeper pipelines raise the clock but make hazards costlier. Superscalar cores issue several instructions per cycle; out-of-order cores reorder independent ones to hide stalls; branch predictors guess outcomes far more cleverly than “not taken”. All of them are this same idea — keep every piece of hardware busy — pushed further, and all of them lean on the cache hierarchy from Module 03 to keep the front of the pipe fed.":
    "خط لوله‌های عمیق‌تر کلاک را بالا می‌برند اما مخاطره‌ها را پرهزینه‌تر می‌کنند. هسته‌های ابراسکالر در هر سیکل چند دستور صادر می‌کنند؛ هسته‌های خارج از ترتیب، دستورهای مستقل را برای پنهان‌کردن توقف‌ها بازآرایی می‌کنند؛ پیش‌بینی‌کننده‌های انشعاب خیلی هوشمندانه‌تر از «انشعاب نمی‌گیرد» حدس می‌زنند. همه‌شان همین یک ایده‌اند — هر قطعه سخت‌افزار را مشغول نگه دار — که جلوتر رفته است، و همه‌شان برای آن‌که جلوی خط لوله تغذیه شود به سلسله‌مراتب کش ماژول ۰۳ تکیه می‌کنند.",

  /* ── LivePipe.tsx ───────────────────────────────────────── */
  "bubble": "حباب",
  "flushed ✕": "پاک شد ✕",
  "stalled": "متوقف",
  "wrong path": "مسیر اشتباه",

  /* ── Datapath.tsx ───────────────────────────────────────── */
  "CPU datapath diagram": "نمودار مسیر دادهٔ CPU",
  "waiting for an instruction…": "در انتظار یک دستور…",
  "no side effects": "بدون اثر جانبی",
  "{n} words": "{n} واژه",

  /* ── BusTransfer.tsx ────────────────────────────────────── */
  "Between the gates of module 01 and the running programs above sits the ":
    "بین گیت‌های ماژول ۰۱ و برنامه‌های در حال اجرای بالا، ",
  "register transfer level": "سطح انتقال ثبات",
  ": a handful of registers, an ALU, and ": " قرار دارد: چند رجیستر، یک ALU و ",
  "one shared bus": "یک گذرگاه مشترک",
  ". Each clock pulse, control logic selects ": " است. در هر پالس کلاک، منطق کنترل ",
  "one": "یک",
  " source onto the bus and pulses one destination's load input. Pick a source and a destination, then clock it.":
    " مبدأ را روی گذرگاه برمی‌گزیند و ورودی بارِ یک مقصد را پالس می‌دهد. مبدأ و مقصدی انتخاب کنید و کلاک بزنید.",
  "Datapath — one bus, one transfer per clock": "مسیر داده — یک گذرگاه، یک انتقال در هر کلاک",
  "Registers connected by a common bus": "رجیسترهای متصل با یک گذرگاه مشترک",
  "common bus · S₂S₁S₀ selects the source": "گذرگاه مشترک · S₂S₁S₀ مبدأ را انتخاب می‌کند",
  "control word:": "کلمهٔ کنترل:",
  " · R (memory read) = 1": " · R (خواندن حافظه) = ۱",
  "Compose a micro-operation": "یک ریزعمل بسازید",
  "Source (S₂S₁S₀)": "مبدأ (S₂S₁S₀)",
  "Destination (load input)": "مقصد (ورودی بار)",
  "Clock ↑": "کلاک ↑",
  "last clock:": "کلاک قبلی:",
  "{n} pulses": "{n} پالس",
  "Micro-program: the fetch cycle": "میکروبرنامه: چرخهٔ واکشی",
  "the address of the next instruction leaves the PC for the memory":
    "آدرس دستور بعدی از PC به طرف حافظه خارج می‌شود",
  "memory read: the instruction word arrives on the bus":
    "خواندن حافظه: واژهٔ دستور روی گذرگاه می‌رسد",
  "the opcode moves to the instruction register, where the decoder waits":
    "کد عمل به رجیستر دستور می‌رود؛ جایی که رمزگشا در انتظار است",
  "the incrementer advances PC — the bus was free to do nothing here":
    "افزاینده، PC را جلو می‌برد — گذرگاه این‌جا آزاد بود که کاری نکند",
  "Click each timing step in order. Real hardware runs T₁'s memory read and T₂'s PC increment in the same clock — here every micro-operation gets its own pulse so you can watch the bus.":
    "هر گام زمان‌بندی را به ترتیب کلیک کنید. سخت‌افزار واقعی، خواندن حافظهٔ T₁ و افزایش PC در T₂ را در همان یک کلاک انجام می‌دهد — این‌جا هر ریزعمل پالس خودش را می‌گیرد تا بتوانید گذرگاه را تماشا کنید.",
  "One bus ⇒ one transfer per clock": "یک گذرگاه ⇒ یک انتقال در هر کلاک",
  "That constraint is the whole game of datapath design: instruction timing (above, and Mano Ch. 5) is literally a table of which micro-operations happen at T₀, T₁, T₂…. More buses or dedicated paths (like the incrementer feeding PC) buy parallelism — the same trade the pipeline module makes at scale.":
    "همین قید، تمامِ بازی طراحی مسیر داده است: زمان‌بندی دستور (بالا، و فصل ۵ مانو) در حقیقت جدولی است از اینکه کدام ریزعمل‌ها در T₀ و T₁ و T₂… رخ می‌دهند. گذرگاه‌های بیشتر یا مسیرهای اختصاصی (مثل افزاینده‌ای که PC را تغذیه می‌کند) موازی‌کاری می‌خرند — همان معامله‌ای که ماژول خط لوله در مقیاس بزرگ انجام می‌دهد.",
};
