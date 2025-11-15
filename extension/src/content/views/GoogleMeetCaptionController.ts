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
}

export class GoogleMeetCaptionController {
  private observer: MutationObserver | null = null;
  private captionCallback: ((captions: CaptionData[]) => void) | null = null;
  private chunkCompleteCallback: ((chunk: CompleteCaptionChunk) => void) | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 10;
  private lastCaptionText = '';
  private captionBuffer = '';
  private chunkTimer: number | null = null;
  private readonly CHUNK_TIMEOUT = 2000; // 2 seconds of silence = chunk complete

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
      // Find caption elements based on screenshot structure
      const captionElements = container.querySelectorAll<HTMLElement>('.ygicle.VbkSUe');
      
      const captions: CaptionData[] = Array.from(captionElements).map(element => ({
        text: element.textContent?.trim() || '',
        timestamp: Date.now(),
      })).filter(caption => caption.text.length > 0);

      if (captions.length > 0 && this.captionCallback) {
        this.captionCallback(captions);
      }

      // Process for chunk detection
      if (captions.length > 0) {
        this.processCaptionForChunks(captions);
      }
    } catch (error) {
      console.error('[GoogleMeetCaptionController] Error extracting captions:', error);
    }
  }

  /**
   * Process captions to detect complete chunks (sentence endings or speaker changes)
   */
  private processCaptionForChunks(captions: CaptionData[]) {
    const currentText = captions.map(c => c.text).join(' ');
    
    // If text hasn't changed, do nothing
    if (currentText === this.lastCaptionText) {
      return;
    }

    // Update buffer with new text
    this.captionBuffer = currentText;
    this.lastCaptionText = currentText;

    // Clear existing timer
    if (this.chunkTimer !== null) {
      clearTimeout(this.chunkTimer);
    }

    // Check if we have a sentence ending
    const hasSentenceEnding = /[.!?]\s*$/.test(currentText.trim());
    
    if (hasSentenceEnding) {
      // Sentence ended, trigger chunk complete immediately
      this.triggerChunkComplete();
    } else {
      // Set timer for silence detection
      this.chunkTimer = setTimeout(() => {
        this.triggerChunkComplete();
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
        timestamp: Date.now()
      };
      
      console.log('[GoogleMeetCaptionController] Chunk complete:', chunk.text);
      this.chunkCompleteCallback(chunk);
      
      // Clear buffer
      this.captionBuffer = '';
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
