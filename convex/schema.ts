import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// User settings and configuration
	userSettings: defineTable({
		userId: v.string(),
		systemPrompt: v.optional(v.string()),
		salesScript: v.optional(v.string()),
		companyDocs: v.optional(v.string()),
		mossIndexName: v.optional(v.string()),
		// HubSpot CRM integration
		hubspotApiKey: v.optional(v.string()),
		hubspotEnabled: v.boolean(),
		// Locus payment integration
		locusApiKey: v.optional(v.string()),
		locusWalletAddress: v.optional(v.string()),
		locusEnabled: v.boolean(),
	}).index("by_userId", ["userId"]),

	// Call recordings and transcriptions
	calls: defineTable({
		userId: v.string(),
		title: v.optional(v.string()),
		companyName: v.optional(v.string()),
		aiSuggestionCount: v.optional(v.number()),
		transcription: v.string(),
		participants: v.string(), // JSON string of participant objects
		duration: v.optional(v.number()), // Duration in seconds
		recordingUrl: v.optional(v.string()),
		talkRatio: v.optional(v.number()), // 0-1 representing user talk percentage
		topics: v.optional(v.string()), // JSON string of topics array
		summary: v.optional(v.string()),
		processed: v.boolean(), // Has this call been processed?
	})
		.index("by_userId", ["userId"])
		.index("by_userId_and_processed", ["userId", "processed"]),

	// CRM sync status tracking
	// crmSyncStatus: defineTable({
	// 	userId: v.string(),
	// 	entityType: v.union(
	// 		v.literal("call"),
	// 		v.literal("actionable"),
	// 		v.literal("contact")
	// 	),
	// 	entityId: v.string(), // ID of the entity being synced
	// 	crmEntityType: v.optional(v.string()), // HubSpot entity type
	// 	crmEntityId: v.optional(v.string()), // HubSpot entity ID
	// 	syncStatus: v.union(
	// 		v.literal("pending"),
	// 		v.literal("syncing"),
	// 		v.literal("completed"),
	// 		v.literal("failed")
	// 	),
	// 	lastAttempt: v.optional(v.number()), // Timestamp
	// 	retryCount: v.number(),
	// 	errorMessage: v.optional(v.string()),
	// })
	// 	.index("by_entityId", ["entityId"])
	// 	.index("by_userId_and_status", ["userId", "syncStatus"]),

	// Call insights from LLM analysis
	// callInsights: defineTable({
	// 	userId: v.string(),
	// 	callId: v.id("calls"),
	// 	sentiment: v.optional(
	// 		v.union(v.literal("positive"), v.literal("neutral"), v.literal("negative"))
	// 	),
	// 	talkRatio: v.optional(v.number()), // 0-1 representing user talk percentage
	// 	keyMoments: v.optional(v.string()), // JSON string of key moment objects
	// 	topics: v.optional(v.string()), // JSON string of topics array
	// 	dealLikelihood: v.optional(v.number()), // 0-100 score
	// 	summary: v.optional(v.string()),
	// }).index("by_callId", ["callId"]),

	// Realtime session tracking
	sessions: defineTable({
		userId: v.string(),
		callId: v.optional(v.id("calls")),
		agenda: v.string(),
		companyEmail: v.string(),
		companyName: v.optional(v.string()),
		systemPrompt: v.string(),
		status: v.union(
			v.literal("active"),
			v.literal("ended"),
			v.literal("error")
		),
		startedAt: v.number(), // Timestamp
		endedAt: v.optional(v.number()), // Timestamp
		livekitRoomName: v.optional(v.string()),
		livekitParticipantId: v.optional(v.string()),
		transcription: v.optional(v.string()), // Full transcription
		suggestionCount: v.number(), // Total AI suggestions generated
		conversationExchanges: v.number(), // Number of back-and-forth exchanges tracked
		errorMessage: v.optional(v.string()),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_and_status", ["userId", "status"])
		.index("by_livekitRoomName", ["livekitRoomName"]),

	// AI Suggestions during realtime sessions
	suggestions: defineTable({
		sessionId: v.id("sessions"),
		userId: v.string(),
		suggestionText: v.string(),
		context: v.string(), // Recent conversation context that triggered this suggestion
		timestamp: v.number(), // When the suggestion was generated
		exchangeNumber: v.number(), // Which conversation exchange this was for
		displayed: v.boolean(), // Whether shown to user
		helpful: v.optional(v.boolean()), // User feedback
	})
		.index("by_sessionId", ["sessionId"])
		.index("by_userId", ["userId"])
		.index("by_timestamp", ["timestamp"]),
});
