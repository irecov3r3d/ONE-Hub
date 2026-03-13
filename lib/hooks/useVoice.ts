// Voice interaction hook
// Manages speech recognition and voice commands

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceCommand, VoiceSettings } from '@/types';

interface UseVoiceOptions {
  onCommand?: (command: VoiceCommand) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [settings] = useState<VoiceSettings>({
    enabled: true,
    language: 'en-US',
    continuous: true,
    interimResults: true,
    autoStart: options.autoStart || false,
    feedback: 'both',
  });

  useEffect(() => {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);

        // Initialize recognition
        const recognition = new SpeechRecognition();
        recognition.continuous = settings.continuous;
        recognition.interimResults = settings.interimResults;
        recognition.lang = settings.language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let interimText = '';
          let finalText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcriptText = result[0].transcript;

            if (result.isFinal) {
              finalText += transcriptText + ' ';
            } else {
              interimText += transcriptText;
            }
          }

          if (finalText) {
            setTranscript(finalText.trim());
            setInterimTranscript('');

            // Create command object
            const command: VoiceCommand = {
              id: crypto.randomUUID(),
              transcript: finalText.trim(),
              confidence: event.results[event.results.length - 1][0].confidence,
              timestamp: new Date(),
              executed: false,
            };

            // Trigger command callback
            if (options.onCommand) {
              options.onCommand(command);
            }
          } else {
            setInterimTranscript(interimText);
          }
        };

        recognition.onerror = (event: any) => {
          const errorMessage = `Speech recognition error: ${event.error}`;
          setError(errorMessage);

          if (options.onError) {
            options.onError(errorMessage);
          }

          // Restart on certain errors
          if (event.error === 'no-speech' || event.error === 'audio-capture') {
            if (settings.continuous && isListening) {
              restartTimeoutRef.current = setTimeout(() => {
                try {
                  recognition.start();
                } catch (e) {
                  console.error('Failed to restart recognition:', e);
                }
              }, 1000);
            }
          }
        };

        recognition.onend = () => {
          setIsListening(false);

          // Auto-restart if continuous mode is on
          if (settings.continuous && isListening) {
            restartTimeoutRef.current = setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.error('Failed to restart recognition:', e);
              }
            }, 500);
          }
        };

        recognitionRef.current = recognition;

        // Auto-start if enabled
        if (settings.autoStart) {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to auto-start recognition:', e);
          }
        }
      } else {
        setIsSupported(false);
        setError('Speech recognition is not supported in this browser');
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setError('Failed to start voice recognition');
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, [isListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    toggle,
  };
}
