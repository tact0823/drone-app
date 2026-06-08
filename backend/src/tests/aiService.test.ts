process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-security-tests';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzeAnomaly } from '../services/aiService.js';

describe('analyzeAnomaly (template)', () => {
  it('returns structured analysis without LLM key', async () => {
    const result = await analyzeAnomaly({
      inspectionType: 'SOLAR_PANEL',
      partName: 'パネル列3',
      direction: 'S',
      marker: { x: 0.2, y: 0.3, w: 0.1, h: 0.08 },
    });

    assert.equal(result.source, 'template');
    assert.ok(['HOT_SPOT', 'COLD_SPOT', 'DELAMINATION', 'CRACK', 'OTHER'].includes(result.anomalyType));
    assert.ok(['low', 'medium', 'high'].includes(result.severity));
    assert.match(result.comment, /【所見】/);
    assert.match(result.comment, /【推奨対応】/);
    assert.ok(result.comment.length >= 150);
    assert.ok(result.checkContent);
  });

  it('infers moisture for roof inspection from memo', async () => {
    const result = await analyzeAnomaly({
      inspectionType: 'ROOF',
      partName: '屋根東面',
      memo: '雨漏り兆候あり',
    });

    assert.equal(result.anomalyType, 'MOISTURE');
    assert.equal(result.source, 'template');
  });
});
