"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Process a call transcription: extract semantic meaning and create HubSpot entities
 */
export const processCallTranscription = internalAction({
	args: {
		callId: v.id("calls"),
		userId: v.string(),
	},
	handler: async (ctx, args): Promise<{ 
		success: boolean; 
		ticketsCreated: number; 
		dealsCreated: number;
		emailsSent?: number;
		extracted?: any; // Include extraction results for testing
		error?: string;
		hubspotSyncEnabled?: boolean;
		agentmailSyncEnabled?: boolean;
	}> => {
		try {
			// Get call data
			const call = await ctx.runQuery(internal.calls.getInternal, { callId: args.callId });
			if (!call) {
				throw new Error("Call not found");
			}

			if (!call.transcription || call.transcription.trim().length === 0) {
				throw new Error("Call has no transcription");
			}

		// Get user settings for context and Agentmail config
		const settings = await ctx.runQuery(internal.userSettings.getInternal, { userId: args.userId });
		
		// Check if HubSpot is configured (via environment variable)
		const hubspotApiKey = process.env.HUBSPOT_API_KEY;
		const hubspotEnabled = !!hubspotApiKey;
		
		if (!hubspotApiKey) {
			console.warn("[HubSpot] HUBSPOT_API_KEY environment variable not set. HubSpot sync will be disabled.");
		} else {
			console.log("[HubSpot] API key found, sync enabled");
		}
		
		// Check if Agentmail is configured (per-user settings)
		const agentmailEnabled = !!(settings?.agentmailApiKey && settings.agentmailEnabled);

			// Extract semantic entities using LLM (always runs, regardless of HubSpot config)
			const extracted = await ctx.runAction(internal.semanticExtraction.extractSemanticEntities, {
				transcription: call.transcription,
				participantsJson: call.participants,
				systemPrompt: settings?.systemPrompt,
				salesScript: settings?.salesScript,
				companyDocs: settings?.companyDocs,
				callTimestamp: call._creationTime,
			});

			// Update call with enriched participants (always do this, even without HubSpot)
			if (extracted.contacts && extracted.contacts.length > 0) {
				const participantsJson = JSON.stringify(extracted.contacts);
				await ctx.runMutation(internal.calls.updateParticipants, {
					callId: args.callId,
					participants: participantsJson,
				});
			}

		// Only sync to HubSpot if it's configured
		let ticketsCreated = 0;
		let dealsCreated = 0;
		let emailsSent = 0;
		let contactIds: string[] = [];

			if (hubspotEnabled) {
				// Process participants to HubSpot contacts
				if (extracted.contacts && extracted.contacts.length > 0) {
					const participantsJson = JSON.stringify(extracted.contacts);
				try {
					contactIds = await ctx.runAction(internal.contactSync.processParticipantsToContacts, {
						participantsJson,
						hubspotApiKey: hubspotApiKey,
					});
				} catch (error: any) {
					console.error("Failed to process participants to contacts:", error);
					// Continue even if contact sync fails
				}
			} else if (call.participants) {
				// Process existing participants even if not enriched
				try {
					contactIds = await ctx.runAction(internal.contactSync.processParticipantsToContacts, {
						participantsJson: call.participants,
						hubspotApiKey: hubspotApiKey,
					});
					} catch (error: any) {
						console.error("Failed to process participants to contacts:", error);
					}
				}

				if (contactIds.length === 0) {
					console.warn("No contacts found/created for this call. Continuing with entity creation...");
				}

			// Create tickets in HubSpot
			for (const ticket of extracted.tickets) {
				try {
					await ctx.runAction(internal.hubspotSync.createTicket, {
						ticket,
						contactIds,
						hubspotApiKey: hubspotApiKey,
					});
					ticketsCreated++;
				} catch (error: any) {
					console.error(`Failed to create ticket: ${ticket.subject}`, error);
					// Continue processing other entities
				}
			}

			// Create deals in HubSpot
			for (const deal of extracted.deals) {
				try {
					await ctx.runAction(internal.hubspotSync.createDeal, {
						deal,
						contactIds,
						hubspotApiKey: hubspotApiKey,
					});
					dealsCreated++;
				} catch (error: any) {
					console.error(`Failed to create deal: ${deal.dealname}`, error);
					// Continue processing other entities
				}
			}

			// Create note in HubSpot (always created)
			try {
				await ctx.runAction(internal.hubspotSync.createNote, {
					note: extracted.note,
					contactIds,
					hubspotApiKey: hubspotApiKey,
					timestamp: new Date(call._creationTime).toISOString(),
				});
			} catch (error: any) {
				console.error("Failed to create note:", error);
				// Continue even if note creation fails
			}

			// Create meeting in HubSpot (always created)
			try {
				await ctx.runAction(internal.hubspotSync.createMeeting, {
					meeting: extracted.meeting,
					contactIds,
					hubspotApiKey: hubspotApiKey,
				});
			} catch (error: any) {
				console.error("Failed to create meeting:", error);
				// Continue even if meeting creation fails
			}
			} else {
				console.log("HubSpot not configured. Skipping HubSpot sync, but extraction results are available.");
			}

			// Mark call as processed and update summary/topics (always do this)
			await ctx.runMutation(internal.calls.markAsProcessed, {
				callId: args.callId,
				summary: extracted.note.body, // Use note body as summary
				topics: extracted.tickets.length > 0 || extracted.deals.length > 0 
					? JSON.stringify({
						tickets: extracted.tickets.map((t: any) => t.subject),
						deals: extracted.deals.map((d: any) => d.dealname),
					})
					: undefined,
			});

		return {
			success: true,
			ticketsCreated,
			dealsCreated,
			emailsSent,
			extracted, // Include extraction results for testing
			hubspotSyncEnabled: hubspotEnabled,
			agentmailSyncEnabled: agentmailEnabled,
		};
		} catch (error: any) {
			const errorMessage = error.message || "Unknown error";
			console.error(`Failed to process call ${args.callId}:`, errorMessage);

		return {
			success: false,
			ticketsCreated: 0,
			dealsCreated: 0,
			emailsSent: 0,
			error: errorMessage,
			hubspotSyncEnabled: false,
			agentmailSyncEnabled: false,
		};
		}
	},
});

/**
 * Process all unprocessed calls with transcriptions (called by cron)
 */
export const processUnprocessedCallsInternal = internalAction({
	args: {},
	handler: async (ctx): Promise<{ processedCount: number; successCount: number; failedCount: number }> => {
		// Get unprocessed calls with transcriptions (limit to 10 per run to avoid rate limits)
		const unprocessedCalls = await ctx.runQuery(internal.calls.getUnprocessedCalls, {
			limit: 10,
		});

		let processedCount = 0;
		let successCount = 0;

		for (const call of unprocessedCalls) {
			try {
				const result = await ctx.runAction(internal.callProcessing.processCallTranscription, {
					callId: call._id,
					userId: call.userId,
				});

				processedCount++;
				if (result.success) {
					successCount++;
				}
			} catch (error: any) {
				console.error(`Failed to process call ${call._id}:`, error.message);
				processedCount++;
				// Error is already handled in processCallTranscription
			}
		}

		return {
			processedCount,
			successCount,
			failedCount: processedCount - successCount,
		};
	},
});

/**
 * Test action: Create a test call and optionally process it immediately
 * Can be called from Convex dashboard for testing semantic extraction
 */
export const testCreateAndProcessCall = internalAction({
	args: {
		userId: v.string(),
		title: v.optional(v.string()),
		transcription: v.string(),
		participants: v.optional(v.string()),
		processImmediately: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<{
		callId: Id<"calls">;
		processed: boolean;
		processingResult?: { 
			success: boolean; 
			ticketsCreated: number; 
			dealsCreated: number; 
			extracted?: any;
			error?: string;
			hubspotSyncEnabled?: boolean;
		};
		error?: string;
		message?: string;
	}> => {
		// Create the test call
		const callId = await ctx.runMutation(internal.calls.createInternal, {
			userId: args.userId,
			title: args.title ?? "Test Sales Call",
			transcription: args.transcription,
			participants: args.participants,
		});

		// Optionally process it immediately
		if (args.processImmediately) {
			try {
				const result = await ctx.runAction(internal.callProcessing.processCallTranscription, {
					callId,
					userId: args.userId,
				});
				return {
					callId,
					processed: true,
					processingResult: result,
				};
			} catch (error: any) {
				return {
					callId,
					processed: false,
					error: error.message,
				};
			}
		}

		return {
			callId,
			processed: false,
			message: "Call created. It will be processed by cron within 1 minute, or you can manually process it.",
		};
	},
});
