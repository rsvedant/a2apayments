# OpenAI Agent Payment Integration

## Overview

This integration adds automatic cryptocurrency payment functionality to the sales call extension. When a call is saved and synced to HubSpot, the system can automatically execute a payment via OpenAI agents using the Locus AgentPay MCP (Model Context Protocol).

## Architecture

```
User Clicks Save → HubSpot Sync → OpenAI Agent → Locus MCP → USDC Payment
```

## Components

### 1. OpenAIPaymentService (`src/content/services/OpenAIPaymentService.ts`)

A service that manages OpenAI agent configuration and payment execution.

**Key Features:**
- Configures OpenAI API key and MCP server credentials
- Creates agents with Locus AgentPay MCP tools
- Executes payments based on call summaries
- Extracts transaction IDs from agent responses

**Configuration Storage:**
- `openaiApiKey` - OpenAI API key (stored in Chrome local storage)
- `mcpServerUrl` - Locus MCP server URL (default: `https://mcp.locus.example.com`)
- `mcpToken` - MCP authentication token (prefixed with `locus_`)
- `paymentWalletAddress` - Recipient wallet address for payments

### 2. FloatingCaptions Component Updates

**New State Variables:**
- `showPaymentConfig` - Controls payment configuration modal visibility
- `openaiApiKeyInput` - Input for OpenAI API key
- `mcpServerUrlInput` - Input for MCP server URL
- `mcpTokenInput` - Input for MCP token
- `walletAddressInput` - Input for payment recipient address

**New UI Elements:**
- 💰 Payment Config Button - Opens payment configuration modal
- Payment Configuration Modal - Form to set up payment credentials

**Payment Flow:**
1. User clicks save button (💾)
2. Call is submitted to Convex (HubSpot sync)
3. If OpenAI payment service is configured:
   - Generate call summary from conversation
   - Create OpenAI agent with Locus MCP tool
   - Execute payment to configured wallet address
   - Display success/failure message with transaction details

## Usage

### Configuration

1. **Click the 💰 button** in the caption area header
2. **Enter credentials:**
   - OpenAI API Key (sk-...)
   - MCP Server URL (https://mcp.locus.example.com)
   - MCP Token (locus_...)
   - Payment Wallet Address (0x...)
3. **Click Save**

### Automatic Payments

Once configured, payments execute automatically when you:
1. End a meeting and click the save button (💾)
2. The system will:
   - Save the call to Convex
   - Generate a summary from the conversation
   - Create an OpenAI agent with payment capabilities
   - Execute a USDC payment to the configured wallet
   - Show transaction details in the success message

## OpenAI Agent Configuration

The agent is configured with:
- **Model:** `gpt-4o`
- **Tools:** Locus AgentPay MCP (hosted MCP tool)
- **Instructions:** Payment assistant that analyzes call summaries and executes USDC payments

### Agent Prompt

The agent receives:
- Call summary (from conversation or meeting metadata)
- Target wallet address
- Optional payment amount (defaults to 10 USDC)
- Instructions to use `send_to_address` tool

### MCP Tools Available

Through the Locus AgentPay MCP, the agent can access:
- `get_payment_context` - Get budget status and balance
- `send_to_address` - Send USDC to wallet address
- `send_to_contact` - Send to whitelisted contacts
- `send_to_email` - Send via email escrow
- x402 API tools (if configured)

## Error Handling

The service handles errors gracefully:
- **Not configured:** Skips payment, saves call normally
- **Payment fails:** Shows warning but confirms call was saved
- **Payment succeeds:** Shows success with transaction details

## Security Considerations

1. **API Keys:** Stored in Chrome local storage (encrypted by browser)
2. **Browser Context:** OpenAI client uses `dangerouslyAllowBrowser: true` (required for Chrome extensions)
3. **Token Format:** MCP tokens should be prefixed with `locus_`
4. **Wallet Validation:** Ensure wallet addresses are valid before configuration

## Example Flow

```typescript
// 1. User ends call and clicks save
handleEndMeetingAndSave()

// 2. Save to Convex
const result = await convexService.submitCall({...})

// 3. Generate summary
const callSummary = conversationSummaryRef.current || 
  `Meeting: ${title}\nDuration: ${duration} minutes\nParticipants: ${participants}`

// 4. Execute payment
const paymentResult = await openaiPaymentService.executePayment({
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  callSummary: callSummary
})

// 5. Show result
alert(`✅ Meeting saved!\n💰 Payment sent: ${paymentResult.message}`)
```

## Testing

To test without real payments:
1. Use a test MCP server URL
2. Configure with test wallet addresses
3. Monitor console logs for agent execution details
4. Check Chrome DevTools → Application → Local Storage for stored credentials

## Future Enhancements

- [ ] Support for payment amount calculation based on call duration
- [ ] Multiple payment recipients (split payments)
- [ ] Payment history tracking
- [ ] Integration with x402 paid API services
- [ ] Payment approval workflow
- [ ] Escrow payments via email/SMS
