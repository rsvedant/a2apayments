/**
 * Service for making payments via LLM7 with Locus MCP
 * Processes call summaries and executes payments to wallet addresses
 */

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

export class OpenAIPaymentService {
  private apiKey: string = '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';
  private mcpServerUrl: string = 'https://docs.paywithlocus.com/~gitbook/mcp';
  private mcpToken: string = 'locus_dev_KFhiD9FKKrgfsoQy-iiZ3N2McEkX0AyN';
  private llm7Url: string = 'https://api.llm7.io/v1/chat/completions';
  
  // Hardcode Locus MCP tools (send_to_address)
  private mcpTools = [{
    type: 'function',
    function: {
      name: 'send_to_address',
      description: 'Send USDC payment to a blockchain address on Base network',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'The recipient wallet address (0x...)'
          },
          amount: {
            type: 'number',
            description: 'Amount of USDC to send'
          },
          memo: {
            type: 'string',
            description: 'Optional memo/note for the payment'
          }
        },
        required: ['address', 'amount']
      }
    }
  }];

  constructor() {
    console.log('[OpenAIPaymentService] ✅ Service initialized with hardcoded Locus MCP tools');
    this.loadConfiguration();
  }

  /**
   * Load configuration from Chrome storage (optional overrides)
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        'openaiApiKey',
        'mcpServerUrl',
        'mcpToken'
      ]);
      
      // Only override if values exist in storage
      if (result.openaiApiKey) {
        this.apiKey = result.openaiApiKey;
        console.log('[OpenAIPaymentService] Using API key from storage');
      }
      
      if (result.mcpServerUrl) {
        this.mcpServerUrl = result.mcpServerUrl;
      }
      
      if (result.mcpToken) {
        this.mcpToken = result.mcpToken;
      }
    } catch (error) {
      console.error('[OpenAIPaymentService] Error loading configuration:', error);
    }
  }

  /**
   * Set API key for LLM7
   */
  public async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ openaiApiKey: apiKey });
    console.log('[OpenAIPaymentService] API key saved');
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
    console.log('[OpenAIPaymentService] MCP configuration saved');
  }

  /**
   * Check if service is configured
   */
  public isConfigured(): boolean {
    // Always true since we have hardcoded credentials
    return true;
  }

  /**
   * Execute payment via LLM7 with Locus MCP
   */
  public async executePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('[OpenAIPaymentService] Executing payment via LLM7 with Locus MCP...');

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

      // Initial request to LLM7
      let response = await fetch(this.llm7Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-o4-mini-2025-04-16",
          messages: [
            { role: "user", content: prompt }
          ],
          tools: this.mcpTools,
          tool_choice: "auto"
        })
      });

      let data = await response.json();
      console.log('[OpenAIPaymentService] LLM7 response:', data);

      // Check if LLM7 wants to call a tool
      if (data.choices[0].message.tool_calls) {
        const toolCall = data.choices[0].message.tool_calls[0];
        console.log('[OpenAIPaymentService] Tool call requested:', toolCall);

        // Execute the tool via Locus MCP HTTP endpoint (through background script to bypass CORS)
        const toolArgs = JSON.parse(toolCall.function.arguments);
        console.log('[OpenAIPaymentService] Calling Locus MCP with args:', toolArgs);

        const mcpResult = await new Promise<any>((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'MCP_CALL',
            url: this.mcpServerUrl,
            authorization: `Bearer ${this.mcpToken}`,
            body: {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: toolCall.function.name,
                arguments: toolArgs
              }
            }
          }, (response) => {
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error));
            }
          });
        });

        console.log('[OpenAIPaymentService] Locus MCP response:', mcpResult);
        const mcpData = mcpResult;

        // Format the tool result
        const toolResult = JSON.stringify(mcpData.result || mcpData);

        // Send tool result back to LLM7
        const messages = [
          { role: "user", content: prompt },
          data.choices[0].message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult
          }
        ];

        const finalResponse = await fetch(this.llm7Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-o4-mini-2025-04-16",
            messages
          })
        });

        const finalData = await finalResponse.json();
        console.log('[OpenAIPaymentService] Final LLM7 response:', finalData);

        const textContent = finalData.choices[0].message.content || '';
        return {
          success: true,
          message: textContent,
          transactionId: this.extractTransactionId(textContent)
        };
      } else {
        // No tool call, just return the response
        const textContent = data.choices[0].message.content || '';
        return {
          success: false,
          error: 'LLM7 did not call the payment tool: ' + textContent
        };
      }
    } catch (error) {
      console.error('[OpenAIPaymentService] Error executing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract transaction ID from agent response text
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
    if (!this.mcpClient || this.mcpTools.length === 0) {
      return 'Payment context unavailable - MCP not initialized';
    }

    try {
      const response = await fetch(this.llm7Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-o4-mini-2025-04-16",
          messages: [
            {
              role: "user",
              content: "Get my current payment context including budget status and available balance."
            }
          ],
          tools: this.mcpTools,
          tool_choice: "auto"
        })
      });

      const data = await response.json();
      const textContent = data.choices[0].message.content || 'No context available';
      return textContent;
    } catch (error) {
      console.error('[OpenAIPaymentService] Error getting payment context:', error);
      return 'Error retrieving payment context';
    }
  }
}
