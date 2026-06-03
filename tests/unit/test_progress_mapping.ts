// UNIT-2: Progress stage → percentage mapping
import { describe, it, expect } from 'vitest';

type Stage = 'idle' | 'researching' | 'drafting' | 'formatting' | 'finalizing' | 'done' | 'error';

// Stub – replace with real import when available
function mapStageToProgress(stage: Stage): { percent: number; label: string } {
  const map: Record<Stage, { percent: number; label: string }> = {
    idle:        { percent: 0,   label: 'Ready' },
    researching: { percent: 20,  label: 'Researching market...' },
    drafting:    { percent: 50,  label: 'Drafting content...' },
    formatting:  { percent: 70,  label: 'Formatting sections...' },
    finalizing:  { percent: 90,  label: 'Finalizing product...' },
    done:        { percent: 100, label: 'Done!' },
    error:       { percent: 0,   label: 'Error occurred' },
  };
  return map[stage];
}

describe('mapStageToProgress', () => {
  const runningStages: Stage[] = ['researching', 'drafting', 'formatting', 'finalizing'];

  runningStages.forEach((stage) => {
    it(`stage "${stage}" maps to valid percent and non-empty label`, () => {
      const { percent, label } = mapStageToProgress(stage);
      expect(percent).toBeGreaterThan(0);
      expect(percent).toBeLessThanOrEqual(100);
      expect(label.trim().length).toBeGreaterThan(0);
    });
  });

  it('done stage returns 100%', () => {
    expect(mapStageToProgress('done').percent).toBe(100);
  });

  it('error stage percent is not negative', () => {
    const { percent } = mapStageToProgress('error');
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it('error stage label is not empty', () => {
    expect(mapStageToProgress('error').label.trim().length).toBeGreaterThan(0);
  });
});
