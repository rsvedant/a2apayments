import { useState, useEffect, useRef } from 'react';
import { GoogleMeetCaptionController, CaptionData, CompleteCaptionChunk } from './GoogleMeetCaptionController';
import { GeminiService } from '../services/GeminiService';
import './FloatingCaptions.css';

interface CaptionLine {
  id: string;
  text: string;
  timestamp: number;
}

function FloatingCaptions() {
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 250 });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const dragOffset = useRef({ x: 0, y: 0 });
  const controllerRef = useRef<GoogleMeetCaptionController | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const captionContainerRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    // Initialize services
    const controller = new GoogleMeetCaptionController();
    const geminiService = new GeminiService();
    
    controllerRef.current = controller;
    geminiServiceRef.current = geminiService;

    // Check if API key is configured
    setTimeout(() => {
      if (!geminiService.hasApiKey()) {
        setShowApiKeyPrompt(true);
      }
    }, 3000);

    // Set up caption callback
    controller.onCaptionUpdate((newCaptions: CaptionData[]) => {
      const captionLines = newCaptions.map((caption, index) => ({
        id: `${caption.timestamp}-${index}`,
        text: caption.text,
        timestamp: caption.timestamp,
      }));

      setCaptions(captionLines);

      // Auto-scroll to bottom
      if (captionContainerRef.current) {
        captionContainerRef.current.scrollTop = captionContainerRef.current.scrollHeight;
      }
    });

    // Set up chunk complete callback for AI suggestions
    controller.onChunkComplete(async (chunk: CompleteCaptionChunk) => {
      console.log('[FloatingCaptions] Processing chunk for suggestions:', chunk.text);
      
      // Add to conversation history
      conversationHistoryRef.current.push(chunk.text);
      if (conversationHistoryRef.current.length > 10) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-10);
      }

      // Generate suggestions
      if (geminiService.hasApiKey() && geminiService.canMakeRequest()) {
        setIsLoadingSuggestions(true);
        
        const result = await geminiService.generateSuggestions(
          chunk.text,
          conversationHistoryRef.current.slice(0, -1) // Don't include current chunk
        );

        if (result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
        }
        
        setIsLoadingSuggestions(false);
      }
    });

    return () => {
      controller.destroy();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.floating-captions-header')) {
      setIsDragging(true);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const clearCaptions = () => {
    setCaptions([]);
  };

  const handleApiKeySubmit = async () => {
    if (apiKeyInput.trim() && geminiServiceRef.current) {
      await geminiServiceRef.current.setApiKey(apiKeyInput.trim());
      setShowApiKeyPrompt(false);
      setApiKeyInput('');
    }
  };

  const copySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion);
    console.log('[FloatingCaptions] Copied suggestion:', suggestion);
  };

  return (
    <>
      {/* API Key Prompt */}
      {showApiKeyPrompt && (
        <div className="api-key-prompt">
          <div className="api-key-prompt-content">
            <h3>Configure Gemini API Key</h3>
            <p>Enter your Google Gemini API key to enable AI-powered suggestions.</p>
            <input
              type="password"
              placeholder="Enter your API key..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
            />
            <div className="api-key-prompt-actions">
              <button onClick={handleApiKeySubmit}>Save</button>
              <button onClick={() => setShowApiKeyPrompt(false)}>Skip</button>
            </div>
            <small>Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></small>
          </div>
        </div>
      )}

      {/* Floating Caption Window */}
      <div
        className={`floating-captions ${isDragging ? 'dragging' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
      <div className="floating-captions-header">
        <div className="floating-captions-title">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <path d="M8 12h8M8 16h8" />
          </svg>
          Captions
        </div>
        <div className="floating-captions-controls">
          <button 
            className="caption-control-btn" 
            onClick={clearCaptions}
            title="Clear captions"
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button 
            className="caption-control-btn" 
            onClick={toggleVisibility}
            title={isVisible ? 'Minimize' : 'Maximize'}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              {isVisible ? (
                <polyline points="4 14 10 14 10 20" />
              ) : (
                <polyline points="15 3 21 3 21 9" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {isVisible && (
        <>
          <div className="floating-captions-content" ref={captionContainerRef}>
            {captions.length === 0 ? (
              <div className="floating-captions-empty">
                Waiting for captions...
              </div>
            ) : (
              <div className="floating-captions-list">
                {captions.map((caption) => (
                  <div key={caption.id} className="caption-line">
                    {caption.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Suggestions Section */}
          {(suggestions.length > 0 || isLoadingSuggestions) && (
            <div className="ai-suggestions-section">
              <div className="ai-suggestions-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span>AI Suggestions</span>
              </div>
              
              {isLoadingSuggestions ? (
                <div className="ai-suggestions-loading">
                  <div className="loading-spinner"></div>
                  <span>Generating suggestions...</span>
                </div>
              ) : (
                <div className="ai-suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="ai-suggestion-item"
                      onClick={() => copySuggestion(suggestion)}
                      title="Click to copy"
                    >
                      <span className="suggestion-number">{index + 1}</span>
                      <span className="suggestion-text">{suggestion}</span>
                      <svg className="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

export default FloatingCaptions;
