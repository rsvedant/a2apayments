export class GoogleMeetCaptionController {
  observer = null;
  captionCallback = null;
  chunkCompleteCallback = null;
  retryCount = 0;
  MAX_RETRIES = 10;
  lastCaptionText = "";
  captionBuffer = "";
  chunkTimer = null;
  CHUNK_TIMEOUT = 2e3;
  // 2 seconds of silence = chunk complete
  constructor() {
    this.injectHideStyles();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }
  /**
   * Inject CSS to hide original Google Meet captions and button
   */
  injectHideStyles() {
    const styleId = "gmeet-caption-hider";
    if (document.getElementById(styleId)) {
      return;
    }
    const style = document.createElement("style");
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
    console.log("[GoogleMeetCaptionController] Hide styles injected");
  }
  initialize() {
    console.log("[GoogleMeetCaptionController] Initializing...");
    setTimeout(() => this.enableCaptions(), 2e3);
  }
  /**
   * Find and click the caption button to enable captions
   */
  enableCaptions() {
    try {
      const captionButton = document.querySelector(
        'button[aria-label="Turn on captions"]'
      );
      if (captionButton) {
        console.log("[GoogleMeetCaptionController] Found caption button, clicking...");
        captionButton.click();
        setTimeout(() => this.startMonitoring(), 500);
        return true;
      } else {
        const captionOffButton = document.querySelector(
          'button[aria-label="Turn off captions"]'
        );
        if (captionOffButton) {
          console.log("[GoogleMeetCaptionController] Captions already enabled");
          this.startMonitoring();
          return true;
        }
        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.log(`[GoogleMeetCaptionController] Caption button not found, retrying... (${this.retryCount}/${this.MAX_RETRIES})`);
          setTimeout(() => this.enableCaptions(), 1e3);
          return false;
        }
      }
      console.warn("[GoogleMeetCaptionController] Could not find caption button");
      return false;
    } catch (error) {
      console.error("[GoogleMeetCaptionController] Error enabling captions:", error);
      return false;
    }
  }
  /**
   * Start monitoring caption changes
   */
  startMonitoring() {
    console.log("[GoogleMeetCaptionController] Starting caption monitoring...");
    const captionContainer = this.findCaptionContainer();
    if (captionContainer) {
      console.log("[GoogleMeetCaptionController] Found caption container");
      this.hideOriginalCaptions(captionContainer);
      this.observeCaptions(captionContainer);
    } else {
      console.warn("[GoogleMeetCaptionController] Caption container not found, retrying...");
      setTimeout(() => this.startMonitoring(), 1e3);
    }
  }
  /**
   * Find the caption container element
   */
  findCaptionContainer() {
    const container = document.querySelector('[aria-label="Captions"]');
    if (container) {
      return container;
    }
    const containers = document.querySelectorAll('[role="region"]');
    for (const element of containers) {
      const ariaLabel = element.getAttribute("aria-label");
      if (ariaLabel?.toLowerCase().includes("caption")) {
        return element;
      }
    }
    return null;
  }
  /**
   * Hide the original caption display (CSS already handles this, but add inline styles as backup)
   */
  hideOriginalCaptions(container) {
    container.style.setProperty("position", "fixed", "important");
    container.style.setProperty("left", "-9999px", "important");
    container.style.setProperty("opacity", "0", "important");
    container.style.setProperty("pointer-events", "none", "important");
    console.log("[GoogleMeetCaptionController] Original captions hidden (CSS + inline styles)");
  }
  /**
   * Observe caption changes and extract text
   */
  observeCaptions(container) {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new MutationObserver(() => {
      this.extractCaptions(container);
    });
    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
    this.extractCaptions(container);
  }
  /**
   * Extract caption text from the container
   */
  extractCaptions(container) {
    try {
      const captionElements = container.querySelectorAll(".ygicle.VbkSUe");
      const captions = Array.from(captionElements).map((element) => ({
        text: element.textContent?.trim() || "",
        timestamp: Date.now()
      })).filter((caption) => caption.text.length > 0);
      if (captions.length > 0 && this.captionCallback) {
        this.captionCallback(captions);
      }
      if (captions.length > 0) {
        this.processCaptionForChunks(captions);
      }
    } catch (error) {
      console.error("[GoogleMeetCaptionController] Error extracting captions:", error);
    }
  }
  /**
   * Process captions to detect complete chunks (sentence endings or speaker changes)
   */
  processCaptionForChunks(captions) {
    const currentText = captions.map((c) => c.text).join(" ");
    if (currentText === this.lastCaptionText) {
      return;
    }
    this.captionBuffer = currentText;
    this.lastCaptionText = currentText;
    if (this.chunkTimer !== null) {
      clearTimeout(this.chunkTimer);
    }
    const hasSentenceEnding = /[.!?]\s*$/.test(currentText.trim());
    if (hasSentenceEnding) {
      this.triggerChunkComplete();
    } else {
      this.chunkTimer = setTimeout(() => {
        this.triggerChunkComplete();
      }, this.CHUNK_TIMEOUT);
    }
  }
  /**
   * Trigger chunk complete callback
   */
  triggerChunkComplete() {
    if (this.captionBuffer.trim() && this.chunkCompleteCallback) {
      const chunk = {
        text: this.captionBuffer.trim(),
        timestamp: Date.now()
      };
      console.log("[GoogleMeetCaptionController] Chunk complete:", chunk.text);
      this.chunkCompleteCallback(chunk);
      this.captionBuffer = "";
    }
    if (this.chunkTimer !== null) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  }
  /**
   * Register a callback for caption updates
   */
  onCaptionUpdate(callback) {
    this.captionCallback = callback;
  }
  /**
   * Register a callback for complete caption chunks
   */
  onChunkComplete(callback) {
    this.chunkCompleteCallback = callback;
  }
  /**
   * Cleanup
   */
  destroy() {
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
