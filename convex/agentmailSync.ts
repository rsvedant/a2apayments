"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { AgentMailClient } from "agentmail";

/**
 * Agentmail API integration for sending automated follow-up emails
 * Uses environment variables for configuration (single shared account)
 * 
 * API: https://docs.agentmail.to/
 * Flow:
 * 1. Get/create an inbox using client.inboxes.list() or client.inboxes.create()
 * 2. Send messages using client.inboxes.messages.send(inboxEmail, {...})
 */

/**
 * Get or create an inbox for sending emails
 * Returns the inbox email address to use for sending
 */
async function getOrCreateInbox(client: AgentMailClient): Promise<string> {
	try {
		// First, try to list existing inboxes
		console.log("[Agentmail] Checking for existing inboxes...");
		const allInboxes = await client.inboxes.list() as any;
		
		console.log("[Agentmail] List response:", JSON.stringify(allInboxes));
		
		// Check various possible response formats
		const inboxes = allInboxes?.inboxes || allInboxes?.data || allInboxes;
		
		if (Array.isArray(inboxes) && inboxes.length > 0) {
			const firstInbox = inboxes[0];
			// The API returns 'inboxId' which is actually the full email address
			const inboxEmail = firstInbox.inboxId || firstInbox.email || firstInbox.inbox_email || firstInbox.address;
			console.log(`[Agentmail] ✅ Using existing inbox: ${inboxEmail}`);
			return inboxEmail;
		}
		
		// No inboxes exist, create one with a unique username
		const uniqueUsername = `agentsale-${Date.now()}`;
		console.log(`[Agentmail] No inboxes found. Creating new inbox with username: ${uniqueUsername}`);
		
		const newInbox = await client.inboxes.create({
			username: uniqueUsername,
			displayName: "AgentSale Sales Team",
		}) as any;
		
		console.log("[Agentmail] Create response:", JSON.stringify(newInbox));
		
		// The API returns 'inboxId' which is the full email address
		const inboxEmail = newInbox.inboxId || newInbox.email || newInbox.inbox_email || newInbox.address || `${uniqueUsername}@agentmail.to`;
		console.log(`[Agentmail] ✅ Created new inbox: ${inboxEmail}`);
		return inboxEmail;
	} catch (error: any) {
		console.error("[Agentmail] Error getting/creating inbox:", error);
		throw new Error(`Failed to get or create inbox: ${error.message}`);
	}
}

/**
 * Send an email via Agentmail API
 * Uses process.env.AGENTMAIL_API_KEY for authentication
 */
export const sendEmail = internalAction({
	args: {
		to: v.string(),
		subject: v.string(),
		body: v.string(),
		html: v.optional(v.string()), // Optional HTML version
	},
	handler: async (ctx, args): Promise<{ success: boolean; error?: string; messageId?: string }> => {
		try {
			// Get Agentmail API key from environment
			const agentmailApiKey = process.env.AGENTMAIL_API_KEY;

			if (!agentmailApiKey) {
				console.error("[Agentmail] AGENTMAIL_API_KEY not set in environment");
				return {
					success: false,
					error: "AGENTMAIL_API_KEY environment variable not set",
				};
			}

			// Initialize AgentMail client
			const client = new AgentMailClient({ apiKey: agentmailApiKey });

			// Get or create an inbox to send from
			const inboxEmail = await getOrCreateInbox(client);

			console.log(`[Agentmail] Sending email to ${args.to} from inbox ${inboxEmail}`);

			// Send email using official SDK
			// Docs: https://docs.agentmail.to/api-reference/messages
			const sentMessage = await client.inboxes.messages.send(
				inboxEmail, // The inbox we're sending FROM
				{
					to: args.to, // Recipient email
					subject: args.subject,
					text: args.body, // Plain text version (always send both for best deliverability)
					html: args.html, // Optional HTML version
				}
			) as any; // Type assertion - SDK types are incomplete but 'id' exists per docs

			console.log(`[Agentmail] ✅ Email sent successfully! Message ID: ${sentMessage.id}`);

			return {
				success: true,
				messageId: sentMessage.id,
			};
		} catch (error: any) {
			console.error(`[Agentmail] ❌ Error sending email:`, error);
			return {
				success: false,
				error: error.message || "Unknown error",
			};
		}
	},
});

/**
 * Send a follow-up email after a sales call
 * This is called from the call processing workflow
 */
export const sendCallFollowUpEmail = internalAction({
	args: {
		recipientEmail: v.string(),
		recipientName: v.optional(v.string()),
		callSummary: v.string(),
		actionItems: v.optional(v.array(v.string())),
		dealInfo: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
		try {
			const name = args.recipientName || "there";
			
			// Build email body
			let emailBody = `Hi ${name},\n\n`;
			emailBody += `Thank you for taking the time to speak with me today. I wanted to follow up on our conversation.\n\n`;
			
			// Add call summary
			emailBody += `**Call Summary:**\n${args.callSummary}\n\n`;
			
			// Add action items if provided
			if (args.actionItems && args.actionItems.length > 0) {
				emailBody += `**Next Steps:**\n`;
				args.actionItems.forEach((item, index) => {
					emailBody += `${index + 1}. ${item}\n`;
				});
				emailBody += `\n`;
			}
			
			// Add deal info if provided
			if (args.dealInfo) {
				emailBody += `**Opportunity Details:**\n${args.dealInfo}\n\n`;
			}
			
			emailBody += `Please let me know if you have any questions or if there's anything else I can help with.\n\n`;
			emailBody += `Looking forward to our next conversation!\n\n`;
			emailBody += `Best regards`;

			// Send the email
			const result = await ctx.runAction(internal.agentmailSync.sendEmail, {
				to: args.recipientEmail,
				subject: "Follow-up on our conversation",
				body: emailBody,
			});

			if (result.success) {
				console.log(`[Agentmail] Follow-up email sent to ${args.recipientEmail}`);
			} else {
				console.error(`[Agentmail] Failed to send follow-up email: ${result.error}`);
			}

			return result;
		} catch (error: any) {
			console.error(`[Agentmail] Error in sendCallFollowUpEmail:`, error);
			return {
				success: false,
				error: error.message || "Unknown error",
			};
		}
	},
});

/**
 * Send a deal creation notification email
 */
export const sendDealNotificationEmail = internalAction({
	args: {
		recipientEmail: v.string(),
		recipientName: v.optional(v.string()),
		dealName: v.string(),
		dealAmount: v.optional(v.string()),
		nextSteps: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
		try {
			const name = args.recipientName || "there";
			
			let emailBody = `Hi ${name},\n\n`;
			emailBody += `Great news! I've created an opportunity for "${args.dealName}" in our system.\n\n`;
			
			if (args.dealAmount) {
				emailBody += `**Opportunity Value:** ${args.dealAmount}\n\n`;
			}
			
			if (args.nextSteps) {
				emailBody += `**Next Steps:**\n${args.nextSteps}\n\n`;
			}
			
			emailBody += `I'm excited to work with you on this opportunity. Please let me know if you have any questions!\n\n`;
			emailBody += `Best regards`;

			const result = await ctx.runAction(internal.agentmailSync.sendEmail, {
				to: args.recipientEmail,
				subject: `Opportunity Created: ${args.dealName}`,
				body: emailBody,
			});

			if (result.success) {
				console.log(`[Agentmail] Deal notification sent to ${args.recipientEmail}`);
			}

			return result;
		} catch (error: any) {
			console.error(`[Agentmail] Error in sendDealNotificationEmail:`, error);
			return {
				success: false,
				error: error.message || "Unknown error",
			};
		}
	},
});

