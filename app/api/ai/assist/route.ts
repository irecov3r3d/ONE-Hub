// AI Assistant API Route
// Handles AI-powered production assistance and suggestions

import { NextRequest, NextResponse } from 'next/server';
import type { AIAssistantMessage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Check for API keys
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!anthropicKey && !openaiKey) {
      // Return mock response for development
      return getMockResponse(lastMessage.content, context);
    }

    // Use Claude if available, otherwise OpenAI
    if (anthropicKey) {
      return await getClaudeResponse(messages, context, anthropicKey);
    } else if (openaiKey) {
      return await getOpenAIResponse(messages, context, openaiKey);
    }

    return getMockResponse(lastMessage.content, context);
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

async function getClaudeResponse(
  messages: AIAssistantMessage[],
  context: any,
  apiKey: string
): Promise<NextResponse> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: getSystemPrompt(context),
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    return NextResponse.json({
      response: aiResponse,
      suggestions: generateSuggestions(aiResponse, context),
    });
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

async function getOpenAIResponse(
  messages: AIAssistantMessage[],
  context: any,
  apiKey: string
): Promise<NextResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(context),
          },
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return NextResponse.json({
      response: aiResponse,
      suggestions: generateSuggestions(aiResponse, context),
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

function getMockResponse(userMessage: string, context: any): NextResponse {
  const lowerMessage = userMessage.toLowerCase();

  let response = '';
  let suggestions: string[] = [];

  // Pattern matching for common questions
  if (lowerMessage.includes('bpm') || lowerMessage.includes('tempo')) {
    response = "Great question! Here are some common BPM ranges:\n\n" +
      "• Lo-Fi Hip Hop: 70-90 BPM (chill vibe)\n" +
      "• Trap: 130-170 BPM (modern hip hop)\n" +
      "• House: 120-130 BPM (dance music)\n" +
      "• Dubstep: 140 BPM (half-time feel)\n" +
      "• Techno: 120-150 BPM\n\n" +
      "For your current track, I'd recommend starting around 140 BPM for a trap beat, or 85 BPM for lo-fi!";
    suggestions = [
      'Set BPM to 140',
      'How do I change tempo?',
      'What genre should I make?',
    ];
  } else if (lowerMessage.includes('mix') || lowerMessage.includes('mixing')) {
    response = "Here are some key mixing tips:\n\n" +
      "1. **Start with levels**: Get a good balance before adding effects\n" +
      "2. **EQ strategically**: Cut muddy frequencies (200-400Hz) on most tracks\n" +
      "3. **Pan for width**: Spread elements across the stereo field\n" +
      "4. **Compress carefully**: Use compression to control dynamics\n" +
      "5. **Add reverb/delay**: Create depth and space\n" +
      "6. **Reference tracks**: Compare to professional mixes\n\n" +
      "Remember: Less is often more!";
    suggestions = [
      'How do I make it louder?',
      'What is EQ?',
      'Tell me about compression',
    ];
  } else if (lowerMessage.includes('loud') || lowerMessage.includes('volume')) {
    response = "To make your track louder:\n\n" +
      "1. **Compression**: Use compression on individual tracks and the master\n" +
      "2. **Limiting**: Apply a limiter on the master (aim for -14 LUFS for streaming)\n" +
      "3. **Clean mix**: Fix clashing frequencies first\n" +
      "4. **Saturation**: Add subtle saturation for warmth and perceived loudness\n" +
      "5. **Don't clip**: Leave 1-2dB of headroom\n\n" +
      "Pro tip: Louder isn't always better - dynamic range is important!";
    suggestions = [
      'What is mastering?',
      'How do I use a limiter?',
      'Explain compression',
    ];
  } else if (lowerMessage.includes('trap') || lowerMessage.includes('beat')) {
    response = "Let's make a fire trap beat! Here's the recipe:\n\n" +
      "1. **BPM**: 130-170 (try 140-145)\n" +
      "2. **Kick**: Hard-hitting 808 kick, often pitched\n" +
      "3. **Snare**: Crispy, layered (snare + clap)\n" +
      "4. **Hi-hats**: Fast rolls (1/16 or 1/32 notes)\n" +
      "5. **808 Bass**: Sliding bass notes, heavy sub\n" +
      "6. **Melody**: Dark, minor key, simple but catchy\n\n" +
      "Start with the drums, then add the 808 pattern, then melody!";
    suggestions = [
      'Open the beat maker',
      'Generate a trap beat',
      'What instruments do I need?',
    ];
  } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    response = "I'm here to help with:\n\n" +
      "• **Beat making**: Drums, patterns, BPM\n" +
      "• **Mixing**: EQ, compression, effects\n" +
      "• **Mastering**: Loudness, final polish\n" +
      "• **Production**: Arrangement, structure\n" +
      "• **Genres**: Specific tips for different styles\n\n" +
      "Just ask me anything! I can also listen to your voice commands.";
    suggestions = [
      'Help me make a beat',
      'What BPM should I use?',
      'Give me mixing tips',
      'How do I make trap music?',
    ];
  } else {
    response = "I understand you're asking about: \"" + userMessage + "\"\n\n" +
      "I'm your AI production assistant! I can help with:\n" +
      "• Beat making and rhythm patterns\n" +
      "• Mixing and mastering advice\n" +
      "• Genre-specific tips\n" +
      "• Technical questions\n\n" +
      "Could you be more specific? Or try one of the suggestions below!";
    suggestions = [
      'Help me with BPM',
      'Give me mixing tips',
      'How do I make a trap beat?',
      'What is mastering?',
    ];
  }

  return NextResponse.json({ response, suggestions });
}

function getSystemPrompt(context: any): string {
  return `You are an expert music production assistant for OnEstudiO, an AI-powered music creation platform.

Your role is to help users with:
- Beat making and drum programming
- Music production techniques
- Mixing and mastering advice
- Genre-specific guidance
- Technical questions about music production
- Creative suggestions

Current context: ${JSON.stringify(context || {})}

Be friendly, concise, and practical. Give specific, actionable advice. Use music production terminology but explain complex concepts clearly. When relevant, suggest specific BPM values, frequency ranges, or settings.

Keep responses under 200 words unless more detail is specifically requested.`;
}

function generateSuggestions(response: string, context: any): string[] {
  // Generate contextual follow-up suggestions
  const suggestions: string[] = [];

  if (response.includes('BPM') || response.includes('tempo')) {
    suggestions.push('Set BPM to 140', 'How do I change tempo?');
  }

  if (response.includes('mix') || response.includes('EQ')) {
    suggestions.push('What is compression?', 'How do I pan tracks?');
  }

  if (response.includes('master')) {
    suggestions.push('What is a limiter?', 'How loud should my track be?');
  }

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push(
      'Give me more tips',
      'Help with something else',
      'Show me an example'
    );
  }

  return suggestions.slice(0, 3);
}
