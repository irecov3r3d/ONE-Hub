'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Play, Pause, FileAudio, Activity, TrendingUp } from 'lucide-react';
import AudioAnalysisService from '@/lib/services/audioAnalysisService';
import AudioMasteringService from '@/lib/services/audioMasteringService';
import type { AudioAnalysisResult, MasteringSettings } from '@/types';

export default function AudioAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AudioAnalysisResult | null>(null);
  const [mastering, setMastering] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisService = useRef(new AudioAnalysisService());
  const masteringService = useRef(new AudioMasteringService());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysis(null);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError('');

    try {
      const result = await analysisService.current.analyzeAudio(file);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze audio: ' + (err as Error).message);
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyMastering = async () => {
    if (!file || !analysis?.masteringSuggestions) return;

    setMastering(true);
    setError('');

    try {
      const preset = AudioMasteringService.createPresetFromSuggestions(
        analysis.masteringSuggestions
      );

      const masteredBlob = await masteringService.current.applyMastering(file, preset);

      // Download the mastered file
      const url = URL.createObjectURL(masteredBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^.]+$/, '_mastered.wav');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to apply mastering: ' + (err as Error).message);
      console.error(err);
    } finally {
      setMastering(false);
    }
  };

  const exportAsJSON = () => {
    if (!analysis) return;
    const json = analysisService.current.exportAsJSON(analysis);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name.replace(/\.[^.]+$/, '_analysis.json') || 'analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    if (!analysis) return;
    const text = analysisService.current.exportAsText(analysis);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name.replace(/\.[^.]+$/, '_analysis.txt') || 'analysis.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7" />
            Audio Analysis & Mastering Tool
          </h2>
        </div>

        <p className="text-gray-600 mb-4">
          Upload any audio file to get comprehensive analysis including spectrum data, BPM, loudness levels,
          and precise technical details needed to recreate the audio.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <FileAudio className="w-5 h-5" />
                <span className="font-medium">{file.name}</span>
              </div>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Choose different file
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-gray-700">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Click to upload
                </button>{' '}
                or drag and drop
              </p>
              <p className="text-sm text-gray-500">MP3, WAV, FLAC, OGG, M4A</p>
            </div>
          )}
        </div>

        {file && !analysis && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Audio'}
          </button>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex gap-3">
              <button
                onClick={exportAsJSON}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={exportAsText}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Text
              </button>
              {analysis.masteringSuggestions && (
                <button
                  onClick={handleApplyMastering}
                  disabled={mastering}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 rounded-lg transition-colors ml-auto"
                >
                  <TrendingUp className="w-4 h-4" />
                  {mastering ? 'Applying...' : 'Apply Auto-Mastering'}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'temporal', label: 'Tempo & Timing' },
                  { id: 'frequency', label: 'Frequency' },
                  { id: 'loudness', label: 'Loudness' },
                  { id: 'musical', label: 'Musical' },
                  { id: 'stereo', label: 'Stereo' },
                  { id: 'harmonic', label: 'Harmonics' },
                  { id: 'quality', label: 'Quality' },
                  { id: 'mastering', label: 'Mastering' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && <OverviewTab analysis={analysis} />}
              {activeTab === 'temporal' && <TemporalTab analysis={analysis} />}
              {activeTab === 'frequency' && <FrequencyTab analysis={analysis} />}
              {activeTab === 'loudness' && <LoudnessTab analysis={analysis} />}
              {activeTab === 'musical' && <MusicalTab analysis={analysis} />}
              {activeTab === 'stereo' && <StereoTab analysis={analysis} />}
              {activeTab === 'harmonic' && <HarmonicTab analysis={analysis} />}
              {activeTab === 'quality' && <QualityTab analysis={analysis} />}
              {activeTab === 'mastering' && <MasteringTab analysis={analysis} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="File Information">
        <DataGrid>
          <DataItem label="File Name" value={analysis.fileInfo.fileName} />
          <DataItem label="Format" value={analysis.fileInfo.format} />
          <DataItem label="Duration" value={`${analysis.fileInfo.duration.toFixed(2)}s`} />
          <DataItem label="Sample Rate" value={`${analysis.fileInfo.sampleRate} Hz`} />
          <DataItem label="Channels" value={analysis.fileInfo.channels === 2 ? 'Stereo' : 'Mono'} />
          <DataItem label="Bitrate" value={`${analysis.fileInfo.bitrate} kbps`} />
          <DataItem label="File Size" value={`${(analysis.fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB`} />
        </DataGrid>
      </Section>

      <Section title="Key Metrics">
        <DataGrid>
          <DataItem label="BPM" value={`${analysis.temporal.bpm} (${(analysis.temporal.bpmConfidence * 100).toFixed(0)}% confidence)`} />
          <DataItem label="Key" value={analysis.musical.key} />
          <DataItem label="Integrated LUFS" value={`${analysis.loudness.integratedLUFS.toFixed(1)} LUFS`} highlight />
          <DataItem label="True Peak" value={`${analysis.loudness.truePeakMax.toFixed(1)} dBTP`} highlight />
          <DataItem label="Dynamic Range" value={`${analysis.loudness.dynamicRange.toFixed(1)} dB`} />
          <DataItem label="Quality Score" value={`${analysis.quality.qualityScore}/100`} highlight={analysis.quality.qualityScore < 70} />
        </DataGrid>
      </Section>

      {analysis.quality.issues.length > 0 && (
        <Section title="Issues Detected">
          <div className="space-y-2">
            {analysis.quality.issues.map((issue, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  issue.severity === 'critical'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : issue.severity === 'high'
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                <div className="font-medium">[{issue.severity.toUpperCase()}] {issue.description}</div>
                {issue.suggestion && <div className="text-sm mt-1">{issue.suggestion}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// Temporal Tab
function TemporalTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="Tempo Analysis">
        <DataGrid>
          <DataItem label="BPM" value={analysis.temporal.bpm.toString()} />
          <DataItem label="Confidence" value={`${(analysis.temporal.bpmConfidence * 100).toFixed(1)}%`} />
          <DataItem
            label="Time Signature"
            value={`${analysis.temporal.timeSignature.numerator}/${analysis.temporal.timeSignature.denominator}`}
          />
          <DataItem label="Beats Detected" value={analysis.temporal.beats.length.toString()} />
          <DataItem label="Downbeats" value={analysis.temporal.downbeats.length.toString()} />
          <DataItem label="Onsets" value={analysis.temporal.onsets.length.toString()} />
        </DataGrid>
      </Section>

      <Section title="Sections">
        <div className="space-y-2">
          {analysis.temporal.sections.slice(0, 10).map((section, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">
                  {section.startTime.toFixed(1)}s - {section.endTime.toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600 capitalize">{section.type}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Energy: {(section.energy * 100).toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Frequency Tab
function FrequencyTab({ analysis }: { analysis: AudioAnalysisResult }) {
  const totalPercentage =
    analysis.frequency.subBass.percentage +
    analysis.frequency.bass.percentage +
    analysis.frequency.lowMids.percentage +
    analysis.frequency.mids.percentage +
    analysis.frequency.highMids.percentage +
    analysis.frequency.presence.percentage +
    analysis.frequency.brilliance.percentage;

  return (
    <div className="space-y-6">
      <Section title="Frequency Distribution">
        <div className="space-y-3">
          <FrequencyBandBar label="Sub Bass (20-60 Hz)" percentage={analysis.frequency.subBass.percentage} color="bg-red-500" />
          <FrequencyBandBar label="Bass (60-250 Hz)" percentage={analysis.frequency.bass.percentage} color="bg-orange-500" />
          <FrequencyBandBar label="Low Mids (250-500 Hz)" percentage={analysis.frequency.lowMids.percentage} color="bg-yellow-500" />
          <FrequencyBandBar label="Mids (500-2000 Hz)" percentage={analysis.frequency.mids.percentage} color="bg-green-500" />
          <FrequencyBandBar label="High Mids (2-4 kHz)" percentage={analysis.frequency.highMids.percentage} color="bg-blue-500" />
          <FrequencyBandBar label="Presence (4-6 kHz)" percentage={analysis.frequency.presence.percentage} color="bg-indigo-500" />
          <FrequencyBandBar label="Brilliance (6-20 kHz)" percentage={analysis.frequency.brilliance.percentage} color="bg-purple-500" />
        </div>
      </Section>

      <Section title="Spectral Characteristics">
        <DataGrid>
          <DataItem label="Spectral Centroid" value={`${analysis.frequency.spectralCentroid.toFixed(0)} Hz`} />
          <DataItem label="Spectral Rolloff" value={`${analysis.frequency.spectralRolloff.toFixed(0)} Hz`} />
          <DataItem label="Spectral Flux" value={analysis.frequency.spectralFlux.toFixed(4)} />
          <DataItem label="Spectral Flatness" value={analysis.frequency.spectralFlatness.toFixed(3)} />
        </DataGrid>
      </Section>

      <Section title="Dominant Frequencies">
        <div className="space-y-2">
          {analysis.frequency.dominantFrequencies.slice(0, 10).map((freq, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{freq.frequency.toFixed(1)} Hz</div>
                {freq.note && <div className="text-sm text-gray-600">{freq.note}</div>}
              </div>
              <div className="text-sm text-gray-600">{freq.magnitude.toFixed(1)} dB</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Loudness Tab
function LoudnessTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="Integrated Loudness (EBU R128)">
        <DataGrid>
          <DataItem label="Integrated LUFS" value={`${analysis.loudness.integratedLUFS.toFixed(1)} LUFS`} highlight />
          <DataItem label="Loudness Range (LRA)" value={`${analysis.loudness.loudnessRange.toFixed(1)} LU`} />
          <DataItem label="Momentary Max" value={`${analysis.loudness.momentaryMaxLUFS.toFixed(1)} LUFS`} />
          <DataItem label="Short-term Max" value={`${analysis.loudness.shortTermMaxLUFS.toFixed(1)} LUFS`} />
        </DataGrid>
      </Section>

      <Section title="Peak Levels">
        <DataGrid>
          <DataItem label="True Peak L" value={`${analysis.loudness.truePeakL.toFixed(1)} dBTP`} />
          <DataItem label="True Peak R" value={`${analysis.loudness.truePeakR.toFixed(1)} dBTP`} />
          <DataItem label="True Peak Max" value={`${analysis.loudness.truePeakMax.toFixed(1)} dBTP`} highlight />
          <DataItem label="Sample Peak L" value={`${analysis.loudness.peakL.toFixed(1)} dBFS`} />
          <DataItem label="Sample Peak R" value={`${analysis.loudness.peakR.toFixed(1)} dBFS`} />
        </DataGrid>
      </Section>

      <Section title="RMS & Dynamics">
        <DataGrid>
          <DataItem label="RMS Left" value={`${analysis.loudness.rmsL.toFixed(1)} dB`} />
          <DataItem label="RMS Right" value={`${analysis.loudness.rmsR.toFixed(1)} dB`} />
          <DataItem label="RMS Mid" value={`${analysis.loudness.rmsMid.toFixed(1)} dB`} />
          <DataItem label="RMS Side" value={`${analysis.loudness.rmsSide.toFixed(1)} dB`} />
          <DataItem label="Dynamic Range" value={`${analysis.loudness.dynamicRange.toFixed(1)} dB`} highlight />
          <DataItem label="Crest Factor" value={`${analysis.loudness.crestFactor.toFixed(1)} dB`} />
        </DataGrid>
      </Section>
    </div>
  );
}

// Musical Tab
function MusicalTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="Key & Scale">
        <DataGrid>
          <DataItem label="Key" value={analysis.musical.key} />
          <DataItem label="Confidence" value={`${(analysis.musical.keyConfidence * 100).toFixed(1)}%`} />
          <DataItem label="Scale" value={analysis.musical.scale} />
          <DataItem label="Tempo Stability" value={`${(analysis.musical.tempoStability * 100).toFixed(1)}%`} />
        </DataGrid>
      </Section>

      <Section title="Musical Characteristics">
        <DataGrid>
          <DataItem label="Energy" value={`${(analysis.musical.energy * 100).toFixed(0)}%`} />
          <DataItem label="Danceability" value={`${(analysis.musical.danceability * 100).toFixed(0)}%`} />
          <DataItem label="Valence" value={`${(analysis.musical.valence * 100).toFixed(0)}%`} />
          <DataItem label="Acousticness" value={`${(analysis.musical.acousticness * 100).toFixed(0)}%`} />
          <DataItem label="Instrumentalness" value={`${(analysis.musical.instrumentalness * 100).toFixed(0)}%`} />
          <DataItem label="Rhythm Complexity" value={`${(analysis.musical.rhythmComplexity * 100).toFixed(0)}%`} />
          <DataItem label="Syncopation" value={`${(analysis.musical.syncopation * 100).toFixed(0)}%`} />
        </DataGrid>
      </Section>

      <Section title="Pitch Classes">
        <div className="grid grid-cols-3 gap-2">
          {analysis.musical.pitchClasses.slice(0, 12).map((pitch, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg text-center">
              <div className="font-medium">{pitch.note}</div>
              <div className="text-sm text-gray-600">{(pitch.strength * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Stereo Tab
function StereoTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="Stereo Field">
        <DataGrid>
          <DataItem label="Stereo Width" value={`${analysis.stereo.stereoWidth.toFixed(0)}%`} highlight />
          <DataItem label="Phase Correlation" value={analysis.stereo.phaseCorrelation.toFixed(3)} />
          <DataItem label="Pan Balance" value={analysis.stereo.panBalance.toFixed(1)} />
          <DataItem label="Mid/Side Ratio" value={analysis.stereo.midSideRatio.toFixed(2)} />
          <DataItem label="Side Content" value={`${analysis.stereo.sideContent.toFixed(1)}%`} />
        </DataGrid>
      </Section>

      <Section title="Frequency-Dependent Stereo Field">
        <div className="space-y-2">
          {analysis.stereo.stereoField.map((field, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{field.frequency} Hz</div>
              <div className="text-sm space-x-4">
                <span>Width: {field.width.toFixed(0)}%</span>
                <span>Correlation: {field.correlation.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Harmonic Tab
function HarmonicTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="Harmonic Analysis">
        <DataGrid>
          <DataItem label="Fundamental Frequency" value={`${analysis.harmonic.fundamentalFreq.toFixed(1)} Hz`} />
          <DataItem label="Harmonic-to-Noise Ratio" value={`${analysis.harmonic.harmonicToNoiseRatio.toFixed(1)} dB`} />
          <DataItem label="THD" value={`${analysis.harmonic.thd.toFixed(2)}%`} />
          <DataItem label="Inharmonicity" value={analysis.harmonic.inharmonicity.toFixed(3)} />
        </DataGrid>
      </Section>

      <Section title="Harmonics">
        <div className="space-y-2">
          {analysis.harmonic.harmonics.map((harmonic, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">H{harmonic.number}</div>
                <div className="text-sm text-gray-600">{harmonic.frequency.toFixed(1)} Hz</div>
              </div>
              <div className="text-sm text-gray-600">{harmonic.magnitude.toFixed(1)} dB</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Quality Tab
function QualityTab({ analysis }: { analysis: AudioAnalysisResult }) {
  return (
    <div className="space-y-6">
      <Section title="Quality Metrics">
        <DataGrid>
          <DataItem label="Quality Score" value={`${analysis.quality.qualityScore}/100`} highlight={analysis.quality.qualityScore < 70} />
          <DataItem label="Clipping" value={analysis.quality.clipping ? 'YES' : 'NO'} highlight={analysis.quality.clipping} />
          {analysis.quality.clipping && (
            <>
              <DataItem label="Clipped Samples" value={analysis.quality.clippedSamples.toString()} />
              <DataItem label="Clipping %" value={`${analysis.quality.clippingPercentage.toFixed(3)}%`} />
            </>
          )}
          <DataItem label="Noise Floor" value={`${analysis.quality.noiseFloor.toFixed(1)} dBFS`} />
          <DataItem label="SNR" value={`${analysis.quality.snr.toFixed(1)} dB`} />
          <DataItem label="DC Offset L" value={analysis.quality.dcOffsetL.toFixed(4)} />
          <DataItem label="DC Offset R" value={analysis.quality.dcOffsetR.toFixed(4)} />
        </DataGrid>
      </Section>

      {analysis.quality.issues.length > 0 && (
        <Section title="Issues">
          <div className="space-y-2">
            {analysis.quality.issues.map((issue, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  issue.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : issue.severity === 'high'
                    ? 'bg-orange-50 border-orange-200'
                    : issue.severity === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="font-medium">[{issue.severity.toUpperCase()}] {issue.type}</div>
                <div className="text-sm mt-1">{issue.description}</div>
                {issue.suggestion && (
                  <div className="text-sm mt-2 italic">💡 {issue.suggestion}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis.quality.silentSections.length > 0 && (
        <Section title="Silent Sections">
          <div className="space-y-2">
            {analysis.quality.silentSections.map((section, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                {section.startTime.toFixed(2)}s - {section.endTime.toFixed(2)}s ({section.duration.toFixed(2)}s)
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// Mastering Tab
function MasteringTab({ analysis }: { analysis: AudioAnalysisResult }) {
  if (!analysis.masteringSuggestions) {
    return <div className="text-gray-600">No mastering suggestions available.</div>;
  }

  const suggestions = analysis.masteringSuggestions;

  return (
    <div className="space-y-6">
      <Section title="Recommendations">
        <div className="space-y-2">
          {suggestions.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-blue-600 mt-0.5">•</div>
              <div className="text-blue-900">{rec}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Target Settings">
        <DataGrid>
          <DataItem label="Target LUFS" value={`${suggestions.targetLUFS} LUFS`} highlight />
          <DataItem label="Normalization Needed" value={suggestions.needsNormalization ? 'Yes' : 'No'} />
        </DataGrid>
      </Section>

      {suggestions.eqSuggestions.length > 0 && (
        <Section title="EQ Suggestions">
          <div className="space-y-2">
            {suggestions.eqSuggestions.map((eq, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">{eq.frequency} Hz ({eq.type})</div>
                  <div className="text-sm">{eq.gain > 0 ? '+' : ''}{eq.gain.toFixed(1)} dB</div>
                </div>
                <div className="text-sm text-gray-600">Q: {eq.q.toFixed(1)}</div>
                <div className="text-sm text-gray-600 mt-1">{eq.reason}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {suggestions.compressionSuggestion && (
        <Section title="Compression Suggestion">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <DataGrid>
              <DataItem label="Threshold" value={`${suggestions.compressionSuggestion.threshold} dB`} />
              <DataItem label="Ratio" value={`${suggestions.compressionSuggestion.ratio}:1`} />
              <DataItem label="Attack" value={`${suggestions.compressionSuggestion.attack} ms`} />
              <DataItem label="Release" value={`${suggestions.compressionSuggestion.release} ms`} />
              <DataItem label="Knee" value={`${suggestions.compressionSuggestion.knee} dB`} />
              <DataItem label="Makeup Gain" value={`${suggestions.compressionSuggestion.makeupGain} dB`} />
            </DataGrid>
            <div className="text-sm text-gray-600 mt-2">{suggestions.compressionSuggestion.reason}</div>
          </div>
        </Section>
      )}

      {suggestions.limitingSuggestion && (
        <Section title="Limiting Suggestion">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <DataGrid>
              <DataItem label="Threshold" value={`${suggestions.limitingSuggestion.threshold} dB`} />
              <DataItem label="Ceiling" value={`${suggestions.limitingSuggestion.ceiling} dB`} />
              <DataItem label="Release" value={`${suggestions.limitingSuggestion.release} ms`} />
            </DataGrid>
            <div className="text-sm text-gray-600 mt-2">{suggestions.limitingSuggestion.reason}</div>
          </div>
        </Section>
      )}

      {suggestions.stereoEnhancement && (
        <Section title="Stereo Enhancement">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <DataGrid>
              <DataItem label="Width Adjustment" value={`${suggestions.stereoEnhancement.widthAdjustment > 0 ? '+' : ''}${suggestions.stereoEnhancement.widthAdjustment}%`} />
              <DataItem label="Mid/Side Processing" value={suggestions.stereoEnhancement.midSideProcessing ? 'Enabled' : 'Disabled'} />
            </DataGrid>
            <div className="text-sm text-gray-600 mt-2">{suggestions.stereoEnhancement.reason}</div>
          </div>
        </Section>
      )}
    </div>
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DataGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function DataItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`font-medium ${highlight ? 'text-blue-900' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function FrequencyBandBar({
  label,
  percentage,
  color,
}: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div className={`${color} h-4 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
