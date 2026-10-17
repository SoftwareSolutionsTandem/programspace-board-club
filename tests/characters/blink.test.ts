import { describe, expect, it } from 'vitest';
import { blinkAmount } from '../../src/characters/rig';

describe('моргание', () => {
  it('веко опускается, держится закрытым и поднимается', () => {
    expect(blinkAmount(-1)).toBe(0);
    expect(blinkAmount(0)).toBe(0);
    expect(blinkAmount(35)).toBeCloseTo(0.5);
    expect(blinkAmount(70)).toBe(1);
    expect(blinkAmount(100)).toBe(1);
    expect(blinkAmount(160)).toBeCloseTo(0.5);
    expect(blinkAmount(200)).toBe(0);
  });
  it('без движения — веки просто закрыты на время моргания', () => {
    expect(blinkAmount(10, true)).toBe(1);
    expect(blinkAmount(119, true)).toBe(1);
    expect(blinkAmount(150, true)).toBe(0);
  });
});
