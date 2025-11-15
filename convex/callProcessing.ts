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
		error?: string 
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

			// Get user settings for context and HubSpot config
			const settings = await ctx.runQuery(internal.userSettings.getInternal, { userId: args.userId });
			if (!settings?.hubspotApiKey || !settings.hubspotEnabled) {
				throw new Error("HubSpot integration not configured");
			}

			// Extract semantic entities using LLM
			const extracted = await ctx.runAction(internal.semanticExtraction.extractSemanticEntities, {
				transcription: call.transcription,
				participantsJson: call.participants,
				systemPrompt: settings.systemPrompt,
				salesScript: settings.salesScript,
				companyDocs: settings.companyDocs,
				callTimestamp: call._creationTime,
			});

			// Process participants to HubSpot contacts
			let contactIds: string[] = [];
			if (extracted.contacts && extracted.contacts.length > 0) {
				const participantsJson = JSON.stringify(extracted.contacts);
				
				// Update call with enriched participants
				await ctx.runMutation(internal.calls.updateParticipants, {
					callId: args.callId,
					participants: participantsJson,
				});

				// Process participants to HubSpot contacts
				try {
					contactIds = await ctx.runAction(internal.contactSync.processParticipantsToContacts, {
						participantsJson,
						hubspotApiKey: settings.hubspotApiKey,
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
						hubspotApiKey: settings.hubspotApiKey,
					});
				} catch (error: any) {
					console.error("Failed to process participants to contacts:", error);
				}
			}

			if (contactIds.length === 0) {
				console.warn("No contacts found/created for this call. Continuing with entity creation...");
			}

			// Create tickets in HubSpot
			let ticketsCreated = 0;
			for (const ticket of extracted.tickets) {
				try {
					await ctx.runAction(internal.hubspotSync.createTicket, {
						ticket,
						contactIds,
						hubspotApiKey: settings.hubspotApiKey,
					});
					ticketsCreated++;
				} catch (error: any) {
					console.error(`Failed to create ticket: ${ticket.subject}`, error);
					// Continue processing other entities
				}
			}

			// Create deals in HubSpot
			let dealsCreated = 0;
			for (const deal of extracted.deals) {
				try {
					await ctx.runAction(internal.hubspotSync.createDeal, {
						deal,
						contactIds,
						hubspotApiKey: settings.hubspotApiKey,
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
					hubspotApiKey: settings.hubspotApiKey,
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
					hubspotApiKey: settings.hubspotApiKey,
				});
			} catch (error: any) {
				console.error("Failed to create meeting:", error);
				// Continue even if meeting creation fails
			}

			// Mark call as processed and update summary/topics
			await ctx.runMutation(internal.calls.markAsProcessed, {
				callId: args.callId,
				summary: extracted.note.body, // Use note body as summary
				topics: extracted.tickets.length > 0 || extracted.deals.length > 0 
					? JSON.stringify({
						tickets: extracted.tickets.map(t => t.subject),
						deals: extracted.deals.map(d => d.dealname),
					})
					: undefined,
			});

			return {
				success: true,
				ticketsCreated,
				dealsCreated,
			};
		} catch (error: any) {
			const errorMessage = error.message || "Unknown error";
			console.error(`Failed to process call ${args.callId}:`, errorMessage);

			return {
				success: false,
				ticketsCreated: 0,
				dealsCreated: 0,
				error: errorMessage,
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
