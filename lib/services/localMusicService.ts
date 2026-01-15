/**
 * Local Music Generation Service
 * Connects to local Python MusicGen server (FREE!)
 */

export class LocalMusicService {
  private static LOCAL_SERVER = process.env.LOCAL_MUSIC_SERVER || 'http://localhost:8000';

  /**
   * Check if local server is running
   */
  static async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.LOCAL_SERVER}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate music using local MusicGen server
   */
  static async generate(params: {
    prompt: string;
    genre: string;
    mood: string;
    duration: number;
  }): Promise<string> {
    // Check if server is running
    const available = await this.isServerAvailable();
    if (!available) {
      throw new Error(
        'Local music server not running. Start it with: cd music-gen-server && python server.py'
      );
    }

    console.log('🎵 Generating with local MusicGen server...');

    // Enhanced prompt for better results
    const enhancedPrompt = this.buildPrompt(params);

    try {
      const response = await fetch(`${this.LOCAL_SERVER}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          genre: params.genre,
          mood: params.mood,
          duration: params.duration,
          model_size: 'small', // Can make this configurable
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Local server error: ${error}`);
      }

      const result = await response.json();

      if (result.status !== 'completed' || !result.audio_url) {
        throw new Error('Generation failed or incomplete');
      }

      // Return full URL to the audio file
      const audioUrl = `${this.LOCAL_SERVER}${result.audio_url}`;

      // Log cache status
      if (result.cached) {
        console.log(`🎉 Cache HIT! Returned instantly (saved ${result.generation_time.toFixed(1)}s)`);
      } else {
        console.log(`✅ Generated locally: ${result.id} (${result.generation_time.toFixed(1)}s)`);
      }

      return audioUrl;

    } catch (error) {
      console.error('❌ Local generation failed:', error);
      throw error;
    }
  }

  /**
   * Build enhanced prompt for better music generation
   */
  private static buildPrompt(params: {
    prompt: string;
    genre: string;
    mood: string;
  }): string {
    const { prompt, genre, mood } = params;

    // Combine user prompt with genre and mood
    const parts = [
      prompt,
      genre.toLowerCase(),
      mood.toLowerCase(),
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Get server info
   */
  static async getServerInfo(): Promise<{
    status: string;
    device: string;
    models: string[];
  }> {
    try {
      const response = await fetch(`${this.LOCAL_SERVER}/`, {
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        throw new Error('Server not responding');
      }

      return await response.json();
    } catch (error) {
      throw new Error('Local music server is not running');
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    total_songs_cached: number;
    cache_hits: number;
    cache_misses: number;
    hit_rate_percent: number;
    total_generations: number;
    time_saved_seconds: number;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.LOCAL_SERVER}/stats`);

      if (!response.ok) {
        throw new Error('Failed to fetch cache stats');
      }

      return await response.json();
    } catch (error) {
      throw new Error('Could not retrieve cache statistics');
    }
  }

  /**
   * Get recently generated songs from library
   */
  static async getLibrary(limit: number = 20): Promise<{
    songs: Array<{
      id: number;
      prompt: string;
      genre: string;
      mood: string;
      duration: number;
      audio_path: string;
      created_at: string;
      access_count: number;
    }>;
    total: number;
  }> {
    try {
      const response = await fetch(`${this.LOCAL_SERVER}/library?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch library');
      }

      return await response.json();
    } catch (error) {
      throw new Error('Could not retrieve song library');
    }
  }
}
