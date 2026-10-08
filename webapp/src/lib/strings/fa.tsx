import type { ReactNode } from "react";
import { FA_LOGIC } from "./fa-logic";
import { FA_MEMORY } from "./fa-memory";
import { FA_MISC } from "./fa-misc";

/**
 * Farsi dictionary — keyed by the exact English string used in the components.
 * Missing keys fall back to English at runtime, so coverage can grow incrementally.
 * Rich values (ReactNode) are used for leads that carry inline emphasis in English.
 * Module-group dictionaries live in fa-logic.tsx / fa-memory.tsx / fa-misc.tsx and are merged here.
 */
const FA_CORE: Record<string, ReactNode> = {
  /* ── App chrome ─────────────────────────────────────────── */
  "MODULE": "ماژول",
  "Computer Architecture": "معماری کامپیوتر",
  "Modules": "ماژول‌ها",
  "ArchLab home": "خانهٔ ArchLab",
  "← Previous": "قبلی →",
  "Next →": "بعدی ←",
  "ArchLab — Interactive Computer Architecture": "ArchLab — معماری کامپیوتر، به‌صورت تعاملی",
  "Every simulation runs live in your browser. Simplifications are called out where they occur — the structure is faithful, the numbers are textbook-typical.":
    "هر شبیه‌سازی مستقیماً در مرورگر شما اجرا می‌شود. هرجا ساده‌سازی شده، همین‌جا اعلام شده است — ساختار به کتاب وفادار است و مقادیر در حد اعداد معمول کتاب درسی هستند.",
  "ArchLab · an interactive tour of computer architecture · built with React, SVG and Tailwind":
    "ArchLab · گشتی تعاملی در معماری کامپیوتر · ساخته‌شده با React، SVG و Tailwind",

  /* ── Module metadata ────────────────────────────────────── */
  "The Big Picture": "تصویر کلان",
  "Overview": "مرور کلی",
  "How four ideas make a computer": "چگونه چهار ایده یک کامپیوتر می‌سازند",
  "How five ideas make a computer": "چگونه پنج ایده یک کامپیوتر می‌سازند",
  "Why does a CPU need all of this?": "چرا CPU به همهٔ این‌ها نیاز دارد؟",
  "How the pieces fit": "چگونه قطعات کنار هم می‌نشینند",

  "Numbers & Logic Gates": "عددها و گیت‌های منطقی",
  "Numbers & Logic": "عدد و منطق",
  "Bits, gates, and arithmetic from nothing but switches":
    "بیت، گیت و محاسبه — فقط با کلیدها",
  "How can switches compute?": "کلیدها چگونه می‌توانند محاسبه کنند؟",

  "Digital Design": "طراحی دیجیتال",
  "From Boolean algebra to registers, counters and memory chips":
    "از جبر بول تا رجیسترها، شمارنده‌ها و تراشه‌های حافظه",
  "How do gates become circuits that remember?":
    "گیت‌ها چگونه به مدارهایی تبدیل می‌شوند که به یاد می‌سپارند؟",

  "CPU Design & Instruction Cycle": "طراحی CPU و سیکل دستور",
  "CPU & Instructions": "CPU و دستورها",
  "Datapath, control, and the fetch–decode–execute loop":
    "مسیر داده، کنترل و حلقهٔ واکشی–رمزگشایی–اجرا",
  "How does hardware run a program?": "سخت‌افزار چگونه یک برنامه را اجرا می‌کند؟",

  "Memory Hierarchy & Caching": "سلسله‌مراتب حافظه و کش",
  "Memory & Caches": "حافظه و کش",
  "Why fast, small memory sits in front of big, slow memory":
    "چرا حافظهٔ کوچک و سریع جلوی حافظهٔ بزرگ و کند می‌نشیند",
  "How do we feed the CPU fast enough?": "چگونه CPU را به‌قدر کافی سریع تغذیه می‌کنیم؟",

  "Pipelining & Parallel Execution": "خط لوله و اجرای موازی",
  "Pipelining": "خط لوله",
  "Overlapping instructions — and the hazards that bite back":
    "هم‌پوشانی دستورها — و مخاطره‌هایی که مانع آن می‌شوند",
  "How do we go faster without a faster clock?": "چطور بدون کلاک سریع‌تر، سریع‌تر شویم؟",

  "Motion Reels": "نماهای متحرک",
  "The story of the machine, animated": "داستان ماشین، متحرک‌سازی‌شده",
  "What does it all look like in motion?": "همهٔ این‌ها در حرکت چه شکلی‌اند؟",

  /* ── Pipeline stage names (STAGE_INFO) ──────────────────── */
  "Fetch": "واکشی",
  "Decode": "رمزگشایی",
  "Execute": "اجرا",
  "Memory": "حافظه",
  "Write-back": "بازنویسی",
  "Read the instruction at PC": "خواندن دستور از آدرس PC",
  "Decode it & read registers": "رمزگشایی دستور و خواندن رجیسترها",
  "ALU computes result / address / branch": "محاسبهٔ نتیجه/آدرس/انشعاب در ALU",
  "Load or store data memory": "خواندن یا نوشتن در حافظهٔ داده",
  "Write result to register file": "نوشتن نتیجه در فایل رجیسترها",

  /* ── Module 02 · Digital Design ─────────────────────────── */
  "Step-through simplifier": "ساده‌ساز گام‌به‌گام",
  "Example a": "مثال الف",
  "Example b": "مثال ب",
  "← Back": "بازگشت",
  "Apply law →": "اعمال قانون",
  "Reset": "بازآدرس",
  "Start": "شروع",
  "Same truth table, far fewer gates — that is the whole game of Boolean simplification.":
    "همان جدول درستی، با گیت‌های بسیار کمتر — این تمامِ بازیِ ساده‌سازی جبر بول است.",
  "Proof — every row still agrees": "اثبات — تمام سطرها همچنان برابرند",
  "original": "اصل تابع",
  "simplified": "ساده‌شده",
  "Basic postulates": "اصول پایه",
  "Other identities": "اتحادیات دیگر",
  "Commutative laws": "قوانین جابه‌جایی",
  "Distributive laws": "قوانین توزیع‌پذیری",
  "Identity elements": "عناصر خنثی",
  "Inverse elements": "عناصر وارون",
  "Null elements": "قوانین صفر و یک",
  "Idempotent laws": "قوانین تکرار",
  "Associative laws": "قوانین شرکت‌پذیری",
  "DeMorgan's theorem": "قضیهٔ دمورگان",
  "Absorption": "قانون جذب",
  "Factor common term": "فاکتور گرفتن جملهٔ مشترک",
  "Simplification (A + A′B = A + B)": "ساده‌سازی (A + A′B = A + B)",

  /* ── KMap ───────────────────────────────────────────────── */
  "Karnaugh map — click cells to toggle 1s": "جدول کارنو — برای تغییر ۱ها روی خانه‌ها کلیک کنید",
  "Notation & result": "نمایش و نتیجه",
  "Minimal sum of products": "کمینهٔ مجموع جمله‌های ضربی",
  "Each colored loop is one product term — a group of 2ᵏ adjacent 1s whose variables that stay constant survive; the rest drop out.":
    "هر حلقهٔ رنگی یک جملهٔ ضربی است — گروهی از ۲ᵏ یکِ مجاور که متغیرهای ثابتِ آن باقی می‌مانند و بقیه حذف می‌شوند.",
  "Presets from the slides": "مثال‌های اسلایدها",
  "3-var · F = A′B′C′ + A′BC + AB′C′": "سه‌متغیره · F = A′B′C′ + A′BC + AB′C′",
  "4-var · Σm(3, 9, 12)": "چهارمتغیره · Σm(۳, ۹, ۱۲)",
  "Clear": "پاک کردن",
  "Wrap-around adjacency": "مجاورت دورپیچشی",
  "Edges are neighbors: the leftmost and rightmost columns touch, and so do the top and bottom rows — that is why groups of 2, 4 or 8 can wrap around the border of the map. Try Σm(0, 2, 8, 10) to see the four corners collapse into a single term B′D′.":
    "لبه‌ها همسایه‌اند: ستون‌های اول و آخر به هم می‌رسند و سطرهای بالا و پایین نیز — به همین دلیل گروه‌های ۲، ۴ یا ۸تایی می‌توانند از مرز جدول دور بپیچند. Σm(۰, ۲, ۸, ۱۰) را امتحان کنید تا چهار گوشه در یک جملهٔ B′D′ جمع شوند.",

  /* ── MuxDecoder ─────────────────────────────────────────── */
  "4×1 MUX — the data switch": "‏MUX ۴×۱ — کلید داده",
  "8×1 MUX implements F(A,B,C,D)": "پیاده‌سازی F(A,B,C,D) با MUX ۸×۱",
  "Decoders & scaling": "دیکدرها و بزرگ‌سازی",
  "4-to-1 multiplexer — gates": "مالتی‌پلکسر ۴×۱ — سطح گیت",
  "Function table": "جدول عملکرد",
  "Each AND gate passes its Dᵢ only when the select lines spell its own index; exactly one AND fires, and the OR collects the winner. The highlighted table row follows your selects.":
    "هر گیت AND فقط وقتی Dᵢ را عبور می‌دهد که خطوط انتخاب، شمارهٔ خودش را بگویند؛ دقیقاً یک AND روشن می‌شود و OR برنده را جمع می‌کند. سطر پررنگ‌شدهٔ جدول انتخاب‌های شما را دنبال می‌کند.",
  "8×1 MUX as a function of A": "مالتی‌پلکسر ۸×۱ به‌عنوان تابعی از A",
  "Implementation table — F(A,B,C,D)": "جدول پیاده‌سازی — F(A,B,C,D)",
  "row": "سطر",
  "Fix B, C, D (the select lines) and F becomes a function of A alone: both minterms circled → wire 1; none → 0; only the bottom row → A; only the top row → A′. That reads the MUX inputs straight off the table — the bottom row is exactly I0…I7.":
    "‏B، C و D (خطوط انتخاب) را ثابت کنید؛ F به تابعی از A تنها تبدیل می‌شود: هر دو مینترم دایره‌خورده → ۱؛ هیچ‌کدام → ۰؛ فقط سطر پایین → A؛ فقط سطر بالا → A′. ورودی‌های MUX مستقیم از جدول خوانده می‌شوند — سطر پایین همان I0…I7 است.",
  "Try it": "امتحان کنید",
  "Flip A and the selects B, C, D: the active data input (I₀…I₇) glows and F follows it. Columns of the table highlight the select you chose.":
    "‏A و خطوط انتخاب B، C، D را عوض کنید: ورودی دادهٔ فعال (I₀…I₇) می‌درخشد و F دنبال آن می‌رود. ستون‌های جدول انتخاب شما را پررنگ می‌کنند.",
  "3×8 decoder with enable": "دیکدر ۳×۸ با فعال‌ساز",
  "Truth table": "جدول درستی",
  "active output": "خروجی فعال",
  "A decoder with n inputs and an enable lights exactly one of 2ⁿ outputs — n inputs in, 2ⁿ outputs out. When E = 0, everything stays dark.":
    "دیکدر با n ورودی و یک فعال‌ساز دقیقاً یکی از ۲ⁿ خروجی را روشن می‌کند — n ورودی در برابر ۲ⁿ خروجی. وقتی E = 0، همهٔ خروجی‌ها خاموش می‌مانند.",
  "Scaling up: 32×1 MUX from 8×1 MUXes": "بزرگ‌سازی: مالتی‌پلکسر ۳۲×۱ از ۸×۱ها",
  "selects C, D, E inside every MUX; A, B pick the MUX": "خطوط انتخاب C، D، E داخل هر MUX؛ A و B کدام MUX را برمی‌گزینند",
  "Scaling up: 5×32 decoder from 3×8 decoders": "بزرگ‌سازی: دیکدر ۵×۳۲ از دیکدرهای ۳×۸",
  "C, D, E enter all four; A, B enable exactly one": "‏C، D، E به هر چهار بلوک می‌روند؛ A و B دقیقاً یکی را فعال می‌کنند",

  /* ── FlipFlops ──────────────────────────────────────────── */
  "The four flip-flops": "چهار فلیپ‌فلاپ",
  "JK from D + MUX (slide example)": "‏JK از D + MUX (مثال اسلاید)",
  "Pulse the clock — state changes only on the edge": "پالس کلاک بده — حالت فقط در لبه تغییر می‌کند",
  "CLK ↑ (pulse)": "‏CLK ↑ (پالس)",
  "S = R = 1 is forbidden — the next state is undefined.": "‏S = R = 1 ممنوع است — حالت بعدی تعریف‌نشده است.",
  "Characteristic equation": "معادلهٔ مشخصه",
  "The forbidden combination S = R = 1 tries to set and reset at once — keep it out of your state tables.":
    "ترکیب ممنوع S = R = 1 می‌خواهد همزمان set و reset کند — در جدول حالت‌هایتان جای ندهید.",
  "J = K = 1 turns the flip-flop into a toggle: Q flips on every clock edge — the seed of every binary counter.":
    "\u2066J = K = 1\u2069 فلیپ‌فلاپ را به حالت تغییر وضعیت (toggle) می‌برد: Q در هر لبهٔ کلاک برعکس می‌شود — پایهٔ هر شمارندهٔ دودویی.",
  "On the clock edge Q copies D — the transparent workhorse every register and shift register is built from.":
    "در لبهٔ کلاک، Q از D کپی می‌کند — عنصر پایه‌ای که هر رجیستر و شیفت‌رجیستری از آن ساخته می‌شود.",
  "T = 0 holds the state, T = 1 flips it. A JK with its inputs tied together is exactly a T flip-flop.":
    "‏T = 0 حالت را نگه می‌دارد، T = 1 برعکس می‌کند. یک JK با ورودی‌های به‌هم‌پیوسته دقیقاً یک T است.",
  "Slide example — a JK flip-flop from a D flip-flop and a 4×1 MUX":
    "مثال اسلاید — فلیپ‌فلاپ JK از یک D و یک MUX ۴×۱",
  "The MUX feeds D with exactly the next state the JK table demands: I₀ = Q holds, I₁ = 0 resets, I₂ = 1 sets, I₃ = Q̄ toggles. Same behaviour, different guts — proof that flip-flop types are interchangeable.":
    "‏MUX دقیقاً همان حالت بعدیِ موردنیاز جدول JK را به D می‌دهد: I₀ = Q نگه می‌دارد، I₁ = ۰ ریست، I₂ = ۱ ست، I₃ = Q̄ تغییر وضعیت. همان رفتار، با سیم‌کشی متفاوت — اثبات اینکه نوع فلیپ‌فلاپ‌ها جایگزین‌پذیرند.",
  "Why the clock?": "چرا کلاک؟",
  "A flip-flop is the memory unit of sequential circuits: it stores one bit, and only a clock pulse can move it to a new state. One shared clock is what lets millions of flip-flops change state in lockstep instead of chaos.":
    "فلیپ‌فلاپ واحد حافظهٔ مدارهای ترتیبی است: یک بیت را نگه می‌دارد و فقط پالس کلاک می‌تواند آن را به حالت تازه ببرد. یک کلاک مشترک است که به میلیون‌ها فلیپ‌فلاپ اجازه می‌دهد هماهنگ — نه آشفته — حالت عوض کنند.",

  /* ── ShiftCounter ───────────────────────────────────────── */
  "Shift registers": "شیفت‌رجیسترها",
  "Ripple counter": "شمارندهٔ موجی",
  "Design a counter (slide Ex 8)": "طراحی شمارنده (مثال ۸ اسلاید)",
  "Shift register — four D flip-flops in a row": "شیفت‌رجیستر — چهار D در یک ردیف",
  "enters here (right)": "ورودی شیفت راست",
  "enters here (left)": "ورودی شیفت چپ",
  "common clock": "کلاک مشترک",
  "Mode control (S₁ S₀)": "کنترل حالت (S₁ S₀)",
  "Hold (00)": "نگه‌داشتن (۰۰)",
  "Shift right (01)": "شیفت راست (۰۱)",
  "Shift left (10)": "شیفت چپ (۱۰)",
  "Load (11)": "بارگذاری (۱۱)",
  "function": "عملکرد",
  "no change": "بدون تغییر",
  "shift right": "شیفت به راست",
  "shift left": "شیفت به چپ",
  "parallel load": "بارگذاری موازی",
  "Two select lines turn one chain of flip-flops into four machines. In load mode the D inputs march in side by side on the next clock edge; in shift modes one bit enters serially per pulse.":
    "دو خط انتخاب یک زنجیرهٔ فلیپ‌فلاپ را به چهار ماشین تبدیل می‌کند. در حالت بارگذاری، ورودی‌های D در لبهٔ کلاک بعدی کنار هم وارد می‌شوند؛ در حالت‌های شیفت، هر پالس یک بیت به‌صورت سریال داخل می‌رود.",
  "Ripple counter — four JK flip-flops, J = K = 1": "شمارندهٔ موجی — چهار JK با J = K = 1",
  "CLK ↑ (count)": "‏CLK ↑ (شمارش)",
  "counts 0–15, then wraps": "از ۰ تا ۱۵ می‌شمارد و دوباره از سر",
  "Timing — every stage halves the clock": "زمان‌بندی — هر طبقه کلاک را نصف می‌کند",
  "Each flip-flop halves the frequency of the one before it: Q₀ toggles on every pulse, Q₁ every second, Q₃ every eighth — a 4-bit counter walking 0 → 15 and wrapping.":
    "هر فلیپ‌فلاپ بسامد قبلی را نصف می‌کند: Q₀ با هر پالس تغییر وضعیت می‌دهد، Q₁ هر دو پالس یک‌بار، Q₃ هر هشت پالس — شمارندهٔ ۴ بیتی که ۰ تا ۱۵ را می‌رود و برمی‌گردد.",
  "Step 1 — the specification and its state table": "گام ۱ — صورت مسئله و جدول حالت آن",
  "Design a 2-bit counter with inputs E and x: when E = 0 the state freezes; when E = 1, x = 1 counts up and x = 0 counts down. (Course slide, Example 8.)":
    "شمارندهٔ ۲ بیتی با ورودی‌های E و x طراحی کنید: وقتی E = 0 حالت ثابت می‌ماند؛ وقتی E = 1، با x = 1 رو به بالا و با x = 0 رو به پایین می‌شمارد. (اسلاید درس، مثال ۸.)",
  "Step 2 — through the JK excitation table": "گام ۲ — عبور از جدول تحریک JK",
  "For each transition the JK excitation table says what J and K must be: 0→0 needs J=0 (K free), 0→1 needs J=1, 1→0 needs K=1, 1→1 needs K=0 — the X entries are don't-cares that make the K-maps easy.":
    "برای هر انتقال، جدول تحریک JK می‌گوید J و K چه باید باشند: برای 0→0، J=0 (K آزاد)؛ برای 0→1، J=1؛ برای 1→0، K=1؛ برای 1→1، K=0 — مدخل‌های X بی‌اهمیت‌اند و کار جدول کارنو را آسان می‌کنند.",
  "Step 3 — K-maps give the equations": "گام ۳ — جدول‌های کارنو معادله‌ها را می‌دهند",
  "The two corner 1s on the E = 1 row are x̄B̄ and xB — an XNOR of x with B, gated by E. B toggles whenever we are allowed to count, so J_B = K_B = E. (K_A mirrors J_A; cells with A = 1 are don't-cares.)":
    "دو یکِ گوشهٔ سطر E = 1 همان x̄B̄ و xB هستند — یعنی XNORِ x با B که با E روشن می‌شود. B هر بار که اجازهٔ شمارش داریم تغییر وضعیت می‌دهد، پس J_B = K_B = E. (‏K_A قرینهٔ J_A است؛ خانه‌های A = 1 بی‌اهمیت‌اند.)",
  "Step 4 — the circuit, alive": "گام ۴ — مدار، به‌صورت زنده",
  "Flip E and x and pulse: the state holds, counts up or counts down — exactly the slide's specification, now running.":
    "‏E و x را عوض کنید و پالس بدهید: حالت ثابت می‌ماند، بالا یا پایین می‌شمارد — دقیقاً صورت مسئلهٔ اسلاید، این‌بار در حال اجرا.",
  "hold": "ثابت می‌ماند",
  "count up 00→01→10→11": "شمارش رو به بالا 00→01→10→11",
  "count down 11→10→01→00": "شمارش رو به پایین 11→10→01→00",
  "From parts to behaviour": "از قطعه‌ها تا رفتار",
  "This is the standard workflow of sequential design: write the state table, convert it through the flip-flop's excitation table, minimize with K-maps, and wire the result. Everything in module 03's control unit is built the same way, just at a larger scale.":
    "این گردش‌کار استاندارد طراحی ترتیبی است: جدول حالت را بنویسید، از جدول تحریک فلیپ‌فلاپ عبور دهید، با جدول کارنو کمینه کنید و نتیجه را سیم‌کشی کنید. همهٔ واحد کنترل در ماژول ۰۳ هم به همین روش ساخته می‌شود، فقط در مقیاس بزرگ‌تر.",

  /* ── RamRom ─────────────────────────────────────────────── */
  "RAM — read/write memory": "‏RAM — حافظهٔ خواندنی/نوشتنی",
  "ROM — read-only memory": "‏ROM — حافظهٔ فقط‌خواندنی",
  "k address lines": "k خط آدرس",
  "Read / Write": "خواندن / نوشتن",
  "data in": "داده ورودی",
  "data out": "داده خروجی",
  "A RAM with k address lines holds 2ᵏ words you can read or write, one at a time.":
    "‏RAM با k خط آدرس ۲ᵏ واژه دارد که می‌توان یکی‌یکی در آن‌ها خواند یا نوشت.",
  "n output lines": "n خط خروجی",
  "no write line — contents are permanent": "خط نوشتن ندارد — محتوا همیشگی است",
  "A ROM has the same address-word shape, but its contents are wired in once and for all — it only reads. Program boot code lives here.":
    "‏ROM همان ساختار آدرس–واژه را دارد، اما محتوایش یک‌بار برای همیشه در سیم‌کشی ثابت شده — فقط می‌خواند. کد راه‌اندازی در آن ذخیره می‌شود.",
  "Build 4096×8 from 128×8 chips": "ساخت 4096×8 از تراشه‌های 128×8",
  "Address (0–4095)": "آدرس (0–4095)",
  "A11…A7 pick the chip — A6…A0 address inside it": "‏A11…A7 تراشه را برمی‌گزینند — A6…A0 آدرس درون آن",
  "chip": "تراشه",
  "of 32": "از ۳۲",
  "in-chip address": "آدرس درون‌تراشه",
  "chip address range": "محدودهٔ آدرس تراشه",
  "4096 / 128 = 2¹²⁄2⁷ = 2⁵ = 32 chips. The five high address bits go through a 5→32 decoder; each decoder line selects one 128-word chip, and the low seven bits address within it.":
    "‏4096 / 128 = 2¹²⁄2⁷ = 2⁵ = 32 تراشه. پنج بیت بالای آدرس از دیکدر ۵→۳۲ می‌گذرند؛ هر خط دیکدر یک تراشهٔ ۱۲۸ واژه‌ای را انتخاب می‌کند و هفت بیت پایین درون آن آدرس می‌دهند.",
  "Read / Write playground": "زمین بازی خواندن/نوشتن",
  "RAM (write allowed)": "‏RAM (نوشتن مجاز)",
  "ROM (read-only)": "‏ROM (فقط‌خواندنی)",
  "address": "آدرس",
  "contents": "محتوا",
  "Read": "خواندن",
  "Write": "نوشتن",
  "Data out": "داده خروجی",
  "ROM is read-only — the write is refused.": "‏ROM فقط‌خواندنی است — نوشتن رد می‌شود.",
  "Why the decoder pattern matters": "چرا الگوی دیکدر مهم است",
  "Address decoding is the same idea whether the 'chips' are RAM, ROM, or device ports — the virtual-memory translation in module 04 plays the identical trick: high address bits pick the unit, low bits pick the word inside it.":
    "رمزگشایی آدرس همان ایده است، چه «تراشه‌ها» RAM باشند، چه ROM، چه درگاه‌های دستگاه — ترجمهٔ حافظهٔ مجازی در ماژول ۰۴ همان ترفند را بازی می‌کند: بیت‌های بالای آدرس واحد را برمی‌گزینند و بیت‌های پایین واژهٔ درون آن را.",

  /* ── Digital page ───────────────────────────────────────── */
  "Module 02 is where gates learn to remember. We shrink logic with Boolean algebra and Karnaugh maps, route signals with multiplexers and decoders, store a bit in a flip-flop, march registers into shifters and counters — and finish with the RAM and ROM chips everything else plugs into.":
    "ماژول ۰۲ جایی است که گیت‌ها یاد می‌گیرند به یاد بسپارند. با جبر بول و جدول کارنو منطق را کوچک می‌کنیم، با مالتی‌پلکسر و دیکدر سیگنال را مسیریابی می‌کنیم، یک بیت را در فلیپ‌فلاپ می‌سپاریم، رجیسترها را به شیفت‌رجیستر و شمارنده می‌رسانیم — و با تراشه‌های RAM و ROM تمام می‌کنیم که همه‌چیز به آن‌ها وصل می‌شود.",
  "Boolean algebra & the laws": "جبر بول و قوانین آن",
  "Every circuit is an equation. Boolean algebra gives the rules to rewrite it into fewer gates — same truth table, less hardware. Step through the worked examples from the course slides; each step names the law it used, and the truth table proves the result never changed.":
    "هر مدار یک معادله است. جبر بول قاعده‌هایی می‌دهد که معادله را به گیت‌های کمتری بازنویسی کند — همان جدول درستی، سخت‌افزار کمتر. مثال‌های حل‌شدهٔ اسلایدها را گام‌به‌گام بروید؛ هر گام نام قانونش را می‌گوید و جدول درستی ثابت می‌کند نتیجه هرگز عوض نشده.",
  "Why bother?": "چرا اهمیت دارد؟",
  "A smaller expression is not just tidier — every saved term is real gates on real silicon. Example b collapses a four-term sum into a single literal C′.":
    "عبارت کوچک‌تر فقط مرتب‌تر نیست — هر جملهٔ حذف‌شده گیت‌های واقعی روی سیلیکون واقعی است. مثال ب یک چهارجمله‌ای را به تنها یک لیترال C′ فرومی‌پاشد.",
  "Minterms & Karnaugh maps": "مینترم‌ها و جدول کارنو",
  "Write a function as a sum of minterms — Σm, one AND term per truth-table row where f = 1 — or as a product of maxterms — ∏M, where f = 0. A K-map lays those rows out so neighbors differ in one bit: circle the 1s in powers-of-two blocks and every circle collapses into one product term. Click cells below; the minimal cover is drawn for you.":
    "تابع را به‌صورت مجموع مینترم‌ها بنویسید — Σm، برای هر سطر جدول درستی که f = 1 است یک جملهٔ AND — یا به‌صورت ضرب ماکسترم‌ها — ∏M، هرجا f = 0. جدول کارنو سطرها را طوری می‌چیند که همسایه‌ها در یک بیت فرق کنند: یک‌ها را در بلوک‌های توانِ ۲ دایره بزنید و هر دایره به یک جملهٔ ضربی فرومی‌ریزد. روی خانه‌ها کلیک کنید؛ پوشش کمینه برایتان رسم می‌شود.",
  "Multiplexers & decoders": "مالتی‌پلکسرها و دیکدرها",
  "A multiplexer is a data switch: the select lines pick which of 2ⁿ inputs flows out — and an 8×1 MUX can implement any 4-variable function, one input per column of the implementation table. A decoder is the mirror image: n inputs light exactly one of 2ⁿ outputs. Both scale by hierarchy — 32×1 from 8×1s, 5×32 from 3×8s.":
    "مالتی‌پلکسر یک کلید داده است: خطوط انتخاب تعیین می‌کنند کدام‌یک از ۲ⁿ ورودی به خروجی برود — و یک MUX ۸×۱ می‌تواند هر تابع ۴ متغیره را پیاده کند، برای هر ستون جدول پیاده‌سازی یک ورودی. دیکدر تصویر آینه‌ای آن است: n ورودی دقیقاً یکی از ۲ⁿ خروجی را روشن می‌کند. هر دو با سلسله‌مراتب بزرگ می‌شوند — ۳۲×۱ از ۸×۱ها، ۵×۳۲ از ۳×۸ها.",
  "Flip-flops: one bit of memory": "فلیپ‌فلاپ‌ها: یک بیت حافظه",
  "Combinational circuits forget the instant their inputs change. A flip-flop stores one bit and updates it only on a clock edge — the pulse that paces the whole machine. Pick a type, flip its inputs, pulse the clock, and watch the truth table and the characteristic equation decide what Q becomes.":
    "مدارهای ترکیبی به محض تغییر ورودی فراموش می‌کنند. فلیپ‌فلاپ یک بیت را نگه می‌دارد و فقط در لبهٔ کلاک به‌روزش می‌کند — همان پالسی که ریتم کل ماشین را می‌دهد. یک نوع را انتخاب کنید، ورودی‌هایش را عوض کنید، کلاک را پالس بدهید و ببینید جدول درستی و معادلهٔ مشخصه چه بر سر Q می‌آورند.",
  "Shift registers & counters": "شیفت‌رجیسترها و شمارنده‌ها",
  "Flip-flops in a row become a shift register — serial or parallel in, either direction, under a two-bit mode control — or a ripple counter that walks 0–15 by itself. The last tab replays the slide's design problem in full: from state table, through JK excitation and K-maps, to a working circuit.":
    "فلیپ‌فلاپ‌های پشت‌سرهم یک شیفت‌رجیستر می‌سازند — ورودی سریال یا موازی، در هر دو جهت، زیر کنترل یک حالت دوبیتی — یا شمارندهٔ موجی که خودش ۰ تا ۱۵ را قدم می‌زند. زبانهٔ آخر مسئلهٔ طراحی اسلاید را کامل دوباره اجرا می‌کند: از جدول حالت، از جدول تحریک JK و جدول کارنو، تا مداری که کار می‌کند.",
  "Memory: RAM & ROM": "حافظه: RAM و ROM",
  "A RAM with k address lines holds 2ᵏ readable, writable words; a ROM holds 2ᵏ words wired in permanently. Real memories are assembled from small chips — type any address below and watch a 5→32 decoder hand it to the right 128×8 chip.":
    "‏RAM با k خط آدرس ۲ᵏ واژهٔ خواندنی/نوشتنی دارد؛ ROM ۲ᵏ واژهٔ همیشگیِ سیم‌کشی‌شده. حافظه‌های واقعی از تراشه‌های کوچک مونتاژ می‌شوند — هر آدرسی را تایپ کنید و ببینید دیکدر ۵→۳۲ آن را به تراشهٔ درست 128×8 می‌سپارد.",

  /* ── Module 03 · CPU ────────────────────────────────────── */
  "Datapath": "مسیر داده",
  "HALTED": "متوقف",
  "done": "انجام شد",
  "READY": "آماده",
  "Instruction cycle": "چرخهٔ دستور",
  "Step": "گام",
  "Step instruction »": "یک دستور کامل »",
  "‖ Pause": "‖ مکث",
  "▶ Run": "▶ اجرا",
  "↺ Reset": "↺ بازآدرس",
  "slow": "آهسته",
  "normal": "عادی",
  "fast": "سریع",
  "not used by this instruction": "برای این دستور استفاده نمی‌شود",
  "Instruction register, bit by bit": "رجیستر دستور، بیت‌به‌بیت",
  "decoded ✓": "رمزگشایی شد ✓",
  "waiting for fetch/decode": "در انتظار واکشی/رمزگشایی",
  "Stopped": "متوقف شد",
  "Program finished": "برنامه تمام شد",
  "instructions in": "دستور در",
  "cycles →": "سیکل ←",
  "This multi-cycle machine uses most of the datapath for only one stage at a time. Pipelining (module 05) overlaps stages to push CPI toward 1.":
    "این ماشین چندسیکلی در هر لحظه فقط یک مرحله از مسیر داده را به کار می‌گیرد. خط‌لوله‌کاری (ماژول ۰۵) مرحله‌ها را هم‌پوشان می‌کند تا CPI به ۱ نزدیک شود.",
  "Program": "برنامه",
  "Sum 1…5 (loop)": "مجموع ۱…۵ (حلقه)",
  "A counted loop: ADD, ADDI and a backwards BNE. R3 is never written, so it stays 0 and serves as our zero register.":
    "یک حلقهٔ شمارشی: ADD، ADDI و یک BNE رو به عقب. R3 هرگز نوشته نمی‌شود، پس صفر می‌ماند و نقش رجیستر صفر ما را بازی می‌کند.",
  "Memory round-trip": "رفت‌وبرگشت حافظه",
  "Store a value to data memory, read it back, and use it. Watch the Memory stage light up for LOAD/STORE only.":
    "یک مقدار را در حافظهٔ داده ذخیره کن، بخوانش کن و به کار ببر. ببینید مرحلهٔ حافظه فقط برای LOAD/STORE روشن می‌شود.",
  "Multiply 6×7": "ضرب ۶×۷",
  "No multiplier in this ISA — multiply by repeated addition, a nice illustration of instruction count vs. hardware.":
    "در این ISA ضرب‌کننده‌ای نیست — ضرب با جمع‌های مکرر؛ نمونهٔ خوبی از نسبت تعداد دستور با سخت‌افزار.",
  "Branch & jump": "انشعاب و پرش",
  "BEQ skips an instruction when its operands are equal; JMP always jumps. The skipped LDI never executes.":
    "‏BEQ وقتی عملوندها برابرند یک دستور را رد می‌کند؛ JMP همیشه می‌پرد. آن LDI ردشده هرگز اجرا نمی‌شود.",
  "Assembly source": "متن اسمبلی",
  "line": "سطر",
  "Assembled (instruction memory)": "اسمبل‌شده (حافظهٔ دستور)",
  "Registers & PC": "رجیسترها و PC",
  "Data memory (16 words, address mod 16)": "حافظهٔ داده (۱۶ واژه، آدرس به پیمانهٔ ۱۶)",
  "Cycles": "سیکل‌ها",
  "Instrs": "دستورها",
  "Control signals by opcode (what the decoder produces)": "سیگنال‌های کنترل به‌ازای هر کد عمل (خروجی رمزگشا)",
  "A CPU is a loop: fetch an instruction, figure out what it means, do it, and move on. This module opens the box — datapath, ALU, control and a tiny instruction set you can program and single-step.":
    "‏CPU یک حلقه است: دستور را واکشی کن، بفهم یعنی چه، اجرایش کن و برو سراغ بعدی. این ماژول جعبه را باز می‌کند — مسیر داده، ALU، کنترل و یک مجموعهٔ دستور کوچک که می‌توانید برنامه‌ریزی و گام‌به‌گام اجرا کنید.",
  "Anatomy of a processor": "کالبدشناسی پردازنده",
  "Two ideas dominate CPU design: a datapath (the hardware that moves and transforms data) and control (the logic that decides what the datapath does this cycle). Every instruction is just a different setting of the control signals.":
    "دو ایده بر طراحی CPU حاکم‌اند: مسیر داده (سخت‌افزاری که داده را جابه‌جا و تبدیل می‌کند) و کنترل (منطقی که تصمیم می‌گیرد مسیر داده در این سیکل چه کند). هر دستور فقط پیکربندی متفاوتی از سیگنال‌های کنترل است.",
  "Run a program, one stage at a time": "اجرای برنامه، مرحله‌به‌مرحله",
  "Pick a program (or edit it), then press": "برنامه‌ای را انتخاب کنید (یا ویرایشش کنید) و سپس",
  "Each press runs one stage of the instruction cycle. The coloured components and flowing wires show exactly which hardware is in use. Stages an instruction doesn't need — like":
    "هر فشار یک مرحله از چرخهٔ دستور را اجرا می‌کند. قطعه‌های رنگی و سیم‌های جاری دقیقاً نشان می‌دهند کدام سخت‌افزار در کار است. مرحله‌هایی که دستور لازم ندارد — مثل",
  "for an ADD — are skipped.": "برای ADD — رد می‌شوند.",
  "Register transfer & the common bus": "انتقال ثبات و گذرگاه مشترک",
  "Zoom between the gates of module 01 and the programs above: a CPU is registers + one shared bus. Each clock pulse, control logic selects a source onto the bus and pulses one destination's load — a":
    "بین گیت‌های ماژول ۰۱ و برنامه‌های بالا زوم کنید: یک CPU یعنی رجیسترها + یک گذرگاه مشترک. در هر پالس کلاک، منطق کنترل یک مبدأ را روی گذرگاه می‌گذارد و بارِ یک مقصد را پالس می‌دهد — یک",
  "micro-operation": "ریزعمل",
  "The fetch cycle you just watched in 3.2 is four of them.": "چرخهٔ واکشی که در ۳٫۲ دیدید چهار تا از آن‌هاست.",
  "The ALU: arithmetic, logic, shift": "‏ALU: حساب، منطق، شیفت",
  "Modules 01–02 built the pieces; here they click together into the arithmetic–logic unit. One stage = an arithmetic circuit (MUX + adder), a logic circuit (gates + MUX), a shift unit, and a final select: S₃S₂ choose the family, S₁S₀ the operation. This is the box every instruction's execute step keeps calling.":
    "ماژول‌های ۰۱ و ۰۲ قطعه‌ها را ساختند؛ این‌جا به هم کلیک می‌خورند و واحد محاسبه و منطق می‌شوند. یک طبقه = مدار حساب (MUX + جمع‌کننده)، مدار منطق (گیت‌ها + MUX)، واحد شیفت و یک انتخاب نهایی: S₃S₂ خانواده را برمی‌گزینند و S₁S₀ عملیات را. این همان جعبه‌ای است که مرحلهٔ اجرای هر دستور مدام صدا می‌زند.",
  "The TinyRISC instruction set": "مجموعهٔ دستور TinyRISC",
  "A deliberately small, RISC-style ISA: fixed 16-bit instructions, load/store architecture (only LOAD and STORE touch memory), and three simple formats.":
    "یک ISA عمداً کوچک به سبک RISC: دستورهای ۱۶ بیتی ثابت، معماری بار/ذخیره (فقط LOAD و STORE به حافظه دست می‌زنند) و سه قالب ساده.",
  "Instruction": "دستور",
  "Meaning": "معنا",
  "Stages used": "مرحله‌های به‌کاررفته",
  "stop / do nothing": "توقف / کاری نکن",
  "Honest simplifications": "ساده‌سازی‌های صادقانه",
  "Branch targets are absolute instruction indices (MIPS/RISC-V use PC-relative offsets), the PC counts instructions rather than bytes, and data memory is only 16 words. Register values are 8-bit and wrap around. The structure — fetch, decode, execute, memory, write-back, driven by decoded control signals — is the real thing.":
    "مقصدهای انشعاب اندیس مطلق دستورند (در MIPS/RISC-V آفست نسبی به PC است)، PC به‌جای بایت، دستور می‌شمارد و حافظهٔ داده فقط ۱۶ واژه است. مقادیر رجیسترها ۸ بیتی‌اند و دور می‌پیچند. ساختار — واکشی، رمزگشایی، اجرا، حافظه، بازنویسی، رانده‌شده با سیگنال‌های کنترل رمزگشایی‌شده — همان واقعیت است.",
  "ASM charts & control design": "چارت ASM و طراحی کنترل",
  "Who pulses which register, when? The answer is a state machine, and the Algorithmic State Machine chart is its blueprint: state boxes, decision boxes, conditional outputs. Below, the course's example machine is written as a chart, as a state table, and as real hardware — two MUXes feeding D flip-flops through a decoder.":
    "چه کسی، کدام رجیستر را، کِی پالس می‌کند؟ پاسخ یک ماشین حالت است و چارت ASM (ماشین حالت الگوریتمی) نقشهٔ آن: جعبهٔ حالت، جعبهٔ تصمیم و خروجی‌های شرطی. در ادامه، ماشینِ مثالِ درس را سه‌بار می‌بینید: به‌شکل چارت، به‌شکل جدول حالت و به‌شکل سخت‌افزار واقعی — دو MUX که از راه یک دیکدر به فلیپ‌فلاپ‌های D می‌روند.",
  "Program counter (PC)": "شمارندهٔ برنامه (PC)",
  "A register holding the address of the next instruction. Fetch increments it; branches overwrite it.":
    "رجیستری که آدرس دستور بعدی را نگه می‌دارد. واکشی آن را یکی می‌کند؛ انشعاب‌ها بازنویسی‌اش می‌کنند.",
  "Instruction register (IR)": "رجیستر دستور (IR)",
  "Holds the fetched instruction while it's decoded, so its bit fields can steer the rest of the machine.":
    "دستور واکشی‌شده را در حال رمزگشایی نگه می‌دارد تا بیت‌هایش بقیهٔ ماشین را هدایت کنند.",
  "Control unit": "واحد کنترل",
  "Turns the opcode into control signals (RegWrite, ALUSrc, MemRead…) — the datapath's conductor.":
    "کد عمل را به سیگنال‌های کنترل تبدیل می‌کند (RegWrite، ALUSrc، MemRead و…) — هماهنگ‌کنندهٔ مسیر داده.",
  "Register file": "فایل رجیسترها",
  "A small, very fast array of registers with two read ports and one write port.":
    "آرایه‌ای کوچک و بسیار سریع از رجیسترها با دو درگاه خواندن و یک درگاه نوشتن.",
  "ALU": "واحد محاسبه و منطق (ALU)",
  "Combinational logic from Modules 01–02: adds, subtracts, ANDs, shifts — and computes memory addresses and branch conditions.":
    "منطق ترکیبی از ماژول‌های ۰۱ و ۰۲: جمع، تفریق، AND، شیفت — و محاسبهٔ آدرس حافظه و شرط انشعاب.",
  "Memories & buses": "حافظه‌ها و گذرگاه‌ها",
  "Instruction and data memory (Harvard-style here) connected by wires/buses; a mux picks where each value comes from.":
    "حافظهٔ دستور و داده (اینجا به سبک هاروارد) با سیم/گذرگاه به هم وصل‌اند؛ یک MUX انتخاب می‌کند هر مقدار از کجا بیاید.",

  /* ── Alu ────────────────────────────────────────────────── */
  "Arithmetic": "حساب",
  "Logic": "منطق",
  "Shift": "شیفت",
  "One-stage ALU": "‏ALU یک‌طبقه",
  "Arithmetic circuit — MUX + full adder": "مدار حساب — MUX + تمام‌جمع‌کننده",
  "operation select": "انتخاب عملیات",
  "carry in / +1": "رقم نقلی ورودی / +1",
  "Function table (slide Ex 7)": "جدول عملکرد (مثال ۷ اسلاید)",
  "One MUX and one adder produce all four operations. S and Cin together address the MUX: it hands the adder B, 0, all-ones (so A + 1111 = A − 1), or B̄ — and Cin supplies the +1 that turns A + B̄ into A − B. This is the adder–subtractor of the slides, drawn as a data-selection problem.":
    "یک MUX و یک جمع‌کننده هر چهار عملیات را می‌دهند. S و Cin با هم MUX را آدرس‌دهی می‌کنند: او به جمع‌کننده B، صفر، همه‌یک (پس A + 1111 = A − 1) یا B̄ می‌دهد — و Cin همان +1 را می‌آورد که A + B̄ را به A − B تبدیل می‌کند. این همان جمع‌کننده–تفریق‌کنندهٔ اسلایدهاست، به‌شکل یک مسئلهٔ انتخاب داده.",
  "Logic circuit — one stage, bit i": "مدار منطق — یک طبقه، بیت i",
  "Applied to whole registers": "روی رجیسترهای کامل",
  "The stage above computes one bit pair; n of them in parallel — sharing the same S₁S₀ — give a logic unit for whole registers: AND, OR, XOR or complement, selected per instruction.":
    "طبقهٔ بالا یک جفت بیت را حساب می‌کند؛ n طبقهٔ موازی — با S₁S₀ مشترک — یک واحد منطق برای رجیسترهای کامل می‌سازند: AND، OR، XOR یا مکمل، به‌گزینش هر دستور.",
  "Shift micro-operations on an 8-bit register": "ریزعمل‌های شیفت روی یک رجیستر ۸ بیتی",
  "logical left: 0 (or serial-in) enters at the right": "شیفت منطقی چپ: ۰ (یا ورودی سریال) از راست وارد می‌شود",
  "logical right: 0 (or serial-in) enters at the left": "شیفت منطقی راست: ۰ (یا ورودی سریال) از چپ وارد می‌شود",
  "rotate left: the MSB wraps around to bit 0": "دوران چپ: پرارزش‌ترین بیت (MSB) به بیت ۰ برمی‌گردد",
  "rotate right: bit 0 wraps around to the MSB": "دوران راست: بیت ۰ به پرارزش‌ترین بیت (MSB) برمی‌گردد",
  "arithmetic left: same wires as shl, but overflow matters": "شیفت حسابی چپ: همان سیم‌کشیِ shl، اما سرریز مهم می‌شود",
  "arithmetic right: the sign bit is replicated — signed ÷2": "شیفت حسابی راست: بیت علامت تکرار می‌شود — تقسیم علامت‌دار بر ۲",
  "serial in": "ورودی سریال",
  "Apply to R": "اعمال روی R",
  "Reset R": "بازآدرس R",
  "overflow = R₇ ⊕ R₆ (before the shift) =": "سرریز = R₇ ⊕ R₆ (پیش از شیفت) =",
  "the sign flips, so a signed multiply-by-2 just overflowed.": "علامت برعکس شده؛ پس ضرب علامت‌دار در ۲ سرریز کرد.",
  "The six shifts at a glance": "شش شیفت در یک نگاه",
  "shift in a 0 (or serial-in bit) at the far end": "در انتهای دور یک ۰ (یا بیت ورودی سریال) شیفت می‌شود",
  "rotate: the bit that falls off one end re-enters the other": "دوران: بیتی که از یک سر می‌افتد از سر دیگر برمی‌گردد",
  "multiply by 2 — watch overflow = R₇ ⊕ R₆": "ضرب در ۲ — حواس‌تان به سرریز = R₇ ⊕ R₆ باشد",
  "divide by 2, sign preserved: the MSB copies itself": "تقسیم بر ۲ با حفظ علامت: بیت علامت (MSB) خودش را تکرار می‌کند",
  "Hardware-wise every shift is a row of 2×1 MUXes: one select line chooses “keep” or “take my neighbor”, and the serial inputs at the two ends are wired per operation.":
    "از نظر سخت‌افزار هر شیفت یک ردیف MUX ۲×۱ است: یک خط انتخاب «نگه‌دار» یا «از همسایه بگیر» را برمی‌گزیند و ورودی‌های سریال دو سر، بسته به عملیات سیم می‌شوند.",
  "One stage of the ALU (slide, p.23)": "یک طبقه از ALU (اسلاید، ص ۲۳)",
  "arithmetic circuit": "مدار حساب",
  "logic circuit": "مدار منطق",
  "What the select lines mean": "معنای خطوط انتخاب",
  "Fᵢ comes from": "‏Fᵢ از کجا می‌آید",
  "the arithmetic circuit (Dᵢ)": "مدار حساب (Dᵢ)",
  "the logic circuit (Eᵢ)": "مدار منطق (Eᵢ)",
  "shift right — the neighbor Aᵢ₋₁": "شیفت راست — همسایهٔ Aᵢ₋₁",
  "shift left — the neighbor Aᵢ₊₁": "شیفت چپ — همسایهٔ Aᵢ₊₁",
  "Stack n of these stages side by side and the shared S₃S₂S₁S₀ wires pick, for the whole word, between arithmetic, logic, and both shifts — that bundle is the ALU the datapath in §3.2 keeps calling.":
    "n تا از این طبقه‌ها را کنار هم بچینید؛ سیم‌های مشترک S₃S₂S₁S₀ برای کل واژه بین حساب، منطق و دو شیفت انتخاب می‌کنند — همان دسته‌ای که مسیر داده در §۳٫۲ مدام صدا می‌زند: ALU.",

  /* ── AsmControl ─────────────────────────────────────────── */
  "The three boxes of an ASM chart": "سه جعبهٔ چارت ASM",
  "state box": "جعبهٔ حالت",
  "outputs, one clock": "خروجی‌ها، یک کلاک",
  "decision box": "جعبهٔ تصمیم",
  "tests an input": "یک ورودی را آزمایش می‌کند",
  "conditional": "جعبهٔ",
  "box": "شرطی",
  "Rules of a well-formed chart": "قواعد چارت خوش‌ساخت",
  "A state box may be followed only by a state box or a decision box.": "جعبهٔ حالت فقط می‌تواند به جعبهٔ حالت یا جعبهٔ تصمیم برسد.",
  "A decision box connects to all of its branches.": "جعبهٔ تصمیم به همهٔ شاخه‌هایش وصل است.",
  "A conditional box connects only to a decision box or a state box.": "جعبهٔ شرطی فقط به جعبهٔ تصمیم یا جعبهٔ حالت وصل می‌شود.",
  "Boxes of the conditional and decision kind can never close a loop on themselves.": "جعبه‌های شرطی و تصمیم هرگز نمی‌توانند به خودشان حلقه ببندند.",
  "Every block of an ASM chart contains exactly one state box.": "هر بلوک چارت ASM دقیقاً یک جعبهٔ حالت دارد.",
  "An ASM block starts at one state box and runs through the decisions and conditional outputs until the next state box — one block per clock pulse, exactly like one micro-operation chain per cycle.":
    "یک بلوک ASM از یک جعبهٔ حالت شروع می‌شود و از تصمیم‌ها و خروجی‌های شرطی می‌گذرد تا به جعبهٔ حالت بعدی برسد — در هر پالس کلاک یک بلوک، درست مثل یک زنجیرهٔ ریزعمل در هر سیکل.",
  "The example machine as an ASM chart": "ماشین مثال، به‌شکل چارت ASM",
  "Four state boxes, four decisions on the same input X, one output Z that lives in state M3. The chart and the state table say the same thing twice — the chart just reads like a program.":
    "چهار جعبهٔ حالت، چهار تصمیم روی همان ورودی X و یک خروجی Z که در حالت M3 فعال است. چارت و جدول حالت یک حرف را دوبار می‌زنند — چارت فقط شبیه برنامه خوانده می‌شود.",
  "MUX-based control — flip X, pulse the clock": "کنترل با MUX — X را عوض کنید، کلاک را پالس بدهید",
  "state": "حالت",
  "CLK ↑ (next state)": "‏CLK ↑ (حالت بعد)",
  "State table (present → next)": "جدول حالت (فعلی → بعدی)",
  "present": "فعلی",
  "Why MUXes?": "چرا MUX؟",
  "Each flip-flop needs a Boolean function of (state, X) for its D input. Instead of random logic, a MUX per flip-flop uses the state as the address: the selected input literally is the next-state equation for that state. Change the machine = rewire the MUX inputs, not the gates.":
    "هر فلیپ‌فلاپ برای ورودی D‌اش به یک تابع بولی از (حالت، X) نیاز دارد. به‌جای منطق پراکنده، برای هر فلیپ‌فلاپ یک MUX حالت را آدرس می‌کند: ورودی انتخاب‌شده دقیقاً معادلهٔ حالت بعد برای آن حالت است. تغییر ماشین = سیم‌کشی دوبارهٔ ورودی‌های MUX، نه گیت‌ها.",
  "Here MUX 2 implements D₁ = M₀·0 + M₁·x + M₂·x̄ + M₃·x, and MUX 1 collapses to D₀ = x̄ in every state — exactly the slide's wiring.":
    "اینجا MUX 2 پیاده‌سازیِ D₁ = M₀·0 + M₁·x + M₂·x̄ + M₃·x است و MUX 1 در همهٔ حالت‌ها به D₀ = x̄ ساده می‌شود — دقیقاً سیم‌کشی اسلاید.",
  "Where this leads": "این به کجا می‌رسد",
  "Replace the example machine's four states with the CPU's instruction-cycle states (T₀…T₃) and its X with opcode bits, and you have hardwired control: the same tables, the same MUX trick, one scale up. Microprogrammed control goes one further — it stores those MUX inputs in a control memory.":
    "چهار حالت ماشین مثال را با حالت‌های چرخهٔ دستور CPU (‏T₀…T₃) و X آن را با بیت‌های کد عمل جایگزین کنید؛ کنترل سخت‌افزاری دارید: همان جدول‌ها، همان ترفند MUX، یک پله بزرگ‌تر. کنترل میکروبرنامه‌ای یک قدم جلوتر می‌رود — ورودی‌های MUX را در یک حافظهٔ کنترل ذخیره می‌کند.",
};
export const FA: Record<string, ReactNode> = {
  ...FA_CORE,
  ...FA_LOGIC,
  ...FA_MEMORY,
  ...FA_MISC,
};
