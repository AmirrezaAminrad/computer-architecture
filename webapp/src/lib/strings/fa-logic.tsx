import type { ReactNode } from "react";

/** Farsi strings for Module 01 (Logic) — Logic.tsx + logic/*.tsx */
export const FA_LOGIC: Record<string, ReactNode> = {
  /* ── Logic.tsx ──────────────────────────────────────────── */
  "Every program, picture and song a computer handles is just bit patterns. This module starts at the bottom: how bits encode numbers, how a handful of gates transform them, and how those gates add.":
    "هر برنامه، تصویر و آهنگی که کامپیوتر با آن سروکار دارد فقط الگویی از بیت‌هاست. این ماژول از پایین شروع می‌کند: بیت‌ها چگونه عددها را کد می‌کنند، چگونه چند گیت آن‌ها را تبدیل می‌کنند، و آن گیت‌ها چگونه جمع می‌کنند.",
  "Number systems": "سیستم‌های عددی",
  "Hardware has two stable voltage levels, so it counts in":
    "سخت‌افزار فقط دو سطح ولتاژ پایدار دارد، پس در",
  "base 2": "مبنای ۲",
  "Humans prefer base 10; engineers use": "می‌شمارد. انسان‌ها مبنای ۱۰ را می‌پسندند؛ مهندسان از",
  "base 16": "مبنای ۱۶",
  "as shorthand because one hex digit equals exactly four bits. Type into any box — or click the bits — and watch the others follow.":
    "به‌عنوان خلاصه‌نویسی استفاده می‌کنند، چون هر رقم هگزادسیمال دقیقاً چهار بیت است. در هر کادر تایپ کنید — یا روی بیت‌ها کلیک کنید — و ببینید بقیه دنبال می‌آیند.",
  "Two's complement": "مکمل دو",
  "To represent negatives, the MSB gets a negative weight (−2ⁿ⁻¹). The payoff: the same adder circuit works for signed and unsigned numbers — only how we interpret the result differs.":
    "برای نمایش عددهای منفی، پرارزش‌ترین بیت (MSB) وزنِ منفی می‌گیرد (−2ⁿ⁻¹). نتیجه: همان مدار جمع‌کننده هم برای عددهای علامت‌دار کار می‌کند هم بی‌علامت — فقط تفسیر ما از نتیجه فرق می‌کند.",
  "Logic gates": "گیت‌های منطقی",
  "A gate is a tiny circuit that maps input bits to an output bit. Flip the inputs and watch every gate respond; the highlighted truth-table row tracks your current inputs.":
    "گیت مدار کوچکی است که بیت‌های ورودی را به یک بیت خروجی نگاشت می‌کند. ورودی‌ها را عوض کنید و واکنش هر گیت را ببینید؛ سطر پررنگ‌شدهٔ جدول درستی ورودی‌های فعلی شما را نشان می‌دهد.",
  "From gates to arithmetic": "از گیت‌ها تا حساب",
  "Adding two bits needs two outputs: a sum and a carry. Look at the truth table — Sum is XOR, Carry is AND. Wire those two gates together and you have arithmetic.":
    "جمع دو بیت دو خروجی می‌خواهد: حاصل جمع و رقم نقلی. جدول درستی را ببینید — حاصل جمع همان XOR است و رقم نقلی همان AND. این دو گیت را به هم وصل کنید تا مدار جمع‌کننده بسازید.",
  "Multiplying in hardware: Booth's algorithm": "ضرب در سخت‌افزار: الگوریتم بوث",
  "Adders alone can multiply, but a naive loop adds on every set bit. Booth's algorithm reads the multiplier in runs — +B when entering a run of 1s, −B when leaving it — and shifts its way to a signed product in eight identical cycles.":
    "جمع‌کننده‌ها به‌تنهایی هم می‌توانند ضرب کنند، اما حلقهٔ ساده روی هر بیتِ ۱ یک جمع انجام می‌دهد. الگوریتم بوث ضریب را در «دنباله‌ها» می‌خواند — هنگام ورود به دنبالهٔ ۱ها +B و هنگام خروج −B — و با هشت سیکلِ یکسان با شیفت‌زدن به حاصل‌ضرب علامت‌دار می‌رسد.",

  /* ── Gates.tsx ──────────────────────────────────────────── */
  "1 only when both inputs are 1": "فقط وقتی هر دو ورودی ۱ باشند، ۱",
  "1 when at least one input is 1": "وقتی دست‌کم یک ورودی ۱ باشد، ۱",
  "Inverts its single input": "تک‌ورودی خود را وارون می‌کند",
  "1 when the inputs differ": "وقتی ورودی‌ها نابرابر باشند، ۱",
  "AND, inverted — a universal gate": "AND وارون‌شده — گیت جهان‌شمول",
  "OR, inverted — also universal": "OR وارون‌شده — این هم جهان‌شمول",
  "Out": "خروجی",
  "Shared inputs": "ورودی‌های مشترک",
  "Input A = {v}": "ورودی A = {v}",
  "Input B = {v}": "ورودی B = {v}",
  "drives all six gates": "به هر شش گیت می‌رسد",
  "NOT ignores B": "‏NOT از B صرف‌نظر می‌کند",
  "You can also click the switches drawn inside each gate. The highlighted truth-table row is the one you're currently in.":
    "می‌توانید روی کلیدهای داخل هر گیت هم کلیک کنید. سطر پررنگ‌شدهٔ جدول درستی همان است که اکنون در آن هستید.",
  "Why NAND and NOR are special": "چرا NAND و NOR خاص‌اند",
  "Every other gate can be built from NAND alone (or from NOR alone):":
    "هر گیت دیگری را می‌توان فقط با NAND (یا فقط با NOR) ساخت:",
  ", and AND is a NAND followed by that NOT. Real chips are built from CMOS transistors, where NAND and NOR are the natural, cheapest single-stage gates.":
    "؛ و AND همان NAND است به‌دنبال آن NOT. تراشه‌های واقعی از ترانزیستورهای CMOS ساخته می‌شوند که در آن‌ها NAND و NOR گیت‌های طبیعی و ارزان‌ترین تک‌مرحله‌ای‌اند.",

  /* ── Converter.tsx ──────────────────────────────────────── */
  "Base converter": "مبدل مبنا",
  "4-bit": "۴ بیتی",
  "8-bit": "۸ بیتی",
  "16-bit": "۱۶ بیتی",
  "Binary": "دودویی",
  "Decimal": "دهدهی",
  "Hexadecimal": "هگزادسیمال",
  "Binary digits are only 0 and 1.": "ارقام دودویی فقط ۰ و ۱ هستند.",
  "Needs more than {w} bits.": "بیش از {w} بیت لازم دارد.",
  "Hex digits are 0–9 and A–F.": "ارقام هگزادسیمال 0–9 و A–F هستند.",
  "Exceeds {w}-bit range (max {max}).": "از گنجایش {w} بیتی فراتر می‌رود (بیشینهٔ {max}).",
  "Decimal digits are 0–9 (a leading − means two's complement).":
    "ارقام دهدهی 0–9 هستند (− اول به معنای مکمل دو است).",
  "Below the signed minimum ({min}).": "کمتر از کمینهٔ علامت‌دار ({min}).",
  "Click any bit, type in any field, or try an operation below.":
    "روی هر بیتی کلیک کنید، در هر کادری تایپ کنید یا عملیات‌های زیر را امتحان کنید.",
  "Click a bit to flip it · each bit is worth a power of two":
    "برای برعکس‌کردن روی هر بیت کلیک کنید · ارزش هر بیت یک توانِ دو است",
  "Flipped bit {idx} (worth {pow}) → value {sign}{pow}.":
    "بیت {idx} (ارزش {pow}) برعکس شد ← مقدار {sign}{pow}.",
  "bit {idx} is {v}": "بیت {idx} برابر {v}",
  "Each group of 4 bits (a nibble) is exactly one hex digit — that's why hex exists.":
    "هر گروه ۴ بیتی (یک نیبل) دقیقاً یک رقم هگزادسیمال است — دلیلِ وجودِ hex همین است.",
  "Unsigned": "بی‌علامت",
  "Signed (two's complement)": "علامت‌دار (مکمل دو)",
  "range {min} … {max} · MSB = {msb}": "گسترهٔ {min} … {max} · MSB = {msb}",
  "non-negative": "نامنفی",
  "Bit pattern": "الگوی بیت",
  "non-printable": "چاپ‌ناپذیر",
  "{w} bits": "{w} بیت",
  "the same 8 bits can be a number or a character": "همین ۸ بیت می‌تواند عدد باشد یا نویسه",
  "the same bits mean what the program says they mean": "معنای همین بیت‌ها هر چیزی است که برنامه بگوید",
  "Try": "امتحان کنید",
  "Negate": "منفی‌کردن",
  "Cleared.": "پاک شد.",
  "What just happened": "چه اتفاقی افتاد؟",
  "NOT flips every bit (one's complement).": "‏NOT هر بیت را برعکس می‌کند (مکمل یک).",
  "Unsigned overflow: all-ones + 1 wraps to 0 (carry-out is discarded).":
    "سرریز بی‌علامت: همه‌یک + ۱ به ۰ برمی‌گردد (رقم نقلی خروجی دور ریخته می‌شود).",
  "Adding 1 ripples a carry through the trailing 1s.":
    "جمع ۱، رقم نقلی را از میان ۱های انتهایی عبور می‌دهد.",
  "Signed overflow! +{x} + 1 becomes {y} — the sign bit flipped without a carry-out.":
    "سرریز علامت‌دار! ‏+{x} + ۱ می‌شود {y} — بیت علامت برعکس شده، بی‌آنکه رقم نقلی خروجی داشته باشیم.",
  "Unsigned underflow: 0 − 1 wraps to all-ones (which is −1 in two's complement).":
    "سرریز منفی بی‌علامت: 0 − 1 به همه‌یک برمی‌گردد (که در مکمل دو یعنی −1).",
  "Subtracting 1 borrows through the trailing 0s.":
    "کم‌کردن ۱ از میان ۰های انتهایی قرض می‌گیرد.",
  "Signed overflow! {x} − 1 wraps around to +{y}.":
    "سرریز علامت‌دار! {x} − ۱ به +{y} برمی‌گردد.",
  "Shift left ×2 — but the top bit fell off the end (overflow).":
    "شیفت چپ ×۲ — اما بیتِ بالا از انتها افتاد (سرریز).",
  "Shift left multiplies by 2: every bit moves up one place value.":
    "شیفت چپ در ۲ ضرب می‌کند: هر بیت یک درجه ارزشِ مکانی بالا می‌رود.",
  "Logical shift right ÷2 (floor): every bit moves down one place; a 0 enters at the top.":
    "شیفت راست منطقی ÷۲ (گرد به پایین): هر بیت یک درجه پایین می‌رود؛ از بالا ۰ وارد می‌شود.",
  "Two's-complement negate: invert all bits, then add 1. ({x} → {y})":
    "منفی‌کردن به روش مکمل دو: همهٔ بیت‌ها را وارون کن، بعد ۱ اضافه کن. ({x} → {y})",
  "Note: the most-negative number is its own negation!":
    "توجه: منفی‌ترین عدد، منفیِ خودش است!",

  /* ── Adders.tsx ─────────────────────────────────────────── */
  "Four full adders chained: each one's": "چهار تمام‌جمع‌کننده پشت‌سرهم:",
  "feeds the next one's": "خروجیِ هر یک تغذیه‌کنندهٔ",
  "unsigned": "بی‌علامت",
  "signed": "علامت‌دار",
  "Animate carry ripple": "انیمیشن انتشار رقم نقلی",
  "bit {i}": "بیت {i}",
  "carry in": "رقم نقلی ورودی",
  "(true sum {s} doesn't fit)": "(جمع واقعی {s} جا نمی‌شود)",
  "(true sum {s} doesn't fit in 4 bits)": "(جمع واقعی {s} در ۴ بیت جا نمی‌شود)",
  "Result": "نتیجه",
  "C · carry-out": "C · رقم نقلی خروجی",
  "V · overflow": "V · سرریز",
  "unsigned overflow": "سرریز بی‌علامت",
  "signed overflow (Cout ≠ carry into MSB)": "سرریز علامت‌دار (Cout ≠ رقم نقلیِ ورودی به MSB)",
  "SET": "۱",
  "clear": "۰",
  "Half adder": "نیم‌جمع‌کننده",
  "Full adder": "تمام‌جمع‌کننده",
  "4-bit ripple-carry": "۴ بیتی، رقم نقلی موجی",
  "Adds two bits. Can't accept a carry-in, so it can only be the lowest bit.":
    "دو بیت را جمع می‌کند. رقم نقلی ورودی نمی‌پذیرد، پس فقط می‌تواند کم‌ارزش‌ترین بیت باشد.",
  "Adds two bits plus a carry-in: two half adders and an OR gate.":
    "دو بیت به‌علاوهٔ رقم نقلی ورودی را جمع می‌کند: دو نیم‌جمع‌کننده و یک گیت OR.",
  "Chain n full adders to add n-bit numbers.": "n تمام‌جمع‌کننده را زنجیر کنید تا عددهای n بیتی را جمع بزنید.",
  "4-bit ripple-carry adder": "جمع‌کنندهٔ ۴ بیتی با رقم نقلی موجی",
  "Arithmetic emerges from logic": "حساب از دل منطق بیرون می‌آید",
  "Nothing above \u201cknows\u201d what addition is. The sum bit is XOR (1 when an odd number of inputs are 1) and the carry is AND/OR (1 when two or more are). A CPU's ALU is this idea scaled up — plus a few multiplexers to choose between operations.":
    "هیچ‌کدام از مدارهای بالا «نمی‌دانند» جمع چیست. بیتِ جمع XOR است (وقتی تعداد فرد ورودی‌ها ۱ باشد) و رقم نقلی AND/OR (وقتی دو یا بیشتر باشند). ALUِ یک CPU همین ایده در مقیاس بزرگ است — به‌علاوه چند مالتی‌پلکسر برای انتخاب عملیات.",
  "The catch: the MSB's sum can't settle until the carry has rippled through every stage, so delay grows linearly with width. That's why real ALUs use carry-lookahead or prefix adders.":
    "اما یک مشکل: جمعِ پرارزش‌ترین بیت تا وقتی رقم نقلی از همهٔ طبقه‌ها عبور نکند جا نمی‌افتد، پس تأخیر با عرض مدار خطی رشد می‌کند. به همین دلیل ALUهای واقعی از رقم نقلی پیش‌بین (carry-lookahead) یا جمع‌کننده‌های پیشوندی استفاده می‌کنند.",
  "Half adder = XOR + AND": "نیم‌جمع‌کننده = XOR + AND",
  "Full adder = 2 × half adder + OR": "تمام‌جمع‌کننده = ۲ × نیم‌جمع‌کننده + OR",
  "(binary)": "(دودویی)",

  /* ── Booth.tsx ──────────────────────────────────────────── */
  "Booth's algorithm — signed multiplication, step by step":
    "الگوریتم بوث — ضرب علامت‌دار، گام‌به‌گام",
  "The adders above can add; multiplying naively would add on every 1 bit — up to 8 additions. Booth's insight: look at the":
    "جمع‌کننده‌های بالا جمع می‌کنند؛ ضربِ ساده روی هر بیت ۱ یک جمع بود — تا ۸ جمع. نکتهٔ بوث: به",
  "transitions": "گذارها",
  "Entering a run of 1s means": "نگاه کنید. ورود به دنبالهٔ ۱ها یعنی",
  ", leaving it means": "و خروج از آن یعنی",
  "(because a run like 01110 = 10000 − 10). Hardware just repeats one micro-step, shown live below.":
    "(چون دنباله‌ای مثل 01110 = 10000 − 10 است). سخت‌افزار فقط یک ریزگام را تکرار می‌کند — همان‌جا پایین، زنده.",
  "B · multiplicand": "B · ضرب‌شونده",
  "Q · multiplier": "Q · ضریب",
  "last out": "آخرین خروجی",
  "steps left": "گام باقی‌مانده",
  "Done — 8 steps. Product is in A‖Q.": "تمام — ۸ گام. حاصل‌ضرب در A‖Q است.",
  "Next: look at Q₀Q₋₁ =": "بعدی: به Q₀Q₋₁ نگاه کن =",
  "no add": "بدون جمع",
  "then shift right one place.": "بعد یک خانه به راست شیفت بده.",
  "Step ▸": "گام ▸",
  "◂ Back": "◂ بازگشت",
  "▶ Play": "▶ پخش",
  "Done": "تمام",
  "Product (A‖Q)": "حاصل‌ضرب (A‖Q)",
  "True product": "حاصل‌ضرب واقعی",
  "Booth agrees ✓": "بوث تأیید می‌کند ✓",
  "mismatch": "ناهمخوانی",
  "Trace — one row per cycle": "ردیابی — در هر سیکل یک سطر",
  "op": "عملیات",
  "Each row is after the add/subtract and the arithmetic shift. Watch Q empty from the right while the product fills A‖Q; Q₋₁ remembers the bit that just fell out.":
    "هر سطر پس از جمع/تفریق و شیفت حسابی است. ببینید Q از راست خالی می‌شود در حالی که حاصل‌ضرب A‖Q را پر می‌کند؛ Q₋₁ بیتی را که تازه افتاده به یاد دارد.",
  "Why hardware likes Booth": "چرا سخت‌افزار بوث را دوست دارد",
  "Worst case is the same 8 operations, but typical operands win big:":
    "بدترین حالت همان ۸ عملیات است، اما عملوندهای معمولی سود بزرگی دارند:",
  "has a single run of 1s → one +B and one −B instead of four additions.":
    "فقط یک دنبالهٔ ۱ دارد → یک +B و یک −B به‌جای چهار جمع.",
  "Real multipliers go further —": "ضرب‌کننده‌های واقعی جلوتر می‌روند —",
  "radix-4 Booth": "بوث پایه‌۴",
  "examines two multiplier bits at a time and halves the cycles. This is exactly the circuit inside the ALU the CPU module executes.":
    "هر بار دو بیت ضریب را بررسی می‌کند و سیکل‌ها را نصف می‌کند. این دقیقاً همان مداری است که ماژول CPU هنگام اجرا در ALU به کار می‌برد.",
};
