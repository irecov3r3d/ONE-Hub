import test from 'node:test';
import assert from 'node:assert';
import { MASTERING_PRESETS } from '../lib/services/masteringService.ts';

test('MASTERING_PRESETS configuration', async (t) => {
  await t.test('should have all expected presets', () => {
    const expectedPresets = ['streaming', 'club', 'radio', 'audiophile'];
    const actualPresets = Object.keys(MASTERING_PRESETS);
    assert.strictEqual(actualPresets.length, expectedPresets.length);
    expectedPresets.forEach(preset => {
      assert.ok(actualPresets.includes(preset), `Missing preset: ${preset}`);
    });
  });

  await t.test('streaming preset should have correct values', () => {
    assert.deepStrictEqual(MASTERING_PRESETS.streaming, {
      targetLoudness: -14,
      ceilingLevel: -1.0,
      stereoWidth: 0.8,
      addWarmth: true,
      addAnalogCharacter: false,
    });
  });

  await t.test('club preset should have correct values', () => {
    assert.deepStrictEqual(MASTERING_PRESETS.club, {
      targetLoudness: -9,
      ceilingLevel: -0.5,
      stereoWidth: 0.9,
      addWarmth: false,
      addAnalogCharacter: false,
    });
  });

  await t.test('radio preset should have correct values', () => {
    assert.deepStrictEqual(MASTERING_PRESETS.radio, {
      targetLoudness: -11,
      ceilingLevel: -0.3,
      stereoWidth: 0.7,
      addWarmth: true,
      addAnalogCharacter: true,
    });
  });

  await t.test('audiophile preset should have correct values', () => {
    assert.deepStrictEqual(MASTERING_PRESETS.audiophile, {
      targetLoudness: -16,
      ceilingLevel: -2.0,
      stereoWidth: 1.0,
      addWarmth: true,
      addAnalogCharacter: true,
    });
  });
});
