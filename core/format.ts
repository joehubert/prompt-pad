export function formatMeta(
  provider: string,
  model: string,
  elapsed: number,
  ttft: number | null,
  completionTokens: number | null,
  totalTokens: number | null,
): string {
  const bits = [`${provider} / ${model}`, `${elapsed.toFixed(2)}s total`];
  if (ttft !== null) bits.push(`${ttft.toFixed(2)}s to first token`);
  if (completionTokens !== null) {
    bits.push(`${completionTokens} out tokens`);
    if (elapsed > 0) bits.push(`${Math.round(completionTokens / elapsed)} tok/s`);
  }
  if (totalTokens !== null) bits.push(`${totalTokens} total`);
  return bits.join("  |  ");
}
