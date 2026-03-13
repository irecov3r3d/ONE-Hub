// Storage Utilities - Save analysis history and compare over time
// Uses localStorage for persistence (can be upgraded to cloud storage)

import type { AudioAnalysisResult } from '@/types';

export interface StoredAnalysis {
  id: string;
  timestamp: Date;
  fileName: string;
  analysis: AudioAnalysisResult;
  tags?: string[];
  notes?: string;
}

export class AnalysisStorageService {
  private readonly STORAGE_KEY = 'audio_analysis_history';
  private readonly MAX_STORED = 100; // Store max 100 analyses

  /**
   * Save analysis to storage
   */
  saveAnalysis(
    fileName: string,
    analysis: AudioAnalysisResult,
    tags?: string[],
    notes?: string
  ): StoredAnalysis {
    const stored: StoredAnalysis = {
      id: this.generateId(),
      timestamp: new Date(),
      fileName,
      analysis,
      tags,
      notes,
    };

    const history = this.getHistory();
    history.unshift(stored);

    // Limit storage
    if (history.length > this.MAX_STORED) {
      history.splice(this.MAX_STORED);
    }

    this.saveHistory(history);
    return stored;
  }

  /**
   * Get all stored analyses
   */
  getHistory(): StoredAnalysis[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch (parseError) {
        console.error('Failed to parse stored analysis history - corrupted data detected:', parseError);

        // Attempt to backup corrupted data before clearing
        try {
          const backupKey = `${this.STORAGE_KEY}_corrupted_${Date.now()}`;
          localStorage.setItem(backupKey, data);
          console.warn(`Corrupted data backed up to: ${backupKey}`);
        } catch (backupError) {
          console.error('Could not backup corrupted data:', backupError);
        }

        // Clear corrupted data
        localStorage.removeItem(this.STORAGE_KEY);
        throw new Error('Analysis history data is corrupted and has been cleared. A backup was created if storage allowed.');
      }

      // Validate data structure
      if (!Array.isArray(parsed)) {
        console.error('Stored analysis history is not an array:', typeof parsed);
        localStorage.removeItem(this.STORAGE_KEY);
        throw new Error('Analysis history data structure is invalid and has been cleared.');
      }

      // Convert and validate each item
      const validItems: StoredAnalysis[] = [];
      for (let i = 0; i < parsed.length; i++) {
        try {
          const item = parsed[i];

          // Validate required fields
          if (!item.id || !item.fileName || !item.analysis) {
            console.warn(`Skipping invalid history item at index ${i}: missing required fields`);
            continue;
          }

          validItems.push({
            ...item,
            timestamp: new Date(item.timestamp),
          });
        } catch (itemError) {
          console.warn(`Skipping invalid history item at index ${i}:`, itemError);
          continue;
        }
      }

      // If we filtered out items, save the cleaned data
      if (validItems.length < parsed.length) {
        console.warn(`Cleaned ${parsed.length - validItems.length} invalid items from history`);
        this.saveHistory(validItems);
      }

      return validItems;
    } catch (error) {
      console.error('Error loading history:', error);

      // If error was thrown by our validation, re-throw with context
      if (error instanceof Error && error.message.includes('corrupted')) {
        throw error;
      }

      return [];
    }
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): StoredAnalysis | undefined {
    const history = this.getHistory();
    return history.find(item => item.id === id);
  }

  /**
   * Delete analysis
   */
  deleteAnalysis(id: string): boolean {
    const history = this.getHistory();
    const index = history.findIndex(item => item.id === id);

    if (index !== -1) {
      history.splice(index, 1);
      this.saveHistory(history);
      return true;
    }

    return false;
  }

  /**
   * Update analysis tags/notes
   */
  updateAnalysis(id: string, updates: { tags?: string[]; notes?: string }): boolean {
    const history = this.getHistory();
    const item = history.find(item => item.id === id);

    if (item) {
      if (updates.tags) item.tags = updates.tags;
      if (updates.notes !== undefined) item.notes = updates.notes;
      this.saveHistory(history);
      return true;
    }

    return false;
  }

  /**
   * Search analyses
   */
  searchAnalyses(query: string): StoredAnalysis[] {
    const history = this.getHistory();
    const lowerQuery = query.toLowerCase();

    return history.filter(item =>
      item.fileName.toLowerCase().includes(lowerQuery) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      item.notes?.toLowerCase().includes(lowerQuery) ||
      item.analysis.musical.key.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get analyses by date range
   */
  getAnalysesByDateRange(startDate: Date, endDate: Date): StoredAnalysis[] {
    const history = this.getHistory();

    return history.filter(item =>
      item.timestamp >= startDate && item.timestamp <= endDate
    );
  }

  /**
   * Compare two analyses
   */
  compareAnalyses(id1: string, id2: string): {
    analysis1: StoredAnalysis;
    analysis2: StoredAnalysis;
    differences: any;
  } | null {
    const analysis1 = this.getAnalysis(id1);
    const analysis2 = this.getAnalysis(id2);

    if (!analysis1 || !analysis2) return null;

    const differences = {
      loudness: {
        lufsDiff: analysis1.analysis.loudness.integratedLUFS - analysis2.analysis.loudness.integratedLUFS,
        dynamicRangeDiff: analysis1.analysis.loudness.dynamicRange - analysis2.analysis.loudness.dynamicRange,
      },
      tempo: {
        bpmDiff: analysis1.analysis.temporal.bpm - analysis2.analysis.temporal.bpm,
      },
      stereo: {
        widthDiff: analysis1.analysis.stereo.stereoWidth - analysis2.analysis.stereo.stereoWidth,
      },
      quality: {
        scoreDiff: analysis1.analysis.quality.qualityScore - analysis2.analysis.quality.qualityScore,
      },
    };

    return {
      analysis1,
      analysis2,
      differences,
    };
  }

  /**
   * Export history as JSON
   */
  exportHistory(): string {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(json: string): boolean {
    try {
      if (!json || json.trim().length === 0) {
        throw new Error('Cannot import empty data');
      }

      let imported: any;
      try {
        imported = JSON.parse(json);
      } catch (parseError) {
        throw new Error(`Invalid JSON format: ${(parseError as Error).message}`);
      }

      if (!Array.isArray(imported)) {
        throw new Error('Import data must be an array of analyses');
      }

      // Validate each item before importing
      const validItems: StoredAnalysis[] = [];
      for (let i = 0; i < imported.length; i++) {
        const item = imported[i];

        if (!item.id || !item.fileName || !item.analysis) {
          console.warn(`Skipping invalid import item at index ${i}: missing required fields`);
          continue;
        }

        try {
          validItems.push({
            ...item,
            timestamp: new Date(item.timestamp),
          });
        } catch (conversionError) {
          console.warn(`Skipping item at index ${i} due to conversion error:`, conversionError);
          continue;
        }
      }

      if (validItems.length === 0) {
        throw new Error('No valid items found in import data');
      }

      this.saveHistory(validItems);

      if (validItems.length < imported.length) {
        console.warn(`Imported ${validItems.length}/${imported.length} items (${imported.length - validItems.length} invalid items skipped)`);
      }

      return true;
    } catch (error) {
      console.error('Error importing history:', error);
      throw new Error(`Failed to import history: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get storage stats
   */
  getStorageStats(): {
    totalAnalyses: number;
    oldestDate: Date | null;
    newestDate: Date | null;
    totalSize: number;
  } {
    const history = this.getHistory();

    return {
      totalAnalyses: history.length,
      oldestDate: history.length > 0 ? history[history.length - 1].timestamp : null,
      newestDate: history.length > 0 ? history[0].timestamp : null,
      totalSize: this.getStorageSize(),
    };
  }

  /**
   * Get storage size in bytes
   */
  private getStorageSize(): number {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? new Blob([data]).size : 0;
  }

  /**
   * Save history to storage
   */
  private saveHistory(history: StoredAnalysis[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving history:', error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Remove oldest entries and try again
        history.splice(Math.floor(history.length / 2));
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
          console.error('Still cannot save after cleanup:', e);
        }
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AnalysisStorageService;
