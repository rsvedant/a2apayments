import { useState, useEffect, useRef } from 'react';
import { GoogleMeetCaptionController, CaptionData, CompleteCaptionChunk } from './GoogleMeetCaptionController';
import { GeminiService } from '../services/GeminiService';
import { ContextService } from '../services/ContextService';
import { ConvexService } from '../services/ConvexService';
import MeetingSetup from './MeetingSetup';
import './FloatingCaptions.css';

interface CaptionLine {
  id: string;
  text: string;
  timestamp: number;
}

function FloatingCaptions() {
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [suggestionsApiKeyInput, setSuggestionsApiKeyInput] = useState('');
  const [summaryApiKeyInput, setSummaryApiKeyInput] = useState('');
  const [showMeetingSetup, setShowMeetingSetup] = useState(false);
  const [showUserIdPrompt, setShowUserIdPrompt] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [meetingStartTime] = useState(Date.now());
  const [participants, setParticipants] = useState<Array<{ name: string; email: string }>>([]);
  const controllerRef = useRef<GoogleMeetCaptionController | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const contextServiceRef = useRef<ContextService | null>(null);
  const convexServiceRef = useRef<ConvexService | null>(null);
  const captionContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<number | null>(null);
  const conversationHistoryRef = useRef<string[]>([]);
  const conversationSummaryRef = useRef<string>('');
  const fullTranscriptionRef = useRef<string[]>([]); // Store ALL captions

  useEffect(() => {
    // Show meeting setup modal for every call
    setShowMeetingSetup(true);

    // Initialize services
    const initializeServices = async () => {
      const contextService = new ContextService();
      const geminiService = new GeminiService(contextService);
      const convexService = new ConvexService();
      const controller = new GoogleMeetCaptionController();
      
      // Initialize services
      await contextService.initialize();
      await geminiService.initialize();
      
      controllerRef.current = controller;
      geminiServiceRef.current = geminiService;
      contextServiceRef.current = contextService;
      convexServiceRef.current = convexService;

      // Check if API key is configured
      setTimeout(() => {
        if (!geminiService.hasApiKey()) {
          setShowApiKeyPrompt(true);
        }
      }, 3000);

      // Check if userId is configured
      setTimeout(() => {
        if (!convexService.hasUserId()) {
          setShowUserIdPrompt(true);
        }
      }, 6000);

      // Set up caption callback
      controller.onCaptionUpdate((newCaptions: CaptionData[]) => {
      const captionLines = newCaptions.map((caption, index) => ({
        id: `${caption.timestamp}-${index}`,
        text: caption.text,
        timestamp: caption.timestamp,
      }));

      setCaptions(captionLines);

      // Update active caption index to the latest
      if (captionLines.length > 0) {
        setActiveCaptionIndex(captionLines.length - 1);
      }
    });

    // Set up chunk complete callback for AI suggestions
    controller.onChunkComplete(async (chunk: CompleteCaptionChunk) => {
      console.log('[FloatingCaptions] Processing chunk for suggestions:', chunk.text, 'by', chunk.speaker);
      
      // Add to FULL transcription (for Convex submission)
      fullTranscriptionRef.current.push(`${chunk.speaker}: ${chunk.text}`);
      
      // Add to conversation history (for AI suggestions)
      conversationHistoryRef.current.push(chunk.text);
      if (conversationHistoryRef.current.length > 10) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-10);
      }

      // Get current user's name from storage
      const userProfile = await chrome.storage.local.get(['userProfile']);
      const currentUserName = userProfile.userProfile?.name || '';
      
      // Only generate suggestions if speaker is NOT the current user
      const isOtherSpeaker = currentUserName && chunk.speaker !== currentUserName && chunk.speaker !== 'Unknown';
      
      if (isOtherSpeaker) {
        console.log('[FloatingCaptions] Other speaker detected, generating suggestions');
        
        // Generate suggestions with summary
        if (geminiService.hasApiKey() && geminiService.canMakeRequest()) {
          setIsLoadingSuggestions(true);
          
          const result = await geminiService.generateSuggestions(
            chunk.text,
            conversationHistoryRef.current.slice(0, -1), // Don't include current chunk
            conversationSummaryRef.current // Pass previous summary
          );

          if (result.suggestions.length > 0) {
            // Filter out blank/empty suggestions
            const validSuggestions = result.suggestions.filter(s => s.trim().length > 0);
            
            if (validSuggestions.length > 0) {
              // Append new suggestions to existing ones
              setSuggestions((prev) => {
                const newSuggestions = [...prev, ...validSuggestions];
                // Move to the first new suggestion
                const firstNewIndex = prev.length;
                setActiveSuggestionIndex(firstNewIndex);
                return newSuggestions;
              });
            }
          }
          
          // Update summary if returned
          if (result.summary) {
            conversationSummaryRef.current = result.summary;
            console.log('[FloatingCaptions] Conversation summary updated:', result.summary);
          }
          
          setIsLoadingSuggestions(false);
        }
      } else {
        console.log('[FloatingCaptions] Current user speaking, skipping suggestion generation');
      }
      });
    };

    // Call the async initialization
    initializeServices();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
      }
    };
  }, []);

  const toggleTranscription = () => {
    setShowTranscription(!showTranscription);
  };

  // Auto-scroll to keep active caption centered
  useEffect(() => {
    if (showTranscription && captions.length > 0 && captionContainerRef.current) {
      const activeElement = captionContainerRef.current.querySelector('.lyrics-line-active') as HTMLElement;
      if (activeElement) {
        const container = captionContainerRef.current;
        const containerHeight = container.clientHeight;
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.clientHeight;
        
        // Calculate position to center the active element
        const scrollTo = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        container.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    }
  }, [activeCaptionIndex, showTranscription, captions.length]);

  // Auto-scroll to keep active suggestion centered
  useEffect(() => {
    if (!showTranscription && suggestions.length > 0 && suggestionsContainerRef.current) {
      const activeElement = suggestionsContainerRef.current.querySelector('.suggestion-lyrics-active') as HTMLElement;
      if (activeElement) {
        const container = suggestionsContainerRef.current;
        const containerHeight = container.clientHeight;
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.clientHeight;
        
        // Calculate position to center the active element
        const scrollTo = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        container.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    }
  }, [activeSuggestionIndex, showTranscription, suggestions.length]);

  // Auto-scroll through suggestions
  useEffect(() => {
    if (!showTranscription && suggestions.length > 1 && !autoScrollPaused) {
      // Clear existing timer
      if (autoScrollTimerRef.current) {
        clearTimeout(autoScrollTimerRef.current);
      }

      // Set new timer to advance to next suggestion after 5 seconds
      autoScrollTimerRef.current = setTimeout(() => {
        setActiveSuggestionIndex((prev) => {
          const nextIndex = prev + 1;
          // Loop back to start if at end
          return nextIndex >= suggestions.length ? 0 : nextIndex;
        });
      }, 5000);

      return () => {
        if (autoScrollTimerRef.current) {
          clearTimeout(autoScrollTimerRef.current);
        }
      };
    }
  }, [activeSuggestionIndex, showTranscription, suggestions.length, autoScrollPaused]);

  // Keyboard navigation for suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if suggestions view is active
      if (showTranscription || suggestions.length === 0) return;

      // Pause auto-scroll on any keyboard interaction
      setAutoScrollPaused(true);
      
      // Resume auto-scroll after 10 seconds of inactivity
      if (autoScrollTimerRef.current) {
        clearTimeout(autoScrollTimerRef.current);
      }
      autoScrollTimerRef.current = setTimeout(() => {
        setAutoScrollPaused(false);
      }, 10000);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : prev
        );
      } else if (e.key === 'Enter' && suggestions[activeSuggestionIndex]) {
        e.preventDefault();
        copySuggestion(suggestions[activeSuggestionIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTranscription, suggestions, activeSuggestionIndex]);

  const clearCaptions = () => {
    setCaptions([]);
    setActiveCaptionIndex(0);
  };

  const handleApiKeySubmit = async () => {
    if (geminiServiceRef.current) {
      if (suggestionsApiKeyInput.trim()) {
        await geminiServiceRef.current.setSuggestionsApiKey(suggestionsApiKeyInput.trim());
      }
      if (summaryApiKeyInput.trim()) {
        await geminiServiceRef.current.setSummaryApiKey(summaryApiKeyInput.trim());
      }
      if (suggestionsApiKeyInput.trim() || summaryApiKeyInput.trim()) {
        setShowApiKeyPrompt(false);
        setSuggestionsApiKeyInput('');
        setSummaryApiKeyInput('');
      }
    }
  };

  const copySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion);
    console.log('[FloatingCaptions] Copied suggestion:', suggestion);
    
    // Show brief visual feedback
    const activeElement = document.querySelector('.suggestion-lyrics-active');
    if (activeElement) {
      activeElement.classList.add('suggestion-copied');
      setTimeout(() => {
        activeElement.classList.remove('suggestion-copied');
      }, 300);
    }
  };

  const extractParticipants = () => {
    try {
      // Extract participant from meeting setup (stored in Chrome storage)
      chrome.storage.local.get(['userProfile'], (result) => {
        if (result.userProfile && result.userProfile.name && result.userProfile.email) {
          setParticipants([{
            name: result.userProfile.name,
            email: result.userProfile.email
          }]);
        }
      });
    } catch (error) {
      console.error('[FloatingCaptions] Error extracting participants:', error);
    }
  };

  const getMeetingTitle = (): string => {
    try {
      // Try various selectors for meeting title
      const titleElement = 
        document.querySelector('[data-meeting-title]') ||
        document.querySelector('h1') ||
        document.querySelector('[role="heading"]');
      
      return titleElement?.textContent?.trim() || 'Google Meet Call';
    } catch (error) {
      console.error('[FloatingCaptions] Error getting meeting title:', error);
      return 'Google Meet Call';
    }
  };

  const handleUserIdSubmit = async () => {
    if (userIdInput.trim() && convexServiceRef.current) {
      await convexServiceRef.current.setUserId(userIdInput.trim());
      setShowUserIdPrompt(false);
      setUserIdInput('');
    }
  };

  const handleEndMeetingAndSave = async () => {
    if (!convexServiceRef.current || isSavingCall) return;

    setIsSavingCall(true);
    
    try {
      // Calculate duration
      const duration = Math.floor((Date.now() - meetingStartTime) / 1000);
      
      // Get full transcription
      const fullTranscription = fullTranscriptionRef.current.join('\n\n');
      
      if (!fullTranscription.trim()) {
        alert('No transcription to save!');
        setIsSavingCall(false);
        return;
      }

      // Format participants as JSON (already includes name and email)
      const participantsJson = JSON.stringify(participants);

      // Get meeting title
      const title = getMeetingTitle();

      // Submit to Convex
      const result = await convexServiceRef.current.submitCall({
        title,
        transcription: fullTranscription,
        participants: participantsJson,
        duration,
      });

      if (result.success) {
        alert(`✅ Meeting saved successfully!\n\nCall ID: ${result.callId}\n\nThe call will be processed and synced to HubSpot within 1 minute.`);
        
        // Clear transcription after successful save
        fullTranscriptionRef.current = [];
        conversationHistoryRef.current = [];
        setCaptions([]);
        setSuggestions([]);
      } else {
        alert(`❌ Failed to save meeting: ${result.error}`);
      }
    } catch (error) {
      console.error('[FloatingCaptions] Error saving call:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingCall(false);
    }
  };

  const handleMeetingSetupComplete = (data: any) => {
    console.log('[FloatingCaptions] Meeting setup complete with participant:', data);
    // Participant info is already saved to Chrome storage in MeetingSetup component
    setShowMeetingSetup(false);
    // Extract participants after setup
    extractParticipants();
  };

  return (
    <>
      {/* Meeting Setup */}
      {showMeetingSetup && (
        <MeetingSetup onComplete={handleMeetingSetupComplete} />
      )}

      {/* API Key Prompt */}
      {showApiKeyPrompt && (
        <div className="api-key-prompt">
          <div className="api-key-prompt-content">
            <h3>Configure Gemini API Keys</h3>
            <p>Use separate API keys for suggestions and summaries to manage costs and rate limits.</p>
            
            <div className="api-key-field">
              <label>Suggestions API Key (Required)</label>
              <input
                type="password"
                placeholder="Enter API key for suggestions..."
                value={suggestionsApiKeyInput}
                onChange={(e) => setSuggestionsApiKeyInput(e.target.value)}
              />
            </div>

            <div className="api-key-field">
              <label>Summary API Key (Optional)</label>
              <input
                type="password"
                placeholder="Enter API key for summaries (or leave empty to use suggestions key)..."
                value={summaryApiKeyInput}
                onChange={(e) => setSummaryApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
              />
            </div>

            <div className="api-key-prompt-actions">
              <button onClick={handleApiKeySubmit}>Save</button>
              <button onClick={() => setShowApiKeyPrompt(false)}>Skip</button>
            </div>
            <small>Get your API keys from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></small>
          </div>
        </div>
      )}

      {/* User ID Prompt */}
      {showUserIdPrompt && (
        <div className="api-key-prompt">
          <div className="api-key-prompt-content">
            <h3>Configure User ID</h3>
            <p>Enter your Convex user ID to save meeting data.</p>
            
            <input
              type="text"
              placeholder="Enter your user ID..."
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUserIdSubmit()}
              style={{ width: '100%', marginBottom: '16px' }}
            />

            <div className="api-key-prompt-actions">
              <button onClick={handleUserIdSubmit}>Save</button>
              <button onClick={() => setShowUserIdPrompt(false)}>Skip</button>
            </div>
            <small>Get your user ID from your admin or use a test ID like "user_123"</small>
          </div>
        </div>
      )}

      {/* Caption Area at Bottom */}
      <div className="caption-area-container">
      <div className="caption-area-header">
        <div className="caption-area-title">
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          AI Sales Assistant
        </div>
        <div className="caption-area-controls">
          {/* End Meeting & Save Button */}
          <button 
            className="caption-control-btn end-meeting-btn"
            onClick={handleEndMeetingAndSave}
            disabled={isSavingCall || !convexServiceRef.current?.hasUserId()}
            title={
              !convexServiceRef.current?.hasUserId()
                ? 'Configure user ID first'
                : 'End meeting and save to Convex'
            }
          >
            {isSavingCall ? '⏳' : '💾'}
          </button>

          <button 
            className="caption-control-btn" 
            onClick={toggleTranscription}
            title={showTranscription ? 'Show Suggestions' : 'Show Transcription'}
          >
            {showTranscription ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M8 12h8M8 16h8" />
              </svg>
            )}
          </button>
          <button 
            className="caption-control-btn" 
            onClick={clearCaptions}
            title="Clear captions"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="caption-area-content">
        {/* Show Suggestions by default (lyrics style) */}
        {!showTranscription && (
          <div className="suggestions-display lyrics-container" ref={suggestionsContainerRef}>
            {autoScrollPaused && suggestions.length > 1 && (
              <div className="auto-scroll-indicator">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                <span>Auto-scroll paused</span>
              </div>
            )}
            
            {isLoadingSuggestions && (
              <div className="suggestions-loading">
                <div className="loading-spinner-large"></div>
              </div>
            )}
            
            {!isLoadingSuggestions && suggestions.length === 0 && (
              <div className="suggestions-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <p>AI suggestions will appear here during the call</p>
              </div>
            )}
            
            {suggestions.length > 0 && (
              <div className="lyrics-scroll-container">
                <div className="suggestions-lyrics-list">
                  {suggestions.map((suggestion, index) => {
                    const distance = Math.abs(index - activeSuggestionIndex);
                    const isActive = index === activeSuggestionIndex;
                    const isFading = distance > 0 && distance <= 4; // Show 4 above and below
                    
                    return (
                      <div
                        key={index}
                        className={`suggestion-lyrics-line ${
                          isActive ? 'suggestion-lyrics-active' : 
                          isFading ? `suggestion-lyrics-fade-${Math.min(distance, 4)}` : 
                          'suggestion-lyrics-hidden'
                        }`}
                        onClick={() => {
                          setActiveSuggestionIndex(index);
                          copySuggestion(suggestion);
                          setAutoScrollPaused(true);
                          // Resume auto-scroll after 10 seconds
                          if (autoScrollTimerRef.current) {
                            clearTimeout(autoScrollTimerRef.current);
                          }
                          autoScrollTimerRef.current = setTimeout(() => {
                            setAutoScrollPaused(false);
                          }, 10000);
                        }}
                      >
                        <span className="suggestion-lyrics-number">{index + 1}</span>
                        <span className="suggestion-lyrics-text">{suggestion}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show Transcription when toggled */}
        {showTranscription && (
          <div className="transcription-display lyrics-container" ref={captionContainerRef}>
            {captions.length === 0 ? (
              <div className="transcription-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <path d="M8 12h8M8 16h8" />
                </svg>
                <p>Waiting for captions...</p>
              </div>
            ) : (
              <div className="lyrics-scroll-container">
                <div className="lyrics-list">
                  {captions.map((caption, index) => {
                    const distance = Math.abs(index - activeCaptionIndex);
                    const isActive = index === activeCaptionIndex;
                    const isFading = distance > 0 && distance <= 3;
                    
                    return (
                      <div 
                        key={caption.id} 
                        className={`lyrics-line ${
                          isActive ? 'lyrics-line-active' : 
                          isFading ? `lyrics-line-fade-${distance}` : 
                          'lyrics-line-hidden'
                        }`}
                        onClick={() => setActiveCaptionIndex(index)}
                      >
                        {caption.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      </div>
    </>
  );
}

export default FloatingCaptions;
