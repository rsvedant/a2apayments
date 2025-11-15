import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Start a new realtime session
 */
export const startSession = mutation({
	args: {
		userId: v.string(),
		agenda: v.string(),
		companyEmail: v.string(),
		companyName: v.optional(v.string()),
		systemPrompt: v.string(),
		livekitRoomName: v.optional(v.string()),
		livekitParticipantId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const sessionId = await ctx.db.insert("sessions", {
			userId: args.userId,
			agenda: args.agenda,
			companyEmail: args.companyEmail,
			companyName: args.companyName,
			systemPrompt: args.systemPrompt,
			status: "active",
			startedAt: Date.now(),
			livekitRoomName: args.livekitRoomName,
			livekitParticipantId: args.livekitParticipantId,
			suggestionCount: 0,
			conversationExchanges: 0,
		});

		return { sessionId };
	},
});

/**
 * End an active session
 */
export const endSession = mutation({
	args: {
		sessionId: v.id("sessions"),
		transcription: v.optional(v.string()),
		callId: v.optional(v.id("calls")),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get(args.sessionId);

		if (!session) {
			throw new Error("Session not found");
		}

		await ctx.db.patch(args.sessionId, {
			status: "ended",
			endedAt: Date.now(),
			transcription: args.transcription,
			callId: args.callId,
		});

		return { success: true };
	},
});

/**
 * Mark session as errored
 */
export const markSessionError = mutation({
	args: {
		sessionId: v.id("sessions"),
		errorMessage: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.sessionId, {
			status: "error",
			endedAt: Date.now(),
			errorMessage: args.errorMessage,
		});

		return { success: true };
	},
});

/**
 * Update session exchange count
 */
export const updateExchangeCount = mutation({
	args: {
		sessionId: v.id("sessions"),
		count: v.number(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.sessionId, {
			conversationExchanges: args.count,
		});
	},
});

/**
 * Store an AI suggestion
 */
export const storeSuggestion = mutation({
	args: {
		sessionId: v.id("sessions"),
		userId: v.string(),
		suggestionText: v.string(),
		context: v.string(),
		exchangeNumber: v.number(),
	},
	handler: async (ctx, args) => {
		// Store the suggestion
		const suggestionId = await ctx.db.insert("suggestions", {
			sessionId: args.sessionId,
			userId: args.userId,
			suggestionText: args.suggestionText,
			context: args.context,
			timestamp: Date.now(),
			exchangeNumber: args.exchangeNumber,
			displayed: false,
		});

		// Increment suggestion count on session
		const session = await ctx.db.get(args.sessionId);
		if (session) {
			await ctx.db.patch(args.sessionId, {
				suggestionCount: session.suggestionCount + 1,
			});
		}

		return { suggestionId };
	},
});

/**
 * Mark suggestion as displayed
 */
export const markSuggestionDisplayed = mutation({
	args: {
		suggestionId: v.id("suggestions"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.suggestionId, {
			displayed: true,
		});
	},
});

/**
 * Record user feedback on suggestion
 */
export const recordSuggestionFeedback = mutation({
	args: {
		suggestionId: v.id("suggestions"),
		helpful: v.boolean(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.suggestionId, {
			helpful: args.helpful,
		});
	},
});

/**
 * Get active session for a user
 */
export const getActiveSession = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query("sessions")
			.withIndex("by_userId_and_status", (q) =>
				q.eq("userId", args.userId).eq("status", "active")
			)
			.first();

		return session;
	},
});

/**
 * Get session by ID
 */
export const getSession = query({
	args: {
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.sessionId);
	},
});

/**
 * Get suggestions for a session
 */
export const getSessionSuggestions = query({
	args: {
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const suggestions = await ctx.db
			.query("suggestions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.collect();

		return suggestions.sort((a, b) => a.timestamp - b.timestamp);
	},
});

/**
 * Get user's session history
 */
export const getUserSessions = query({
	args: {
		userId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const sessions = await ctx.db
			.query("sessions")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.order("desc")
			.take(args.limit ?? 50);

		return sessions;
	},
});
