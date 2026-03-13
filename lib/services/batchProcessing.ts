// Batch Processing System
// Analyze multiple audio files simultaneously with progress tracking

import AudioAnalysisService from './audioAnalysisService';
import type { AudioAnalysisResult } from '@/types';

export interface BatchJob {
  id: string;
  files: File[];
  results: Map<string, AudioAnalysisResult>;
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  errors: Map<string, string>;
}

export interface BatchProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  progress: number;
}

export class BatchProcessingService {
  private analysisService: AudioAnalysisService;
  private activeJobs: Map<string, BatchJob> = new Map();
  private maxConcurrent = 3; // Process 3 files at a time

  constructor() {
    this.analysisService = new AudioAnalysisService();
  }

  /**
   * Start batch analysis job
   */
  async startBatchAnalysis(
    files: File[],
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchJob> {
    const jobId = this.generateJobId();

    const job: BatchJob = {
      id: jobId,
      files,
      results: new Map(),
      progress: 0,
      status: 'processing',
      startTime: new Date(),
      errors: new Map(),
    };

    this.activeJobs.set(jobId, job);

    // Process files in batches
    await this.processBatch(job, onProgress);

    job.status = 'completed';
    job.endTime = new Date();
    job.progress = 100;

    return job;
  }

  /**
   * Process files in parallel batches
   */
  private async processBatch(
    job: BatchJob,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<void> {
    const { files } = job;
    let completed = 0;
    let failed = 0;

    // Process in chunks
    for (let i = 0; i < files.length; i += this.maxConcurrent) {
      const chunk = files.slice(i, i + this.maxConcurrent);

      // Process chunk in parallel
      await Promise.all(
        chunk.map(async file => {
          try {
            // Notify progress
            if (onProgress) {
              onProgress({
                jobId: job.id,
                total: files.length,
                completed,
                failed,
                currentFile: file.name,
                progress: (completed / files.length) * 100,
              });
            }

            // Analyze file
            const result = await this.analysisService.analyzeAudio(file);
            job.results.set(file.name, result);
            completed++;

            // Update job progress
            job.progress = (completed / files.length) * 100;
          } catch (error) {
            job.errors.set(file.name, (error as Error).message);
            failed++;
          }
        })
      );
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        jobId: job.id,
        total: files.length,
        completed,
        failed,
        progress: 100,
      });
    }
  }

  /**
   * Get job status
   */
  getJob(jobId: string): BatchJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): BatchJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'failed';
      job.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * Export batch results as JSON
   */
  exportBatchResults(jobId: string): string {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new Error('Job not found');

    const results: Record<string, any> = {};

    job.results.forEach((result, fileName) => {
      results[fileName] = result;
    });

    return JSON.stringify({
      jobId: job.id,
      processedFiles: job.results.size,
      failedFiles: job.errors.size,
      startTime: job.startTime,
      endTime: job.endTime,
      results,
      errors: Object.fromEntries(job.errors),
    }, null, 2);
  }

  /**
   * Export batch results as CSV
   */
  exportBatchResultsCSV(jobId: string): string {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new Error('Job not found');

    const headers = [
      'File Name',
      'Duration (s)',
      'BPM',
      'Key',
      'LUFS',
      'True Peak (dBTP)',
      'Dynamic Range (dB)',
      'Quality Score',
      'Stereo Width (%)',
      'Issues',
    ];

    const rows: string[][] = [headers];

    job.results.forEach((result, fileName) => {
      rows.push([
        fileName,
        result.fileInfo.duration.toFixed(2),
        result.temporal.bpm.toString(),
        result.musical.key,
        result.loudness.integratedLUFS.toFixed(1),
        result.loudness.truePeakMax.toFixed(1),
        result.loudness.dynamicRange.toFixed(1),
        result.quality.qualityScore.toString(),
        result.stereo.stereoWidth.toFixed(0),
        result.quality.issues.length.toString(),
      ]);
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Generate comparison report for batch
   */
  generateBatchReport(jobId: string): string {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new Error('Job not found');

    let report = '=== BATCH ANALYSIS REPORT ===\n\n';

    report += `Job ID: ${job.id}\n`;
    report += `Total Files: ${job.files.length}\n`;
    report += `Successful: ${job.results.size}\n`;
    report += `Failed: ${job.errors.size}\n`;
    report += `Processing Time: ${this.getProcessingTime(job)}\n\n`;

    // Aggregate statistics
    const results = Array.from(job.results.values());

    if (results.length > 0) {
      const avgLUFS = results.reduce((sum, r) => sum + r.loudness.integratedLUFS, 0) / results.length;
      const avgBPM = results.reduce((sum, r) => sum + r.temporal.bpm, 0) / results.length;
      const avgQuality = results.reduce((sum, r) => sum + r.quality.qualityScore, 0) / results.length;

      report += '--- AGGREGATE STATISTICS ---\n';
      report += `Average LUFS: ${avgLUFS.toFixed(1)}\n`;
      report += `Average BPM: ${avgBPM.toFixed(0)}\n`;
      report += `Average Quality Score: ${avgQuality.toFixed(0)}/100\n\n`;

      // Find outliers
      const loudestTrack = results.reduce((max, r) =>
        r.loudness.integratedLUFS > max.loudness.integratedLUFS ? r : max
      );
      const quietestTrack = results.reduce((min, r) =>
        r.loudness.integratedLUFS < min.loudness.integratedLUFS ? r : min
      );

      report += '--- OUTLIERS ---\n';
      report += `Loudest: ${loudestTrack.fileInfo.fileName} (${loudestTrack.loudness.integratedLUFS.toFixed(1)} LUFS)\n`;
      report += `Quietest: ${quietestTrack.fileInfo.fileName} (${quietestTrack.loudness.integratedLUFS.toFixed(1)} LUFS)\n\n`;
    }

    // Individual results
    report += '--- INDIVIDUAL RESULTS ---\n';
    job.results.forEach((result, fileName) => {
      report += `\n${fileName}:\n`;
      report += `  LUFS: ${result.loudness.integratedLUFS.toFixed(1)}\n`;
      report += `  BPM: ${result.temporal.bpm}\n`;
      report += `  Key: ${result.musical.key}\n`;
      report += `  Quality: ${result.quality.qualityScore}/100\n`;

      if (result.quality.issues.length > 0) {
        report += `  Issues: ${result.quality.issues.map(i => i.type).join(', ')}\n`;
      }
    });

    // Errors
    if (job.errors.size > 0) {
      report += '\n--- ERRORS ---\n';
      job.errors.forEach((error, fileName) => {
        report += `${fileName}: ${error}\n`;
      });
    }

    return report;
  }

  /**
   * Get processing time
   */
  private getProcessingTime(job: BatchJob): string {
    if (!job.startTime || !job.endTime) return 'N/A';

    const ms = job.endTime.getTime() - job.startTime.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    Array.from(this.activeJobs.entries()).forEach(([id, job]) => {
      if (job.status === 'completed' || job.status === 'failed') {
        this.activeJobs.delete(id);
      }
    });
  }

  /**
   * Set max concurrent processing
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(10, max));
  }
}

export default BatchProcessingService;
