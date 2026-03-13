import test from 'node:test';
import assert from 'node:assert';
import { useStore } from './useStore.ts';

test('store addSong adds a song correctly', (t) => {
  const initialState = useStore.getState();
  const initialSongsCount = initialState.songs.length;

  const testSong = {
    id: 'test-id-' + Date.now(),
    title: 'Test Song',
    prompt: 'A test prompt',
    genre: 'Pop',
    mood: 'Happy',
    duration: 120,
    audioUrl: 'http://example.com/audio.mp3',
    createdAt: new Date().toISOString(),
    metadata: {
      model: 'TestModel',
      qualityScore: 0.9,
      mastered: false,
      refined: false,
      generationTime: 45,
      cost: 0.05,
    },
  };

  useStore.getState().addSong(testSong);
  const updatedState = useStore.getState();

  assert.strictEqual(updatedState.songs.length, initialSongsCount + 1);
  assert.strictEqual(updatedState.songs[0].id, testSong.id);
  assert.strictEqual(updatedState.songs[0].title, testSong.title);
});
