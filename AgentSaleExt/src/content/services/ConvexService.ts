/**
 * Service for communicating with Convex backend
 * Handles call data submission from Chrome extension
 */

export interface CallData {
  userId: string;
  title: string;
  transcription: string;
  participants: string; // JSON string
  duration?: number;
  recordingUrl?: string;
}

export interface ConvexResponse {
  success: boolean;
  callId?: string;
  message?: string;
  error?: string;
}

export class ConvexService {
  private userId: string | null = null;
  private readonly CONVEX_ENDPOINT = 'https://careful-puffin-39.convex.site/api/calls/create';

  constructor() {
    this.loadUserId();
  }

  /**
   * Load userId from Chrome storage
   */
  private async loadUserId(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['convexUserId']);
      this.userId = result.convexUserId || null;
      
      if (!this.userId) {
        console.warn('[ConvexService] No userId found. User needs to configure it.');
      }
    } catch (error) {
      console.error('[ConvexService] Error loading userId:', error);
    }
  }

  /**
   * Set userId and save to storage
   */
  public async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await chrome.storage.local.set({ convexUserId: userId });
    console.log('[ConvexService] User ID saved:', userId);
  }

  /**
   * Get current userId
   */
  public getUserId(): string | null {
    return this.userId;
  }

  /**
   * Check if userId is configured
   */
  public hasUserId(): boolean {
    return !!this.userId;
  }

  /**
   * Submit call data to Convex
   */
  public async submitCall(callData: Omit<CallData, 'userId'>): Promise<ConvexResponse> {
    if (!this.userId) {
      return {
        success: false,
        error: 'User ID not configured'
      };
    }

    try {
      console.log('[ConvexService] Submitting call to Convex...');
      
      const payload: CallData = {
        userId: this.userId,
        ...callData
      };

      const response = await fetch(this.CONVEX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[ConvexService] Call submitted successfully:', data.callId);
        return data;
      } else {
        console.error('[ConvexService] Failed to submit call:', data);
        return {
          success: false,
          error: data.error || 'Failed to submit call'
        };
      }
    } catch (error) {
      console.error('[ConvexService] Error submitting call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
