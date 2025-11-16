/**
 * Controller for Google Meet caption functionality
 * Handles enabling captions and monitoring caption changes
 */

export interface CaptionData {
  text: string;
  timestamp: number;
}

export interface CompleteCaptionChunk {
  text: string;
  timestamp: number;
  speaker: string;
}

export class GoogleMeetCaptionController {
  private observer: MutationObserver | null = null;
  private captionCallback: ((captions: CaptionData[]) => void) | null = null;
  private chunkCompleteCallback: ((chunk: CompleteCaptionChunk) => void) | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 10;
  private lastCaptionText = '';
  private captionBuffer = '';
  private currentSpeaker = '';
  private speakingStartTime = 0;
  private chunkTimer: number | null = null;
  private readonly CHUNK_TIMEOUT = 5000; // 5 seconds of silence
  private readonly MIN_SPEAKING_DURATION = 4000; // Minimum 4 seconds of speaking
  private readonly EXTENDED_SPEAKING_DURATION = 8000; // 8 seconds for single speaker

  constructor() {
    // Inject CSS to hide original captions
    this.injectHideStyles();
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Inject CSS to hide original Google Meet captions and button
   */
  private injectHideStyles() {
    const styleId = 'gmeet-caption-hider';
    
    // Don't inject if already exists
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Hide original Google Meet caption container visually but keep it in DOM */
      [aria-label="Captions"] {
        position: fixed !important;
        left: -9999px !important;
        top: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* Hide caption toggle button completely */
      button[aria-label="Turn on captions"],
      button[aria-label="Turn off captions"],
      button[aria-label*="caption" i][jsname="r8qRAd"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('[GoogleMeetCaptionController] Hide styles injected');
  }

  private initialize() {
    console.log('[GoogleMeetCaptionController] Initializing...');
    // Try to enable captions after a short delay to ensure Meet UI is ready
    setTimeout(() => this.enableCaptions(), 2000);
  }

  /**
   * Find and click the caption button to enable captions
   */
  public enableCaptions(): boolean {
    try {
      // Find button by aria-label
      const captionButton = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Turn on captions"]'
      );

      if (captionButton) {
        console.log('[GoogleMeetCaptionController] Found caption button, clicking...');
        captionButton.click();
        
        // Wait for captions to appear
        setTimeout(() => this.startMonitoring(), 500);
        return true;
      } else {
        // Check if captions are already enabled
        const captionOffButton = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Turn off captions"]'
        );
        
        if (captionOffButton) {
          console.log('[GoogleMeetCaptionController] Captions already enabled');
          this.startMonitoring();
          return true;
        }

        // Retry if button not found yet
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.log(`[GoogleMeetCaptionController] Caption button not found, retrying... (${this.retryCount}/${this.MAX_RETRIES})`);
          setTimeout(() => this.enableCaptions(), 1000);
          return false;
        }
      }

      console.warn('[GoogleMeetCaptionController] Could not find caption button');
      return false;
    } catch (error) {
      console.error('[GoogleMeetCaptionController] Error enabling captions:', error);
      return false;
    }
  }

  /**
   * Start monitoring caption changes
   */
  private startMonitoring() {
    console.log('[GoogleMeetCaptionController] Starting caption monitoring...');
    
    // Find caption container
    const captionContainer = this.findCaptionContainer();
    
    if (captionContainer) {
      console.log('[GoogleMeetCaptionController] Found caption container');
      this.hideOriginalCaptions(captionContainer);
      this.observeCaptions(captionContainer);
    } else {
      console.warn('[GoogleMeetCaptionController] Caption container not found, retrying...');
      setTimeout(() => this.startMonitoring(), 1000);
    }
  }

  /**
   * Find the caption container element
   */
  private findCaptionContainer(): HTMLElement | null {
    // Try to find by aria-label
    const container = document.querySelector<HTMLElement>('[aria-label="Captions"]');
    
    if (container) {
      return container;
    }

    // Fallback: look for caption container by class structure from screenshot
    const containers = document.querySelectorAll<HTMLElement>('[role="region"]');
    for (const element of containers) {
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel?.toLowerCase().includes('caption')) {
        return element;
      }
    }

    return null;
  }

  /**
   * Hide the original caption display (CSS already handles this, but add inline styles as backup)
   */
  private hideOriginalCaptions(container: HTMLElement) {
    // CSS already hides this, but add inline styles as backup
    container.style.setProperty('position', 'fixed', 'important');
    container.style.setProperty('left', '-9999px', 'important');
    container.style.setProperty('opacity', '0', 'important');
    container.style.setProperty('pointer-events', 'none', 'important');
    
    console.log('[GoogleMeetCaptionController] Original captions hidden (CSS + inline styles)');
  }

  /**
   * Observe caption changes and extract text
   */
  private observeCaptions(container: HTMLElement) {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver(() => {
      this.extractCaptions(container);
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial extraction
    this.extractCaptions(container);
  }

  /**
   * Extract caption text from the container
   */
  private extractCaptions(container: HTMLElement) {
    try {
      // Find all caption line containers (each contains speaker + text)
      const captionLineElements = container.querySelectorAll<HTMLElement>('.nMcdL.bj4p3b');
      
      const captions: CaptionData[] = [];
      let lastSpeaker = '';
      
      Array.from(captionLineElements).forEach(lineElement => {
        // Try to find speaker name in this line
        const speakerElement = lineElement.querySelector<HTMLElement>('.adE6rb');
        if (speakerElement?.textContent?.trim()) {
          lastSpeaker = speakerElement.textContent.trim();
        }
        
        // Get caption text from this line
        const textElement = lineElement.querySelector<HTMLElement>('.ygicle.VbkSUe');
        const text = textElement?.textContent?.trim() || '';
        
        if (text.length > 0) {
          captions.push({
            text: text,
            timestamp: Date.now(),
          });
        }
      });

      if (captions.length > 0 && this.captionCallback) {
        this.captionCallback(captions);
      }

      // Process for chunk detection with the last detected speaker
      if (captions.length > 0 && lastSpeaker) {
        this.processCaptionForChunks(captions, lastSpeaker);
      }
    } catch (error) {
      console.error('[GoogleMeetCaptionController] Error extracting captions:', error);
    }
  }

  /**
   * Process captions to detect complete chunks (speaker changes and duration thresholds)
   */
  private processCaptionForChunks(captions: CaptionData[], speaker: string) {
    const currentText = captions.map(c => c.text).join(' ');
    const now = Date.now();
    
    // If text hasn't changed, do nothing
    if (currentText === this.lastCaptionText) {
      return;
    }

    // Detect speaker change
    const speakerChanged = this.currentSpeaker && speaker !== this.currentSpeaker && speaker !== 'Unknown';
    
    // If new speaker or first time
    if (!this.currentSpeaker || speakerChanged) {
      // If speaker changed and previous speaker spoke long enough, trigger chunk
      if (speakerChanged && this.captionBuffer.trim()) {
        const speakingDuration = now - this.speakingStartTime;
        
        if (speakingDuration >= this.MIN_SPEAKING_DURATION) {
          console.log(`[GoogleMeetCaptionController] Speaker change detected: ${this.currentSpeaker} -> ${speaker} (${speakingDuration}ms)`);
          this.triggerChunkComplete();
        } else {
          console.log(`[GoogleMeetCaptionController] Speaker changed but duration too short (${speakingDuration}ms < ${this.MIN_SPEAKING_DURATION}ms)`);
          // Clear buffer without triggering - too short to be meaningful
          this.captionBuffer = '';
        }
      }
      
      // Update speaker and reset timing
      this.currentSpeaker = speaker;
      this.speakingStartTime = now;
      this.captionBuffer = currentText;
    } else {
      // Same speaker, append to buffer
      this.captionBuffer = currentText;
    }
    
    this.lastCaptionText = currentText;

    // Clear existing timer
    if (this.chunkTimer !== null) {
      clearTimeout(this.chunkTimer);
    }

    // Calculate speaking duration
    const speakingDuration = now - this.speakingStartTime;
    
    // Check if we have a sentence ending AND minimum duration met
    const hasSentenceEnding = /[.!?]\s*$/.test(currentText.trim());
    
    if (hasSentenceEnding && speakingDuration >= this.MIN_SPEAKING_DURATION) {
      console.log(`[GoogleMeetCaptionController] Sentence ended with sufficient duration (${speakingDuration}ms)`);
      this.triggerChunkComplete();
    } else if (speakingDuration >= this.EXTENDED_SPEAKING_DURATION) {
      // If someone has been talking for extended duration, trigger anyway
      console.log(`[GoogleMeetCaptionController] Extended speaking duration reached (${speakingDuration}ms)`);
      this.triggerChunkComplete();
    } else {
      // Set timer for silence detection
      this.chunkTimer = setTimeout(() => {
        const finalDuration = Date.now() - this.speakingStartTime;
        if (finalDuration >= this.MIN_SPEAKING_DURATION) {
          console.log(`[GoogleMeetCaptionController] Silence timeout with sufficient duration (${finalDuration}ms)`);
          this.triggerChunkComplete();
        } else {
          console.log(`[GoogleMeetCaptionController] Silence timeout but duration too short (${finalDuration}ms)`);
          this.captionBuffer = '';
        }
      }, this.CHUNK_TIMEOUT) as unknown as number;
    }
  }

  /**
   * Trigger chunk complete callback
   */
  private triggerChunkComplete() {
    if (this.captionBuffer.trim() && this.chunkCompleteCallback) {
      const chunk: CompleteCaptionChunk = {
        text: this.captionBuffer.trim(),
        timestamp: Date.now(),
        speaker: this.currentSpeaker
      };
      
      console.log('[GoogleMeetCaptionController] Chunk complete:', chunk.text, 'by', chunk.speaker);
      this.chunkCompleteCallback(chunk);
      
      // Clear buffer and reset timing for next speaker
      this.captionBuffer = '';
      this.speakingStartTime = Date.now();
    }
    
    if (this.chunkTimer !== null) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  /**
   * Register a callback for caption updates
   */
  public onCaptionUpdate(callback: (captions: CaptionData[]) => void) {
    this.captionCallback = callback;
  }

  /**
   * Register a callback for complete caption chunks
   */
  public onChunkComplete(callback: (chunk: CompleteCaptionChunk) => void) {
    this.chunkCompleteCallback = callback;
  }

  /**
   * Cleanup
   */
  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.chunkTimer !== null) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
    this.captionCallback = null;
    this.chunkCompleteCallback = null;
  }
}
