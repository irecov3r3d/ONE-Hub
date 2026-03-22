// Reference Track Matching System
// Compare your track against professional references and get specific mastering recommendations

import type {
  AudioAnalysisResult,
  MasteringSettings,
  EQSuggestion,
  CompressionSuggestion,
  LimitingSuggestion,
} from '@/types';

export interface ReferenceComparison {
  targetAnalysis: AudioAnalysisResult;
  referenceAnalysis: AudioAnalysisResult;
  differences: TrackDifferences;
  matchingPreset: MasteringSettings;
  actionPlan: MasteringAction[];
  overallSimilarity: number; // 0-100%
}

export interface TrackDifferences {
  loudness: LoudnessDifference;
  frequency: FrequencyDifference[];
  stereo: StereoDifference;
  dynamics: DynamicsDifference;
  tonal: TonalDifference;
}

export interface LoudnessDifference {
  lufsDiff: number; // Target - Reference (negative = quieter)
  peakDiff: number;
  dynamicRangeDiff: number;
  recommendation: string;
}

export interface FrequencyDifference {
  band: string;
  targetPercentage: number;
  referencePercentage: number;
  difference: number; // %
  suggestedAdjustment: string;
}

export interface StereoDifference {
  widthDiff: number; // %
  correlationDiff: number;
  recommendation: string;
}

export interface DynamicsDifference {
  crestFactorDiff: number;
  compressionNeeded: boolean;
  recommendation: string;
}

export interface TonalDifference {
  brightnessDiff: number; // Spectral centroid difference
  recommendation: string;
}

export interface MasteringAction {
  step: number;
  category: 'EQ' | 'Compression' | 'Limiting' | 'Stereo' | 'Other';
  action: string;
  parameters?: Record<string, any>;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class ReferenceMatchingService {
  /**
   * Compare target track against reference and generate matching recommendations
   */
  compareToReference(
    targetAnalysis: AudioAnalysisResult,
    referenceAnalysis: AudioAnalysisResult
  ): ReferenceComparison {
    // Analyze differences
    const differences = this.analyzeDifferences(targetAnalysis, referenceAnalysis);

    // Generate matching preset
    const matchingPreset = this.generateMatchingPreset(differences, referenceAnalysis);

    // Create action plan
    const actionPlan = this.createActionPlan(differences);

    // Calculate overall similarity
    const overallSimilarity = this.calculateSimilarity(targetAnalysis, referenceAnalysis);

    return {
      targetAnalysis,
      referenceAnalysis,
      differences,
      matchingPreset,
      actionPlan,
      overallSimilarity,
    };
  }

  /**
   * Analyze all differences between tracks
   */
  private analyzeDifferences(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): TrackDifferences {
    const loudness = this.compareLoudness(target, reference);
    const frequency = this.compareFrequency(target, reference);
    const stereo = this.compareStereo(target, reference);
    const dynamics = this.compareDynamics(target, reference);
    const tonal = this.compareTonal(target, reference);

    return {
      loudness,
      frequency,
      stereo,
      dynamics,
      tonal,
    };
  }

  /**
   * Compare loudness characteristics
   */
  private compareLoudness(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): LoudnessDifference {
    const lufsDiff = target.loudness.integratedLUFS - reference.loudness.integratedLUFS;
    const peakDiff = target.loudness.truePeakMax - reference.loudness.truePeakMax;
    const dynamicRangeDiff = target.loudness.dynamicRange - reference.loudness.dynamicRange;

    let recommendation = '';
    if (Math.abs(lufsDiff) > 3) {
      if (lufsDiff < 0) {
        recommendation = `Increase loudness by ${Math.abs(lufsDiff).toFixed(1)} LUFS using compression and limiting`;
      } else {
        recommendation = `Decrease loudness by ${lufsDiff.toFixed(1)} LUFS to match reference dynamics`;
      }
    } else {
      recommendation = `Loudness is well-matched (within ${Math.abs(lufsDiff).toFixed(1)} LUFS)`;
    }

    return {
      lufsDiff,
      peakDiff,
      dynamicRangeDiff,
      recommendation,
    };
  }

  /**
   * Compare frequency distribution
   */
  private compareFrequency(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): FrequencyDifference[] {
    const bands = [
      { key: 'subBass', name: 'Sub Bass (20-60 Hz)' },
      { key: 'bass', name: 'Bass (60-250 Hz)' },
      { key: 'lowMids', name: 'Low Mids (250-500 Hz)' },
      { key: 'mids', name: 'Mids (500-2k Hz)' },
      { key: 'highMids', name: 'High Mids (2-4k Hz)' },
      { key: 'presence', name: 'Presence (4-6k Hz)' },
      { key: 'brilliance', name: 'Brilliance (6-20k Hz)' },
    ];

    return bands.map(band => {
      const targetBand = target.frequency[band.key as keyof typeof target.frequency];
      const refBand = reference.frequency[band.key as keyof typeof reference.frequency];

      const targetPct = (targetBand && typeof targetBand === 'object' && 'percentage' in targetBand)
        ? (targetBand as any).percentage
        : 0;
      const refPct = (refBand && typeof refBand === 'object' && 'percentage' in refBand)
        ? (refBand as any).percentage
        : 0;
      const diff = targetPct - refPct;

      let adjustment = '';
      if (Math.abs(diff) > 5) {
        if (diff > 0) {
          adjustment = `Reduce ${band.name} by ~${Math.abs(diff).toFixed(1)}%`;
        } else {
          adjustment = `Boost ${band.name} by ~${Math.abs(diff).toFixed(1)}%`;
        }
      } else {
        adjustment = `${band.name} is well-balanced`;
      }

      return {
        band: band.name,
        targetPercentage: targetPct,
        referencePercentage: refPct,
        difference: diff,
        suggestedAdjustment: adjustment,
      };
    });
  }

  /**
   * Compare stereo field
   */
  private compareStereo(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): StereoDifference {
    const widthDiff = target.stereo.stereoWidth - reference.stereo.stereoWidth;
    const correlationDiff = target.stereo.phaseCorrelation - reference.stereo.phaseCorrelation;

    let recommendation = '';
    if (Math.abs(widthDiff) > 15) {
      if (widthDiff > 0) {
        recommendation = `Narrow stereo width by ${widthDiff.toFixed(0)}% using mid/side processing`;
      } else {
        recommendation = `Widen stereo image by ${Math.abs(widthDiff).toFixed(0)}% to match reference`;
      }
    } else {
      recommendation = `Stereo width is well-matched`;
    }

    return {
      widthDiff,
      correlationDiff,
      recommendation,
    };
  }

  /**
   * Compare dynamics
   */
  private compareDynamics(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): DynamicsDifference {
    const crestFactorDiff = target.loudness.crestFactor - reference.loudness.crestFactor;
    const compressionNeeded = crestFactorDiff > 3;

    let recommendation = '';
    if (compressionNeeded) {
      recommendation = `Apply more compression - crest factor is ${crestFactorDiff.toFixed(1)} dB higher than reference`;
    } else if (crestFactorDiff < -3) {
      recommendation = `Reduce compression - track is over-compressed compared to reference`;
    } else {
      recommendation = `Dynamics are well-matched`;
    }

    return {
      crestFactorDiff,
      compressionNeeded,
      recommendation,
    };
  }

  /**
   * Compare tonal characteristics
   */
  private compareTonal(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): TonalDifference {
    const brightnessDiff = target.frequency.spectralCentroid - reference.frequency.spectralCentroid;

    let recommendation = '';
    if (Math.abs(brightnessDiff) > 500) {
      if (brightnessDiff > 0) {
        recommendation = `Reduce high frequency content - track is brighter than reference`;
      } else {
        recommendation = `Add brightness/air - track is darker than reference`;
      }
    } else {
      recommendation = `Tonal balance is well-matched`;
    }

    return {
      brightnessDiff,
      recommendation,
    };
  }

  /**
   * Generate mastering preset to match reference
   */
  private generateMatchingPreset(
    differences: TrackDifferences,
    reference: AudioAnalysisResult
  ): MasteringSettings {
    const preset: MasteringSettings = {
      targetLUFS: reference.loudness.integratedLUFS,
      truePeakLimit: reference.loudness.truePeakMax + 0.2,
      eqBands: [],
      compression: [],
      limiting: {
        enabled: true,
        threshold: -1,
        ceiling: -0.3,
        release: 50,
        lookahead: 5,
        oversampling: 2,
      },
      stereoWidth: reference.stereo.stereoWidth,
      midSideProcessing: {
        enabled: Math.abs(differences.stereo.widthDiff) > 10,
        midGain: 0,
        sideGain: differences.stereo.widthDiff > 0 ? -1 : 1,
        stereoWidth: reference.stereo.stereoWidth,
      },
    };

    // Add EQ bands based on frequency differences
    preset.eqBands.push({
      id: 'hp',
      enabled: true,
      frequency: 30,
      gain: 0,
      q: 0.7,
      type: 'highPass',
    });

    // Adjust frequency bands
    differences.frequency.forEach(diff => {
      if (Math.abs(diff.difference) > 5) {
        const gain = -diff.difference * 0.2; // Approximate EQ adjustment
        const freqMap: Record<string, number> = {
          'Sub Bass': 50,
          'Bass': 100,
          'Low Mids': 350,
          'Mids': 1000,
          'High Mids': 3000,
          'Presence': 5000,
          'Brilliance': 10000,
        };

        const freq = freqMap[diff.band.split('(')[0].trim()];
        if (freq) {
          preset.eqBands.push({
            id: `match-${freq}`,
            enabled: true,
            frequency: freq,
            gain: Math.max(-6, Math.min(6, gain)),
            q: 1.0,
            type: 'bell',
          });
        }
      }
    });

    // Add compression if needed
    if (differences.dynamics.compressionNeeded) {
      preset.compression.push({
        id: 'match',
        enabled: true,
        threshold: -18,
        ratio: 3 + (differences.dynamics.crestFactorDiff * 0.3),
        attack: 10,
        release: 100,
        knee: 6,
        makeupGain: 2,
      });
    }

    return preset;
  }

  /**
   * Create step-by-step action plan
   */
  private createActionPlan(differences: TrackDifferences): MasteringAction[] {
    const actions: MasteringAction[] = [];
    let step = 1;

    // High-pass filter (always first)
    actions.push({
      step: step++,
      category: 'EQ',
      action: 'Apply high-pass filter at 30 Hz to remove subsonic content',
      parameters: { frequency: 30, type: 'highPass' },
      priority: 'high',
    });

    // EQ adjustments
    differences.frequency.forEach(diff => {
      if (Math.abs(diff.difference) > 5) {
        const priority = Math.abs(diff.difference) > 10 ? 'critical' : 'high';
        actions.push({
          step: step++,
          category: 'EQ',
          action: diff.suggestedAdjustment,
          priority,
        });
      }
    });

    // Compression
    if (differences.dynamics.compressionNeeded) {
      actions.push({
        step: step++,
        category: 'Compression',
        action: differences.dynamics.recommendation,
        priority: 'critical',
      });
    }

    // Stereo processing
    if (Math.abs(differences.stereo.widthDiff) > 15) {
      actions.push({
        step: step++,
        category: 'Stereo',
        action: differences.stereo.recommendation,
        priority: 'high',
      });
    }

    // Loudness normalization
    if (Math.abs(differences.loudness.lufsDiff) > 2) {
      actions.push({
        step: step++,
        category: 'Limiting',
        action: differences.loudness.recommendation,
        priority: 'critical',
      });
    }

    // Final limiting
    actions.push({
      step: step++,
      category: 'Limiting',
      action: 'Apply brick-wall limiter with ceiling at -0.3 dBTP',
      priority: 'high',
    });

    return actions;
  }

  /**
   * Calculate overall similarity (0-100%)
   */
  private calculateSimilarity(
    target: AudioAnalysisResult,
    reference: AudioAnalysisResult
  ): number {
    let similarity = 100;

    // Loudness difference (30% weight)
    const lufsDiff = Math.abs(target.loudness.integratedLUFS - reference.loudness.integratedLUFS);
    similarity -= Math.min(30, lufsDiff * 3);

    // Frequency balance (40% weight)
    const freqDiff = this.compareFrequency(target, reference);
    const avgFreqDiff = freqDiff.reduce((sum, diff) => sum + Math.abs(diff.difference), 0) / freqDiff.length;
    similarity -= Math.min(40, avgFreqDiff * 2);

    // Stereo width (15% weight)
    const stereoWidthDiff = Math.abs(target.stereo.stereoWidth - reference.stereo.stereoWidth);
    similarity -= Math.min(15, stereoWidthDiff * 0.3);

    // Dynamic range (15% weight)
    const drDiff = Math.abs(target.loudness.dynamicRange - reference.loudness.dynamicRange);
    similarity -= Math.min(15, drDiff * 1.5);

    return Math.max(0, Math.min(100, similarity));
  }

  /**
   * Generate detailed comparison report
   */
  generateComparisonReport(comparison: ReferenceComparison): string {
    let report = '=== REFERENCE TRACK MATCHING ANALYSIS ===\n\n';

    report += `Overall Similarity: ${comparison.overallSimilarity.toFixed(1)}%\n\n`;

    report += '--- LOUDNESS COMPARISON ---\n';
    report += `Target LUFS: ${comparison.targetAnalysis.loudness.integratedLUFS.toFixed(1)} LUFS\n`;
    report += `Reference LUFS: ${comparison.referenceAnalysis.loudness.integratedLUFS.toFixed(1)} LUFS\n`;
    report += `Difference: ${comparison.differences.loudness.lufsDiff > 0 ? '+' : ''}${comparison.differences.loudness.lufsDiff.toFixed(1)} LUFS\n`;
    report += `Recommendation: ${comparison.differences.loudness.recommendation}\n\n`;

    report += '--- FREQUENCY BALANCE ---\n';
    comparison.differences.frequency.forEach(diff => {
      report += `${diff.band}:\n`;
      report += `  Target: ${diff.targetPercentage.toFixed(1)}% | Reference: ${diff.referencePercentage.toFixed(1)}%\n`;
      report += `  ${diff.suggestedAdjustment}\n`;
    });
    report += '\n';

    report += '--- STEREO FIELD ---\n';
    report += `Target Width: ${comparison.targetAnalysis.stereo.stereoWidth.toFixed(0)}%\n`;
    report += `Reference Width: ${comparison.referenceAnalysis.stereo.stereoWidth.toFixed(0)}%\n`;
    report += `${comparison.differences.stereo.recommendation}\n\n`;

    report += '--- ACTION PLAN ---\n';
    comparison.actionPlan.forEach(action => {
      report += `${action.step}. [${action.priority.toUpperCase()}] ${action.action}\n`;
    });

    return report;
  }
}

export default ReferenceMatchingService;
