/**
 * Simplified ConvexService for single-user hackathon demo
 * No authentication required - hardcoded user ID
 */

export interface CallData {
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
  // HARDCODED USER ID FOR HACKATHON DEMO
  private readonly DEMO_USER_ID = 'demo_user_hackathon_2024';
  private readonly CONVEX_ENDPOINT = 'https://adamant-hedgehog-462.convex.site/api/calls/create';

  /**
   * Submit call data to Convex (no auth required)
   */
  public async submitCall(callData: CallData): Promise<ConvexResponse> {
    try {
      console.log('[ConvexService] Submitting call to Convex...');
      
      const payload = {
        userId: this.DEMO_USER_ID, // Hardcoded for demo
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

  /**
   * Get the demo user ID
   */
  public getUserId(): string {
    return this.DEMO_USER_ID;
  }
}

