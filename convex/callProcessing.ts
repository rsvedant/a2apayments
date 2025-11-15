"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import type { Id } from "./_generated/dataModel";

/**
 * Extract structured data from call transcription using OpenAI
 */
export const extractCallData = internalAction({
	args: {
		transcription: v.string(),
		participantsJson: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
		salesScript: v.optional(v.string()),
		companyDocs: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<{
		actionables: Array<{
			type: "task" | "follow_up" | "deal";
			title: string;
			description?: string;
			priority: "low" | "medium" | "high";
			dueDate?: number; // Unix timestamp
			status: "pending" | "in_progress" | "completed" | "cancelled";
		}>;
		insights: {
			sentiment?: "positive" | "neutral" | "negative";
			talkRatio?: number; // 0-1 representing user talk percentage
			dealLikelihood?: number; // 0-100 score
			summary?: string;
			keyMoments?: Array<{ timestamp?: string; description: string }>;
			topics?: string[];
		};
		participantEnrichment?: Array<{
			email?: string;
			name?: string;
			phone?: string;
			company?: string;
			role?: string;
		}>;
	}> => {
		const openaiApiKey = process.env.OPENAI_API_KEY;
		if (!openaiApiKey) {
			throw new Error("OPENAI_API_KEY environment variable not set");
		}

		const openai = new OpenAI({ apiKey: openaiApiKey });

		// Build context from user settings
		let contextPrompt = "";
		if (args.systemPrompt) {
			contextPrompt += `\n\nSystem Context:\n${args.systemPrompt}`;
		}
		if (args.salesScript) {
			contextPrompt += `\n\nSales Script:\n${args.salesScript}`;
		}
		if (args.companyDocs) {
			contextPrompt += `\n\nCompany Documentation:\n${args.companyDocs}`;
		}

		// Parse existing participants if provided
		let participants: Array<Record<string, any>> = [];
		if (args.participantsJson) {
			try {
				participants = JSON.parse(args.participantsJson);
			} catch (error) {
				// Ignore parsing errors
			}
		}

		const systemPrompt = `You are an AI assistant that analyzes sales call transcriptions and extracts structured information.

Your task is to analyze the transcription and extract:
1. **Actionables**: Tasks, follow-ups, and potential deals mentioned during the call
2. **Insights**: Sentiment, talk ratio, deal likelihood, summary, key moments, and topics
3. **Participant Information**: Extract and enrich participant details from the conversation

${contextPrompt}

Return your analysis as a JSON object with the following structure:
{
  "actionables": [
    {
      "type": "task" | "follow_up" | "deal",
      "title": "Brief, actionable title",
      "description": "Detailed description (optional)",
      "priority": "low" | "medium" | "high",
      "dueDate": Unix timestamp in seconds (optional, estimate from context),
      "status": "pending"
    }
  ],
  "insights": {
    "sentiment": "positive" | "neutral" | "negative",
    "talkRatio": 0.0-1.0 (percentage of time the salesperson talked),
    "dealLikelihood": 0-100 (probability of closing the deal),
    "summary": "2-3 sentence summary of the call",
    "keyMoments": [
      {"timestamp": "HH:MM:SS format if available", "description": "What happened"}
    ],
    "topics": ["topic1", "topic2", ...]
  },
  "participantEnrichment": [
    {
      "email": "email@example.com",
      "name": "Full Name",
      "phone": "phone number",
      "company": "Company Name",
      "role": "Job Title"
    }
  ]
}

Be thorough but concise. Only extract actionables that are clearly mentioned or implied.`;

		const userPrompt = `Analyze the following sales call transcription:

${args.transcription}

${participants.length > 0 ? `\nKnown participants: ${JSON.stringify(participants)}` : ""}

Extract all actionables, insights, and participant information.`;

		try {
			const response = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				response_format: { type: "json_object" },
				temperature: 0.3, // Lower temperature for more consistent extraction
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("Empty response from OpenAI");
			}

			const extracted = JSON.parse(content);

			// Validate and normalize the response
			const actionables = Array.isArray(extracted.actionables) ? extracted.actionables : [];
			const insights = extracted.insights || {};
			const participantEnrichment = Array.isArray(extracted.participantEnrichment)
				? extracted.participantEnrichment
				: [];

			// Ensure actionables have required fields
			const normalizedActionables = actionables.map((a: any) => ({
				type: a.type || "task",
				title: a.title || "Untitled",
				description: a.description,
				priority: a.priority || "medium",
				dueDate: a.dueDate ? Math.floor(a.dueDate) : undefined,
				status: a.status || "pending",
			}));

			// Merge participant enrichment with existing participants
			let enrichedParticipants = participants;
			if (participantEnrichment.length > 0) {
				// Merge by matching email or name
				enrichedParticipants = participants.map((p) => {
					const enriched = participantEnrichment.find(
						(ep) =>
							(ep.email && p.email === ep.email) ||
							(ep.name && p.name === ep.name)
					);
					if (enriched) {
						return { ...p, ...enriched };
					}
					return p;
				});

				// Add new participants that weren't in the original list
				for (const ep of participantEnrichment) {
					const exists = enrichedParticipants.some(
						(p) =>
							(ep.email && p.email === ep.email) ||
							(ep.name && p.name === ep.name)
					);
					if (!exists) {
						enrichedParticipants.push(ep);
					}
				}
			}

			return {
				actionables: normalizedActionables,
				insights: {
					sentiment: insights.sentiment,
					talkRatio: insights.talkRatio !== undefined ? Math.max(0, Math.min(1, insights.talkRatio)) : undefined,
					dealLikelihood: insights.dealLikelihood !== undefined ? Math.max(0, Math.min(100, insights.dealLikelihood)) : undefined,
					summary: insights.summary,
					keyMoments: insights.keyMoments || [],
					topics: insights.topics || [],
				},
				participantEnrichment: enrichedParticipants.length > 0 ? enrichedParticipants : undefined,
			};
		} catch (error: any) {
			console.error("OpenAI extraction error:", error);
			throw new Error(`Failed to extract call data: ${error.message}`);
		}
	},
});

/**
 * Process a call transcription: extract data, create actionables/insights, sync to HubSpot
 */
export const processCallTranscription = internalAction({
	args: {
		callId: v.id("calls"),
		userId: v.string(),
	},
	handler: async (ctx, args): Promise<{ success: boolean; actionablesCreated: number; error?: string }> => {
		try {
			// Update call status to processing
			await ctx.runMutation(internal.calls.updateProcessingStatusInternal, {
				callId: args.callId,
				status: "processing",
			});

			// Get call data
			const call = await ctx.runQuery(internal.calls.getInternal, { callId: args.callId });
			if (!call) {
				throw new Error("Call not found");
			}

			if (!call.transcription) {
				throw new Error("Call has no transcription");
			}

			// Get user settings for context
			const settings = await ctx.runQuery(internal.userSettings.getInternal, { userId: args.userId });

			// Extract data using LLM
			const extracted = await ctx.runAction(internal.callProcessing.extractCallData, {
				transcription: call.transcription,
				participantsJson: call.participants,
				systemPrompt: settings?.systemPrompt,
				salesScript: settings?.salesScript,
				companyDocs: settings?.companyDocs,
			});

			// Create actionables
			let actionablesCreated = 0;
			for (const actionable of extracted.actionables) {
				try {
					await ctx.runMutation(internal.actionables.createInternal, {
						userId: args.userId,
						callId: args.callId,
						type: actionable.type,
						title: actionable.title,
						description: actionable.description,
						priority: actionable.priority,
						dueDate: actionable.dueDate,
						status: actionable.status,
					});
					actionablesCreated++;
				} catch (error: any) {
					console.error(`Failed to create actionable: ${actionable.title}`, error);
					// Continue processing other actionables
				}
			}

			// Create or update insights
			if (extracted.insights) {
				const insightsData = {
					callId: args.callId,
					sentiment: extracted.insights.sentiment,
					talkRatio: extracted.insights.talkRatio,
					dealLikelihood: extracted.insights.dealLikelihood,
					summary: extracted.insights.summary,
					keyMoments: extracted.insights.keyMoments
						? JSON.stringify(extracted.insights.keyMoments)
						: undefined,
					topics: extracted.insights.topics ? JSON.stringify(extracted.insights.topics) : undefined,
				};

				await ctx.runMutation(internal.callInsights.createInternal, insightsData);
			}

			// Update participants if enriched
			let contactIds: string[] = [];
			if (extracted.participantEnrichment && settings?.hubspotApiKey && settings.hubspotEnabled) {
				const enrichedParticipantsJson = JSON.stringify(extracted.participantEnrichment);

				// Update call with enriched participants
				await ctx.runMutation(internal.calls.updateParticipants, {
					callId: args.callId,
					participants: enrichedParticipantsJson,
				});

				// Process participants to HubSpot contacts
				try {
					contactIds = await ctx.runAction(internal.contactSync.processParticipantsToContacts, {
						participantsJson: enrichedParticipantsJson,
						hubspotApiKey: settings.hubspotApiKey,
					});
				} catch (error: any) {
					console.error("Failed to process participants to contacts:", error);
					// Continue even if contact sync fails
				}
			} else if (call.participants && settings?.hubspotApiKey && settings.hubspotEnabled) {
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

			// Sync call to HubSpot with contact associations
			if (settings?.hubspotApiKey && settings.hubspotEnabled) {
				try {
					await ctx.runAction(internal.crmSync.syncCallToHubSpotWithContacts, {
						callId: args.callId,
						userId: args.userId,
						contactIds,
					});

					// Sync actionables to HubSpot
					const actionables = await ctx.runQuery(internal.actionables.getByCallIdInternal, {
						callId: args.callId,
					});

					for (const actionable of actionables) {
						try {
							await ctx.runAction(internal.crmSync.syncActionableToHubSpotWithContacts, {
								actionableId: actionable._id,
								userId: args.userId,
								contactIds,
							});
						} catch (error: any) {
							console.error(`Failed to sync actionable ${actionable._id}:`, error);
						}
					}
				} catch (error: any) {
					console.error("Failed to sync call to HubSpot:", error);
					// Continue even if HubSpot sync fails
				}
			}

			// Update call status to completed
			await ctx.runMutation(internal.calls.updateProcessingStatusInternal, {
				callId: args.callId,
				status: "completed",
			});

			return {
				success: true,
				actionablesCreated,
			};
		} catch (error: any) {
			// Update call status to failed with error tracking
			const errorMessage = error.message || "Unknown error";
			await ctx.runMutation(internal.calls.updateProcessingStatusInternal, {
				callId: args.callId,
				status: "failed",
				error: errorMessage,
			});

			console.error(`Failed to process call ${args.callId}:`, errorMessage);

			return {
				success: false,
				actionablesCreated: 0,
			error: errorMessage,
		};
	}
	},
});

/**
 * Process all pending calls with transcriptions (called by cron)
 */
export const processPendingCallsInternal = internalAction({
	args: {},
	handler: async (ctx): Promise<{ processedCount: number; successCount: number; failedCount: number }> => {
		// Get pending calls with transcriptions (limit to 10 per run to avoid rate limits)
		const pendingCalls = await ctx.runQuery(internal.calls.getPendingCallsWithTranscription, {
			limit: 10,
		});

		let processedCount = 0;
		let successCount = 0;

		for (const call of pendingCalls) {
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

