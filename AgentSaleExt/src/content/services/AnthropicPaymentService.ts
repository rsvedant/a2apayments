/**
 * Service for making payments via Anthropic with Locus MCP
 * Processes call summaries and executes payments to wallet addresses
 */

import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface PaymentRequest {
  walletAddress: string;
  callSummary: string;
  amount?: number; // Optional: let agent decide based on call
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export class AnthropicPaymentService {
  private client: Anthropic;
  private mcpClient: Client | null = null;
  private mcpTools: any[] = [];
  private apiKey: string = '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';
  private mcpServerUrl: string = 'https://docs.paywithlocus.com/~gitbook/mcp';
  private mcpToken: string = 'locus_dev_KFhiD9FKKrgfsoQy-iiZ3N2McEkX0AyN';

  constructor() {
    // Initialize Anthropic client with hardcoded API key
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true // Required for Chrome extension
    });
    console.log('[AnthropicPaymentService] Anthropic client initialized with hardcoded credentials');
    
    // Initialize MCP connection
    this.initializeMCP();
    
    // Still load from storage to allow overrides
    this.loadConfiguration();
  }

  /**
   * Initialize MCP client connection to Locus server
   */
  private async initializeMCP(): Promise<void> {
    try {
      console.log('[AnthropicPaymentService] Connecting to MCP server...');
      
      // Create SSE transport for MCP connection
      const url = new URL(this.mcpServerUrl);
      const transport = new SSEClientTransport(url);

      // Create MCP client
      this.mcpClient = new Client({
        name: "anthropic-payment-client",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      // Connect to MCP server
      await this.mcpClient.connect(transport);
      console.log('[AnthropicPaymentService] Connected to MCP server');

      // List available tools
      const toolsResponse = await this.mcpClient.listTools();
      console.log('[AnthropicPaymentService] Available MCP tools:', toolsResponse);
      
      // Convert MCP tools to Anthropic format
      this.mcpTools = toolsResponse.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        input_schema: tool.inputSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      }));
      
      console.log('[AnthropicPaymentService] Converted tools for Anthropic:', this.mcpTools);
    } catch (error) {
      console.error('[AnthropicPaymentService] Error initializing MCP:', error);
    }
  }

  /**
   * Load configuration from Chrome storage (optional overrides)
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        'anthropicApiKey',
        'mcpServerUrl',
        'mcpToken'
      ]);
      
      // Only override if values exist in storage
      if (result.anthropicApiKey) {
        this.apiKey = result.anthropicApiKey;
        this.client = new Anthropic({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true
        });
        console.log('[AnthropicPaymentService] Using Anthropic API key from storage');
      }
      
      if (result.mcpServerUrl) {
        this.mcpServerUrl = result.mcpServerUrl;
      }
      
      if (result.mcpToken) {
        this.mcpToken = result.mcpToken;
      }
    } catch (error) {
      console.error('[AnthropicPaymentService] Error loading configuration:', error);
    }
  }

  /**
   * Set Anthropic API key
   */
  public async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ anthropicApiKey: apiKey });
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true
    });
    console.log('[AnthropicPaymentService] Anthropic API key saved');
  }

  /**
   * Set MCP server configuration
   */
  public async setMcpConfig(serverUrl: string, token: string): Promise<void> {
    this.mcpServerUrl = serverUrl;
    this.mcpToken = token;
    await chrome.storage.local.set({
      mcpServerUrl: serverUrl,
      mcpToken: token
    });
    console.log('[AnthropicPaymentService] MCP configuration saved');
  }

  /**
   * Check if service is configured
   */
  public isConfigured(): boolean {
    // Always true since we have hardcoded credentials
    return true;
  }

  /**
   * Execute payment via Anthropic with Locus MCP
   */
  public async executePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('[AnthropicPaymentService] Executing payment via Anthropic with MCP...');
      
      if (!this.mcpClient || this.mcpTools.length === 0) {
        return {
          success: false,
          error: 'MCP client not initialized or no tools available'
        };
      }

      // Create prompt for payment
      const prompt = `Based on the following call summary, make a payment to the wallet address ${request.walletAddress}.

Call Summary:
${request.callSummary}

Instructions:
1. Analyze the call summary to determine an appropriate payment amount (or use ${request.amount || '10'} USDC if not specified)
2. Use the send_to_address tool to send USDC to wallet address: ${request.walletAddress}
3. Include a memo describing the payment reason based on the call summary
4. Return the transaction details

Please proceed with the payment.`;

      // Call Anthropic with MCP tools
      let response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        tools: this.mcpTools
      });

      console.log('[AnthropicPaymentService] Anthropic response:', response);

      // Handle tool calls in a loop
      const messages: any[] = [
        { role: "user", content: prompt },
        { role: "assistant", content: response.content }
      ];

      while (response.stop_reason === 'tool_use') {
        // Execute tool calls through MCP
        const toolResults = await Promise.all(
          response.content
            .filter((block: any) => block.type === 'tool_use')
            .map(async (toolUse: any) => {
              console.log('[AnthropicPaymentService] Executing MCP tool:', toolUse);
              
              try {
                const result = await this.mcpClient!.callTool({
                  name: toolUse.name,
                  arguments: toolUse.input
                });
                
                console.log('[AnthropicPaymentService] MCP tool result:', result);
                
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result.content)
                };
              } catch (error) {
                console.error('[AnthropicPaymentService] MCP tool error:', error);
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
                  is_error: true
                };
              }
            })
        );

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: toolResults
        });

        // Continue conversation with tool results
        response = await this.client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages,
          tools: this.mcpTools
        });

        console.log('[AnthropicPaymentService] Anthropic follow-up response:', response);
        messages.push({ role: 'assistant', content: response.content });
      }

      // Extract final text response
      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      if (textContent) {
        return {
          success: true,
          message: textContent,
          transactionId: this.extractTransactionId(textContent)
        };
      } else {
        return {
          success: false,
          error: 'No response from Anthropic'
        };
      }
    } catch (error) {
      console.error('[AnthropicPaymentService] Error executing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract transaction ID from response text
   */
  private extractTransactionId(responseText: string): string | undefined {
    // Try to extract transaction ID from response
    const txIdMatch = responseText.match(/transaction[:\s]+([0-9a-fx]+)/i);
    return txIdMatch ? txIdMatch[1] : undefined;
  }

  /**
   * Get payment context from MCP (budget, contacts, etc.)
   */
  public async getPaymentContext(): Promise<string> {
    if (!this.mcpServerUrl || !this.mcpToken) {
      return 'Payment context unavailable - service not configured';
    }

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: "Get my current payment context including budget status and available balance."
          }
        ],
        tools: [
          {
            type: "custom" as any,
            name: "mcp",
            mcp_servers: {
              "locus-agentpay": {
                url: this.mcpServerUrl,
                headers: {
                  Authorization: `Bearer ${this.mcpToken}`
                }
              }
            }
          }
        ]
      });

      const textContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      return textContent || 'No context available';
    } catch (error) {
      console.error('[AnthropicPaymentService] Error getting payment context:', error);
      return 'Error retrieving payment context';
    }
  }
}
