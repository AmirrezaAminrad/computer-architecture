import { Callout, ModuleHeader, Section } from "../components/ui";
import { getModule } from "../lib/theme";
import { useLang } from "../lib/i18n";
import { Adders } from "./logic/Adders";
import { Booth } from "./logic/Booth";
import { Converter } from "./logic/Converter";
import { Gates } from "./logic/Gates";

export default function Logic() {
  const mod = getModule("logic");
  const { t } = useLang();
  return (
    <div>
      <ModuleHeader mod={mod}>
        {t("Every program, picture and song a computer handles is just bit patterns. This module starts at the bottom: how bits encode numbers, how a handful of gates transform them, and how those gates add.")}
      </ModuleHeader>

      <Section
        mod={mod}
        id="numbers"
        num="1.1"
        title={t("Number systems")}
        lead={
          <>
            {t("Hardware has two stable voltage levels, so it counts in")} <strong className="text-ink">{t("base 2")}</strong>. {t("Humans prefer base 10; engineers use")} <strong className="text-ink">{t("base 16")}</strong> {t("as shorthand because one hex digit equals exactly four bits. Type into any box — or click the bits — and watch the others follow.")}
          </>
        }
      >
        <Converter />
        <Callout title={t("Two's complement")} tone="idea">
          {t("To represent negatives, the MSB gets a negative weight (−2ⁿ⁻¹). The payoff: the same adder circuit works for signed and unsigned numbers — only how we interpret the result differs.")}
        </Callout>
      </Section>

      <Section
        mod={mod}
        id="gates"
        num="1.2"
        title={t("Logic gates")}
        lead={t("A gate is a tiny circuit that maps input bits to an output bit. Flip the inputs and watch every gate respond; the highlighted truth-table row tracks your current inputs.")}
      >
        <Gates />
      </Section>

      <Section
        mod={mod}
        id="adders"
        num="1.3"
        title={t("From gates to arithmetic")}
        lead={t("Adding two bits needs two outputs: a sum and a carry. Look at the truth table — Sum is XOR, Carry is AND. Wire those two gates together and you have arithmetic.")}
      >
        <Adders />
      </Section>

      <Section
        mod={mod}
        id="booth"
        num="1.4"
        title={t("Multiplying in hardware: Booth's algorithm")}
        lead={t("Adders alone can multiply, but a naive loop adds on every set bit. Booth's algorithm reads the multiplier in runs — +B when entering a run of 1s, −B when leaving it — and shifts its way to a signed product in eight identical cycles.")}
      >
        <Booth />
      </Section>
    </div>
  );
}
