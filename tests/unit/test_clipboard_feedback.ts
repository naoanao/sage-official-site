// UNIT-3: Clipboard copy feedback
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub copy logic – replace with real import path once module exists
async function copyToClipboard(text: string): Promise<'done' | 'fallback' | 'failed'> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return 'done';
    }
    throw new Error('no clipboard API');
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok ? 'fallback' : 'failed';
    } catch {
      return 'failed';
    }
  }
}

describe('copyToClipboard', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "done" when clipboard API succeeds', async () => {
    const result = await copyToClipboard('Test copy text');
    expect(result).toBe('done');
  });

  it('falls back to execCommand when clipboard API throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
    });
    vi.spyOn(document, 'execCommand').mockReturnValue(true);
    const result = await copyToClipboard('Test fallback');
    expect(result).toBe('fallback');
  });

  it('returns "failed" when both methods fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
    });
    vi.spyOn(document, 'execCommand').mockReturnValue(false);
    const result = await copyToClipboard('Will fail');
    expect(result).toBe('failed');
  });
});
