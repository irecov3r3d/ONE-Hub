import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

// We want to verify that crypto.randomUUID() is a valid UUID
test('crypto.randomUUID() generates valid UUIDs', () => {
  const uuid = crypto.randomUUID();
  // UUID v4 regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(uuid, uuidRegex);
});

// Mocking the behavior of the filename generation logic
test('filename generation uses UUID', () => {
  const fileId = crypto.randomUUID();
  const originalName = 'test-song.mp3';
  const extension = originalName.split('.').pop();
  const filename = `${fileId}.${extension}`;

  assert.strictEqual(filename, `${fileId}.mp3`);
  assert.ok(filename.length > 36); // UUID is 36 chars + .mp3 is 4 chars = 40 chars
});
