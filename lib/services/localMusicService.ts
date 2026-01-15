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

      console.log(`✅ Generated locally: ${result.id}`);

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
}
