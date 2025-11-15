import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { authComponent } from "./auth";
import { callDataValidator } from "./validators";
import type { Id } from "./_generated/dataModel";

/**
 * List all calls for the authenticated user with optional pagination
 */
export const list = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		const userId = user.userId;

		// Filter by userId and order by creation time
		const results = await ctx.db
			.query("calls")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.take(args.limit ?? 20);

		return results;
	},
});

/**
 * Get a single call by ID
 */
export const get = query({
	args: { callId: v.id("calls") },
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		const call = await ctx.db.get(args.callId);

		if (!call) {
			throw new Error("Call not found");
		}

		// Verify the call belongs to the user
		if (call.userId !== user.userId) {
			throw new Error("Unauthorized");
		}

		return call;
	},
});

/**
 * Create a new call record
 */
export const create = mutation({
	args: callDataValidator,
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		// Create the call record
		const callId = await ctx.db.insert("calls", {
			userId: user.userId,
			title: args.title,
			transcription: args.transcription ?? "", // Required field, default to empty string
			participants: args.participants ?? "[]", // Required field, default to empty JSON array
			duration: args.duration,
			recordingUrl: args.recordingUrl,
			processed: false, // Initially not processed
		});

		return callId;
	},
});


/**
 * Update call transcription
 */
export const updateTranscription = mutation({
	args: {
		callId: v.id("calls"),
		transcription: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		const call = await ctx.db.get(args.callId);

		if (!call) {
			throw new Error("Call not found");
		}

		// Verify the call belongs to the user
		if (call.userId !== user.userId) {
			throw new Error("Unauthorized");
		}

		await ctx.db.patch(args.callId, {
			transcription: args.transcription,
		});

		return args.callId;
	},
});


/**
 * Delete a call
 */
export const deleteCall = mutation({
	args: { callId: v.id("calls") },
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		const call = await ctx.db.get(args.callId);

		if (!call) {
			throw new Error("Call not found");
		}

		// Verify the call belongs to the user
		if (call.userId !== user.userId) {
			throw new Error("Unauthorized");
		}

		// Delete the call
		await ctx.db.delete(args.callId);

		return { success: true };
	},
});

/**
 * Get recent calls (last 10)
 */
export const getRecent = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		const userId = user.userId;

		const calls = await ctx.db
			.query("calls")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.take(10);

		return calls;
	},
});

/**
 * Internal query to get a call by ID (for use in actions)
 */
export const getInternal = internalQuery({
	args: { callId: v.id("calls") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.callId);
	},
});

/**
 * Internal mutation to create a call (for testing - bypasses auth)
 */
export const createInternal = internalMutation({
	args: {
		userId: v.string(),
		title: v.string(),
		transcription: v.string(),
		participants: v.optional(v.string()),
		duration: v.optional(v.number()),
		recordingUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const callId = await ctx.db.insert("calls", {
			userId: args.userId,
			title: args.title,
			transcription: args.transcription,
			participants: args.participants ?? "[]",
			duration: args.duration,
			recordingUrl: args.recordingUrl,
			processed: false,
		});

		return callId;
	},
});

/**
 * Internal mutation to update call participants (for use in actions)
 */
export const updateParticipants = internalMutation({
	args: {
		callId: v.id("calls"),
		participants: v.string(), // JSON string
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.callId, {
			participants: args.participants,
		});

		return args.callId;
	},
});

/**
 * Internal mutation to mark call as processed (for use in actions)
 */
export const markAsProcessed = internalMutation({
	args: {
		callId: v.id("calls"),
		summary: v.optional(v.string()),
		topics: v.optional(v.string()), // JSON string
	},
	handler: async (ctx, args) => {
		const updateData: any = {
			processed: true,
		};

		if (args.summary !== undefined) {
			updateData.summary = args.summary;
		}
		if (args.topics !== undefined) {
			updateData.topics = args.topics;
		}

		await ctx.db.patch(args.callId, updateData);
		return args.callId;
	},
});

/**
 * Internal query to get unprocessed calls with transcriptions (for cron processing)
 */
export const getUnprocessedCalls = internalQuery({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		// Query all calls and filter for unprocessed ones with transcriptions
		const allCalls = await ctx.db.query("calls").collect();
		
		const unprocessedCalls = allCalls.filter(
			(call) => !call.processed && call.transcription && call.transcription.trim().length > 0
		);

		// Apply limit if provided
		if (args.limit) {
			return unprocessedCalls.slice(0, args.limit);
		}

		return unprocessedCalls;
	},
});


