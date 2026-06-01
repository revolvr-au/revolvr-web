import Anthropic from "@anthropic-ai/sdk";

// Model pinned per the TRANCHE Originals spec.
const MODEL = "claude-sonnet-4-20250514";
const MAX_VARIANTS = 3;

/**
 * Generate up to 3 shorter, more provocative, shareable "hook" variants of an
 * Original statement. Returns the original body followed by the variants, so the
 * caller can store all 4 in Post.originalVariants and rotate through them.
 *
 * Degrades gracefully: if ANTHROPIC_API_KEY is unset or the call fails, we return
 * just [body] so creating an Original never depends on the AI being available.
 */
export async function generateOriginalVariants(
  body: string,
  language = "en",
): Promise<string[]> {
  const statement = body.trim();
  if (!statement) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("trancheOriginals: ANTHROPIC_API_KEY unset — storing body only");
    return [statement];
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "You rewrite a social-media statement into punchy alternative hooks. " +
        "Each variant restates the SAME core take but shorter, more provocative, " +
        "and more shareable. Keep the author's meaning and stance — never invert it. " +
        "No hashtags, no emoji, no quotation marks, no numbering. " +
        `Write in the language with ISO code "${language}". ` +
        `Return EXACTLY ${MAX_VARIANTS} variants, one per line, nothing else.`,
      messages: [
        {
          role: "user",
          content: `Statement:\n${statement}`,
        },
      ],
    });

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");

    const variants = text
      .split("\n")
      .map((line) =>
        line
          // strip leading list markers like "1.", "-", "•"
          .replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "")
          .trim(),
      )
      .filter((line) => line.length > 0)
      .slice(0, MAX_VARIANTS);

    // Original first, then the generated hooks. Dedupe defensively.
    const all = [statement, ...variants];
    return Array.from(new Set(all));
  } catch (err) {
    console.warn("trancheOriginals: variant generation failed", err);
    return [statement];
  }
}
