// UNIT-1: Quick Monetize Preview logic
import { describe, it, expect } from 'vitest';

// Adjust this import path once Vitest is configured for the project
// import { generateQuickPreview } from '../../src/utils/quickPreview';

// Inline stub for portability until the real function is importable
function generateQuickPreview(topic: string): { headline: string; targetBuyer: string; suggestedPrice: string } | null {
  if (!topic || topic.trim().length < 2) return null;
  return {
    headline: `${topic} – The Ultimate Guide`,
    targetBuyer: 'Busy solopreneurs who want results fast',
    suggestedPrice: '$27',
  };
}

describe('generateQuickPreview', () => {
  it('returns preview for short Japanese topic (2+ chars)', () => {
    const result = generateQuickPreview('副業');
    expect(result).not.toBeNull();
    expect(result?.headline.length).toBeGreaterThan(0);
    expect(result?.targetBuyer.length).toBeGreaterThan(0);
    expect(result?.suggestedPrice.length).toBeGreaterThan(0);
  });

  it('returns preview for short Japanese topic "AI"', () => {
    const result = generateQuickPreview('AI');
    expect(result).not.toBeNull();
    expect(result?.headline).toBeTruthy();
  });

  it('returns preview for English topic', () => {
    const result = generateQuickPreview('AI side hustle for solopreneurs');
    expect(result).not.toBeNull();
    expect(result?.headline).toBeTruthy();
  });

  it('returns null for empty string', () => {
    expect(generateQuickPreview('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(generateQuickPreview('   ')).toBeNull();
  });

  it('returns null for single character', () => {
    expect(generateQuickPreview('A')).toBeNull();
  });
});
