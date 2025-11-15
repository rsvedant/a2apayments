/**
 * Service for interacting with Google Gemini API
 * Generates AI-powered suggestions based on meeting captions
 */

export interface SuggestionResponse {
  suggestions: string[];
  error?: string;
}

export class GeminiService {
  private apiKey: string | null = null;
  private readonly API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  private lastRequest: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 3000; // Minimum 3 seconds between requests

  constructor() {
    this.loadApiKey();
  }

  /**
   * Load API key from Chrome storage
   */
  private async loadApiKey(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['geminiApiKey']);
      this.apiKey = result.geminiApiKey || null;
      
      if (!this.apiKey) {
        console.warn('[GeminiService] No API key found. Please set it in extension settings.');
      }
    } catch (error) {
      console.error('[GeminiService] Error loading API key:', error);
    }
  }

  /**
   * Set API key
   */
  public async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    console.log('[GeminiService] API key saved');
  }

  /**
   * Get API key status
   */
  public hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate suggestions based on recent conversation
   */
  public async generateSuggestions(
    captionText: string,
    conversationHistory: string[] = []
  ): Promise<SuggestionResponse> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequest < this.MIN_REQUEST_INTERVAL) {
      return {
        suggestions: [],
        error: 'Rate limited'
      };
    }

    if (!this.apiKey) {
      return {
        suggestions: [],
        error: 'No API key configured'
      };
    }

    if (!captionText.trim()) {
      return {
        suggestions: [],
        error: 'Empty caption text'
      };
    }

    this.lastRequest = now;

    try {
      const context = conversationHistory.length > 0
        ? `Previous context:\n${conversationHistory.slice(-5).join('\n')}\n\n`
        : '';

      const prompt = `${context}Current speaker just said: "${captionText}"

Based on this statement in a meeting context, provide exactly 3 brief, actionable suggestions for how to respond or what to say next. Each suggestion should be:
- Concise (max 10-15 words)
- Contextually relevant
- Professional and helpful
- A natural conversational response

Format your response as a JSON array with exactly 3 strings. Example:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]

Only return the JSON array, nothing else.`;

      const response = await fetch(`${this.API_ENDPOINT}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.9,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[GeminiService] API error:', errorData);
        return {
          suggestions: [],
          error: `API error: ${response.status}`
        };
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON response
      const suggestions = this.parseJsonResponse(generatedText);

      if (suggestions.length === 0) {
        console.warn('[GeminiService] No suggestions extracted from response:', generatedText);
        return {
          suggestions: this.getFallbackSuggestions(),
          error: 'Failed to parse suggestions'
        };
      }

      return { suggestions: suggestions.slice(0, 3) };

    } catch (error) {
      console.error('[GeminiService] Error generating suggestions:', error);
      return {
        suggestions: this.getFallbackSuggestions(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse JSON response from Gemini
   */
  private parseJsonResponse(text: string): string[] {
    try {
      // Try to extract JSON array from text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => typeof s === 'string' && s.trim().length > 0);
        }
      }

      // Fallback: try splitting by newlines
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('{') && !line.startsWith('['));
      
      if (lines.length >= 3) {
        return lines.slice(0, 3);
      }

      return [];
    } catch (error) {
      console.error('[GeminiService] Error parsing JSON:', error);
      return [];
    }
  }

  /**
   * Fallback suggestions when API fails
   */
  private getFallbackSuggestions(): string[] {
    return [
      "Could you elaborate on that?",
      "That's interesting, tell me more",
      "What are the next steps?"
    ];
  }

  /**
   * Check if enough time has passed to make another request
   */
  public canMakeRequest(): boolean {
    return Date.now() - this.lastRequest >= this.MIN_REQUEST_INTERVAL;
  }
}
