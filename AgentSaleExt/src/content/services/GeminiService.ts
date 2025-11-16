/**
 * Service for interacting with Google Gemini API
 * Generates AI-powered suggestions based on meeting captions
 * Acts as a sales assistant with access to user context and company documentation
 */

import { ContextService } from './ContextService';

export interface SuggestionResponse {
  suggestions: string[];
  summary?: string;
  error?: string;
}

export class GeminiService {
  private suggestionsApiKey: string | null = null;
  private summaryApiKey: string | null = null;
  private readonly API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  private lastRequest: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 5000; // Minimum 5 seconds between requests (increased)
  private contextService: ContextService | null = null;

  constructor(contextService?: ContextService) {
    this.contextService = contextService || null;
  }

  /**
   * Initialize the service (must be called after construction)
   */
  public async initialize(): Promise<void> {
    await this.loadApiKeys();
  }

  /**
   * Load API keys from Chrome storage
   */
  private async loadApiKeys(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('[GeminiService] Chrome storage not available');
        return;
      }

      const result = await chrome.storage.local.get(['geminiSuggestionsApiKey', 'geminiSummaryApiKey']);
      
      this.suggestionsApiKey = result.geminiSuggestionsApiKey || null;
      this.summaryApiKey = result.geminiSummaryApiKey || null;
      
      if (!this.suggestionsApiKey && !this.summaryApiKey) {
        console.warn('[GeminiService] No API keys found. Please set them in extension settings.');
      } else {
        if (this.suggestionsApiKey) {
          console.log('[GeminiService] Suggestions API key loaded');
        }
        if (this.summaryApiKey) {
          console.log('[GeminiService] Summary API key loaded');
        }
      }
    } catch (error) {
      console.error('[GeminiService] Error loading API keys:', error);
    }
  }

  /**
   * Set suggestions API key
   */
  public async setSuggestionsApiKey(apiKey: string): Promise<void> {
    this.suggestionsApiKey = apiKey;
    await chrome.storage.local.set({ geminiSuggestionsApiKey: apiKey });
    console.log('[GeminiService] Suggestions API key updated');
  }

  /**
   * Set summary API key
   */
  public async setSummaryApiKey(apiKey: string): Promise<void> {
    this.summaryApiKey = apiKey;
    await chrome.storage.local.set({ geminiSummaryApiKey: apiKey });
    console.log('[GeminiService] Summary API key updated');
  }

  /**
   * Get API key status
   */
  public hasApiKey(): boolean {
    return !!this.suggestionsApiKey || !!this.summaryApiKey;
  }

  /**
   * Check if suggestions API key is available
   */
  public hasSuggestionsApiKey(): boolean {
    return !!this.suggestionsApiKey;
  }

  /**
   * Check if summary API key is available
   */
  public hasSummaryApiKey(): boolean {
    return !!this.summaryApiKey;
  }

  /**
   * Generate a summary of the conversation so far
   */
  private async generateSummary(conversationHistory: string[]): Promise<string> {
    if (conversationHistory.length === 0) {
      return '';
    }

    try {
      const prompt = `Summarize this sales call conversation in 2-3 concise sentences. Focus on:
- Key topics discussed
- Any decisions or agreements made
- Current state of the conversation

Conversation:
${conversationHistory.join('\n')}

Provide only the summary, nothing else.`;

      const apiKey = this.summaryApiKey || this.suggestionsApiKey;
      if (!apiKey) {
        console.warn('[GeminiService] No API key available for summary generation');
        return '';
      }

      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
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
            temperature: 0.3,
            maxOutputTokens: 150,
          }
        })
      });

      if (!response.ok) {
        console.error('[GeminiService] Summary generation failed:', response.statusText);
        return '';
      }

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      
      console.log('[GeminiService] Generated summary:', summary);
      return summary;
    } catch (error) {
      console.error('[GeminiService] Error generating summary:', error);
      return '';
    }
  }

  /**
   * Update existing summary with new conversation chunks
   */
  private async updateSummary(previousSummary: string, recentChunks: string[]): Promise<string> {
    if (recentChunks.length === 0) {
      return previousSummary;
    }

    try {
      const prompt = `Update this conversation summary with the new statements below. Keep it concise (2-3 sentences).

Previous Summary:
${previousSummary}

New Statements:
${recentChunks.join('\n')}

Provide only the updated summary, nothing else.`;

      const apiKey = this.summaryApiKey || this.suggestionsApiKey;
      if (!apiKey) {
        console.warn('[GeminiService] No API key available for summary update');
        return previousSummary;
      }

      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
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
            temperature: 0.3,
            maxOutputTokens: 150,
          }
        })
      });

      if (!response.ok) {
        console.error('[GeminiService] Summary update failed:', response.statusText);
        return previousSummary; // Return previous summary on failure
      }

      const data = await response.json();
      const updatedSummary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || previousSummary;
      
      console.log('[GeminiService] Updated summary:', updatedSummary);
      return updatedSummary;
    } catch (error) {
      console.error('[GeminiService] Error updating summary:', error);
      return previousSummary; // Return previous summary on error
    }
  }

  /**
   * Generate suggestions based on caption text and conversation summary
   */
  public async generateSuggestions(
    captionText: string,
    conversationHistory: string[] = [],
    previousSummary: string = ''
  ): Promise<SuggestionResponse> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequest < this.MIN_REQUEST_INTERVAL) {
      return {
        suggestions: [],
        error: 'Rate limited'
      };
    }

    if (!this.suggestionsApiKey) {
      return {
        suggestions: [],
        summary: previousSummary,
        error: 'No suggestions API key configured'
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
      // Generate summary of conversation if we have history
      let newSummary = previousSummary;
      if (conversationHistory.length >= 3 && !previousSummary) {
        // Generate initial summary if we have enough history
        newSummary = await this.generateSummary(conversationHistory);
      } else if (conversationHistory.length >= 3 && previousSummary) {
        // Update summary with recent additions
        const recentChunks = conversationHistory.slice(-3);
        newSummary = await this.updateSummary(previousSummary, recentChunks);
      }
      
      // Get sales context if available
      const salesContext = this.contextService?.getFormattedContext() || '';
      
      // Query RAG for relevant documentation
      let ragResults = '';
      if (this.contextService) {
        const docs = await this.contextService.queryRAG(captionText);
        if (docs.length > 0) {
          ragResults = '\n## Relevant Company Information:\n' + docs.join('\n\n') + '\n';
        }
      }
      
      // Build conversation context using summary instead of raw history
      const conversationContext = newSummary
        ? `## Conversation Summary So Far:\n${newSummary}\n\n`
        : '';

      const prompt = `You are an AI sales assistant helping during a live sales call. Your role is to provide real-time guidance to help close the deal.

${salesContext}${ragResults}${conversationContext}
Agent Mail — the first email provider for AI agents. Each agent gets its own programmable inbox, identity, and policies to read, reason, and reply safely at scale.

Technical: Dev-first APIs (REST/GraphQL), drop-in SMTP for send, webhooks/WebSocket for inbound events. Messages arrive as clean JSON (parsed MIME, signed file URLs) plus raw RFC822. DKIM/SPF/DMARC handled automatically.

Integrations: One-click connectors for HubSpot, Salesforce, Zendesk, Slack. Use it for support triage, lead routing, invoice approvals, and agent-to-agent email workflows.

Pricing (mock): Starter $19/agent/mo (5k messages). Growth $79/agent/mo (100k). Enterprise custom (SSO/SCIM, private routing). Overage $0.20 per 1k. 14-day trial.

History & ideology (mock): Founded 2024 by email infra + ML tooling engineers. Protocol-first, privacy-forward: open standards, human-in-the-loop checkpoints, transparent audit logs.

## Current Statement:
The prospect/client just said: "${captionText}"

CRITICAL FIRST STEP - Determine Actionability:
This is EXTREMELY IMPORTANT. Be VERY STRICT and conservative. Only proceed if the statement is genuinely actionable.

ONLY ACTIONABLE if it contains:
- Direct questions about the product, pricing, features, or implementation (must end with "?" or be clearly interrogative)
- Clear objections or specific concerns that require a strategic response
- Explicit interest signals or buying intent ("I want to...", "We need...", "How can we...")
- Specific use case discussions with details
- Decision-making statements ("We're considering...", "We need to decide...")
- Direct requests for information, demos, or next steps

ALWAYS RETURN BLANK ["", "", ""] for:
- Greetings, pleasantries, small talk ("Hi", "Hello", "How are you", "Thanks", "Nice to meet you")
- Simple acknowledgments ("Okay", "Got it", "I see", "Yes", "No", "Right", "Sure", "Alright")
- Single word responses or very short confirmations
- Meeting logistics ("Can you hear me?", "Let me share", "Are you there?", "One second")
- Incomplete thoughts, fragments, or unclear statements
- Background noise, crosstalk, or irrelevant conversation
- General statements without clear questions or concerns
- Polite responses without substance ("That's interesting", "I understand", "Makes sense")
- Filler words or thinking out loud ("Um", "Let me think", "So...", "Well...")

BE STRICT: When in doubt, return blank strings ["", "", ""]. Only generate suggestions for clear, direct questions or substantive statements that genuinely require a strategic sales response.

If NOT genuinely actionable, return exactly: ["", "", ""]

If the statement IS ACTIONABLE, provide exactly 3 INFORMATIVE STATEMENTS (NOT QUESTIONS):
- Be 10-15 words maximum
- Address the prospect's statement directly with USEFUL INFORMATION
- Provide ASSERTIONS and FACTS about the product, features, pricing, or capabilities
- DO NOT ask questions - only make informative statements
- Pull information directly from the product details above (technical specs, pricing, integrations, etc.)
- Be natural and conversational but INFORMATION-FOCUSED
- Example GOOD responses: "Agent Mail handles DKIM/SPF automatically for you." or "Starter plan includes 5k messages at $19 per agent monthly."
- Example BAD responses: "Would you like to hear more about pricing?" or "What use case are you considering?"

CRITICAL: Your suggestions must be STATEMENTS that provide direct information, NOT questions asking for more details.

Format your response as a JSON array with exactly 3 informative statements:
["Informative statement 1", "Informative statement 2", "Informative statement 3"]

Only return the JSON array, nothing else.`;

      const response = await fetch(`${this.API_ENDPOINT}?key=${this.suggestionsApiKey}`, {
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
          summary: newSummary,
          error: 'Failed to parse suggestions'
        };
      }

      return { 
        suggestions: suggestions.slice(0, 3),
        summary: newSummary
      };

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
