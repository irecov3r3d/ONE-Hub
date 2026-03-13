'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useVoice } from '@/lib/hooks/useVoice';
import { CommandParser } from '@/lib/services/commandParser';
import type { VoiceCommand, ParsedCommand } from '@/types';

interface VoiceControllerProps {
  onCommand?: (command: ParsedCommand) => void;
  className?: string;
}

export default function VoiceController({ onCommand, className = '' }: VoiceControllerProps) {
  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);
  const [lastCommand, setLastCommand] = useState<ParsedCommand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCommand = async (voiceCommand: VoiceCommand) => {
    setIsProcessing(true);

    try {
      // Parse the command
      const parsed = await CommandParser.parse(voiceCommand.transcript);
      voiceCommand.parsed = parsed;

      // Execute via callback
      if (onCommand) {
        onCommand(parsed);
      }

      voiceCommand.executed = true;
      setLastCommand(parsed);

      // Add to history
      setCommandHistory(prev => [voiceCommand, ...prev].slice(0, 10));
    } catch (error) {
      voiceCommand.error = error instanceof Error ? error.message : 'Unknown error';
      voiceCommand.executed = false;
      console.error('Command execution error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    toggle,
  } = useVoice({
    onCommand: handleCommand,
    autoStart: false,
  });

  if (!isSupported) {
    return (
      <div className={`bg-red-500/10 border border-red-500/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <XCircle size={20} />
          <span className="text-sm">Voice control is not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Voice Status Card */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50 animate-pulse'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:shadow-lg'
              }`}
            >
              {isListening ? (
                <Mic size={24} className="text-white" />
              ) : (
                <MicOff size={24} className="text-white" />
              )}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Voice Control</h3>
                {isListening && (
                  <Activity size={16} className="text-green-400 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-gray-400">
                {isListening ? 'Listening...' : 'Click to start voice control'}
              </p>
            </div>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <div className="bg-black/30 rounded-lg p-4 border border-white/10">
            <div className="text-white">
              {transcript && <span className="font-medium">{transcript}</span>}
              {interimTranscript && (
                <span className="text-gray-400 italic"> {interimTranscript}</span>
              )}
            </div>
          </div>
        )}

        {/* Last Command Display */}
        {lastCommand && (
          <div className="mt-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-green-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-300">
                  {lastCommand.intent.toUpperCase()} → {lastCommand.action}
                </div>
                {Object.keys(lastCommand.parameters).length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    {JSON.stringify(lastCommand.parameters, null, 2)}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(lastCommand.confidence * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Command Suggestions */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Try saying:</h4>
        <div className="space-y-2">
          {[
            'Generate a chill lo-fi beat at 85 BPM',
            'Open the beat maker',
            'Add a kick on beats 1 and 3',
            'Set BPM to 140',
            'Play the song',
            'Export as WAV',
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => {
                const synth = window.speechSynthesis;
                const utterance = new SpeechSynthesisUtterance(example);
                // Don't actually speak, just trigger the command
                handleCommand({
                  id: crypto.randomUUID(),
                  transcript: example,
                  confidence: 1.0,
                  timestamp: new Date(),
                  executed: false,
                });
              }}
              className="w-full text-left px-3 py-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors text-sm text-gray-300 hover:text-white"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Recent Commands</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {commandHistory.map((cmd) => (
              <div
                key={cmd.id}
                className="bg-black/30 rounded-lg p-3 border border-white/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">
                    {cmd.timestamp.toLocaleTimeString()}
                  </span>
                  {cmd.executed ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                </div>
                <div className="text-sm text-white">{cmd.transcript}</div>
                {cmd.parsed && (
                  <div className="text-xs text-purple-300 mt-1">
                    {cmd.parsed.intent} → {cmd.parsed.action}
                  </div>
                )}
                {cmd.error && (
                  <div className="text-xs text-red-400 mt-1">{cmd.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
