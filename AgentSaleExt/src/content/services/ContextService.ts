/**
 * Service for managing user context and meeting information
 * Provides user profile, meeting agenda, and company documentation for AI assistance
 */

export interface UserProfile {
  name: string;
  email: string;
  role?: string;
  company?: string;
}

export interface MeetingContext {
  agenda?: string;
  meetingTitle?: string;
  participants?: string[];
  startTime?: number;
  callType?: 'sales' | 'demo' | 'discovery' | 'followup' | 'support' | 'other';
}

export interface CompanyDocumentation {
  productInfo?: string;
  pricing?: string;
  technicalSpecs?: string;
  salesPlaybook?: string;
  competitorInfo?: string;
  caseStudies?: string;
}

export interface SalesContext {
  userProfile: UserProfile;
  meetingContext: MeetingContext;
  companyDocs: CompanyDocumentation;
}

export class ContextService {
  private userProfile: UserProfile | null = null;
  private meetingContext: MeetingContext | null = null;
  private companyDocs: CompanyDocumentation = {};
  private initialized: boolean = false;

  constructor() {
    // Don't call async methods in constructor
    // Initialize will be called explicitly
  }

  /**
   * Initialize the service (must be called after construction)
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      await this.loadUserProfile();
      await this.loadMeetingContext();
      await this.loadCompanyDocumentation();
      this.initialized = true;
      console.log('[ContextService] Initialization complete');
    } catch (error) {
      console.error('[ContextService] Initialization error:', error);
    }
  }

  /**
   * Load user profile from Chrome storage
   */
  private async loadUserProfile(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('[ContextService] Chrome storage not available for user profile');
        return;
      }

      const result = await chrome.storage.local.get(['userProfile']);
      this.userProfile = result.userProfile || null;
      
      if (!this.userProfile) {
        console.warn('[ContextService] No user profile found. Will be set via UI.');
      } else {
        console.log('[ContextService] User profile loaded:', this.userProfile.name);
      }
    } catch (error) {
      console.error('[ContextService] Error loading user profile:', error);
    }
  }

  /**
   * Load meeting context from Chrome storage or extract from Google Meet
   */
  private async loadMeetingContext(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        this.meetingContext = {};
      } else {
        const result = await chrome.storage.local.get(['meetingContext']);
        this.meetingContext = result.meetingContext || {};
      }
      
      // Try to extract meeting info from Google Meet page
      const meetingTitle = this.extractMeetingTitle();
      if (meetingTitle && this.meetingContext) {
        this.meetingContext.meetingTitle = meetingTitle;
      }
      
      if (this.meetingContext) {
        this.meetingContext.startTime = Date.now();
      }
      
      console.log('[ContextService] Meeting context loaded:', this.meetingContext);
    } catch (error) {
      console.error('[ContextService] Error loading meeting context:', error);
      this.meetingContext = {};
    }
  }

  /**
   * Load company documentation from Chrome storage or RAG system
   */
  private async loadCompanyDocumentation(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        this.companyDocs = {};
        return;
      }

      const result = await chrome.storage.local.get(['companyDocs']);
      this.companyDocs = result.companyDocs || {};
      
      console.log('[ContextService] Company documentation loaded');
    } catch (error) {
      console.error('[ContextService] Error loading company documentation:', error);
      this.companyDocs = {};
    }
  }

  /**
   * Extract meeting title from Google Meet page
   */
  private extractMeetingTitle(): string | null {
    // Try to find meeting title in the page
    const titleElement = document.querySelector('[data-meeting-title]');
    if (titleElement) {
      return titleElement.textContent?.trim() || null;
    }
    
    // Fallback: try to get from page title
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.includes('Google Meet')) {
      return pageTitle.split('|')[0].trim();
    }
    
    return null;
  }

  /**
   * Set user profile
   */
  public async setUserProfile(profile: UserProfile): Promise<void> {
    this.userProfile = profile;
    await chrome.storage.local.set({ userProfile: profile });
    console.log('[ContextService] User profile updated');
  }

  /**
   * Set meeting context
   */
  public async setMeetingContext(context: MeetingContext): Promise<void> {
    this.meetingContext = { ...this.meetingContext, ...context };
    await chrome.storage.local.set({ meetingContext: this.meetingContext });
    console.log('[ContextService] Meeting context updated');
  }

  /**
   * Set company documentation
   */
  public async setCompanyDocumentation(docs: CompanyDocumentation): Promise<void> {
    this.companyDocs = { ...this.companyDocs, ...docs };
    await chrome.storage.local.set({ companyDocs: this.companyDocs });
    console.log('[ContextService] Company documentation updated');
  }

  /**
   * Get complete sales context for AI assistant
   */
  public getSalesContext(): SalesContext {
    return {
      userProfile: this.userProfile || {
        name: 'Sales Representative',
        email: 'user@company.com',
      },
      meetingContext: this.meetingContext || {},
      companyDocs: this.companyDocs,
    };
  }

  /**
   * Check if user profile is configured
   */
  public hasUserProfile(): boolean {
    return !!this.userProfile?.name && !!this.userProfile?.email;
  }

  /**
   * Query RAG system for relevant documentation
   */
  public async queryRAG(query: string): Promise<string[]> {
    console.log('[ContextService] RAG query:', query);
    
    // ============================================================
    // ADD YOUR CUSTOM RAG IMPLEMENTATION HERE
    // ============================================================
    // Example:
    // const response = await fetch('your-rag-endpoint', {
    //   method: 'POST',
    //   body: JSON.stringify({ query }),
    // });
    // const data = await response.json();
    // return data.results;
    // ============================================================
    
    
    // Default: keyword matching with company docs
    const results: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Simple keyword matching
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('budget')) {
      if (this.companyDocs.pricing) {
        results.push(this.companyDocs.pricing);
      }
    }
    
    if (lowerQuery.includes('feature') || lowerQuery.includes('technical') || lowerQuery.includes('how')) {
      if (this.companyDocs.technicalSpecs) {
        results.push(this.companyDocs.technicalSpecs);
      }
    }
    
    if (lowerQuery.includes('competitor') || lowerQuery.includes('alternative') || lowerQuery.includes('vs')) {
      if (this.companyDocs.competitorInfo) {
        results.push(this.companyDocs.competitorInfo);
      }
    }
    
    if (lowerQuery.includes('case') || lowerQuery.includes('example') || lowerQuery.includes('success')) {
      if (this.companyDocs.caseStudies) {
        results.push(this.companyDocs.caseStudies);
      }
    }
    
    // Always include product info as general context
    if (this.companyDocs.productInfo && results.length < 3) {
      results.push(this.companyDocs.productInfo);
    }
    
    return results.slice(0, 3); // Limit to top 3 results
  }

  /**
   * Generate formatted context string for AI prompts
   */
  public getFormattedContext(): string {
    const context = this.getSalesContext();
    
    let formatted = '=== SALES CONTEXT ===\n\n';
    
    // User info
    formatted += '## Your Profile:\n';
    formatted += `Name: ${context.userProfile.name}\n`;
    formatted += `Email: ${context.userProfile.email}\n`;
    if (context.userProfile.role) {
      formatted += `Role: ${context.userProfile.role}\n`;
    }
    if (context.userProfile.company) {
      formatted += `Company: ${context.userProfile.company}\n`;
    }
    formatted += '\n';
    
    // Meeting info
    if (Object.keys(context.meetingContext).length > 0) {
      formatted += '## Meeting Information:\n';
      if (context.meetingContext.meetingTitle) {
        formatted += `Title: ${context.meetingContext.meetingTitle}\n`;
      }
      if (context.meetingContext.agenda) {
        formatted += `Agenda: ${context.meetingContext.agenda}\n`;
      }
      if (context.meetingContext.callType) {
        formatted += `Call Type: ${context.meetingContext.callType}\n`;
      }
      formatted += '\n';
    }
    
    // Company docs
    if (Object.keys(context.companyDocs).length > 0) {
      formatted += '## Company Documentation:\n';
      
      if (context.companyDocs.productInfo) {
        formatted += `Product Info: ${context.companyDocs.productInfo}\n\n`;
      }
      if (context.companyDocs.pricing) {
        formatted += `Pricing: ${context.companyDocs.pricing}\n\n`;
      }
      if (context.companyDocs.technicalSpecs) {
        formatted += `Technical Specs: ${context.companyDocs.technicalSpecs}\n\n`;
      }
      if (context.companyDocs.salesPlaybook) {
        formatted += `Sales Playbook: ${context.companyDocs.salesPlaybook}\n\n`;
      }
    }
    
    formatted += '===================\n\n';
    
    return formatted;
  }
}
