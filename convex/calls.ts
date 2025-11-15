import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { authComponent } from "./auth";
import { callDataValidator } from "./validators";
import type { Id } from "./_generated/dataModel";

/**
 * List all calls for the authenticated user with optional filters and pagination
 */
export const list = query({
	args: {
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("processing"),
				v.literal("completed"),
				v.literal("failed")
			)
		),
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized");
		}

		const userId = user.userId;

		// Filter by status if provided
		if (args.status) {
			const results = await ctx.db
				.query("calls")
				.withIndex("by_userId_and_status", (q) =>
					q.eq("userId", userId).eq("processingStatus", args.status!)
				)
				.take(args.limit ?? 20);
			return results;
		} else {
			// Otherwise just filter by userId and order by creation time
			const results = await ctx.db
				.query("calls")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.order("desc")
				.take(args.limit ?? 20);
			return results;
		}
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
			transcription: args.transcription,
			participants: args.participants, // Already a JSON string from validator
			duration: args.duration,
			recordingUrl: args.recordingUrl,
			processingStatus: "pending",
			metadata: args.metadata, // Already a JSON string from validator
		});

		return callId;
	},
});

/**
 * Update call processing status
 */
export const updateProcessingStatus = mutation({
	args: {
		callId: v.id("calls"),
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed")
		),
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
			processingStatus: args.status,
		});

		return args.callId;
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
 * Update call metadata
 */
export const updateMetadata = mutation({
	args: {
		callId: v.id("calls"),
		metadata: v.string(), // JSON string
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
			metadata: args.metadata,
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

		// Delete associated actionables
		const actionables = await ctx.db
			.query("actionables")
			.withIndex("by_callId", (q) => q.eq("callId", args.callId))
			.collect();

		for (const actionable of actionables) {
			await ctx.db.delete(actionable._id);
		}

		// Delete associated insights
		const insights = await ctx.db
			.query("callInsights")
			.withIndex("by_callId", (q) => q.eq("callId", args.callId))
			.collect();

		for (const insight of insights) {
			await ctx.db.delete(insight._id);
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
 * Internal mutation to update processing status with error tracking (for use in actions)
 */
export const updateProcessingStatusInternal = internalMutation({
	args: {
		callId: v.id("calls"),
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed")
		),
		error: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const call = await ctx.db.get(args.callId);
		if (!call) {
			throw new Error("Call not found");
		}

		const updateData: any = {
			processingStatus: args.status,
			lastProcessingAttempt: Date.now(),
		};

		if (args.status === "failed" && args.error) {
			updateData.processingError = args.error;
			updateData.processingAttempts = (call.processingAttempts || 0) + 1;
		} else if (args.status === "completed") {
			// Clear error on success
			updateData.processingError = undefined;
		}

		await ctx.db.patch(args.callId, updateData);

		return args.callId;
	},
});

/**
 * Internal query to get pending calls with transcriptions (for cron processing)
 */
export const getPendingCallsWithTranscription = internalQuery({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const pendingCalls = await ctx.db
			.query("calls")
			.withIndex("by_userId_and_status", (q) => q.eq("processingStatus", "pending"))
			.collect();

		// Filter to only calls with transcriptions
		const callsWithTranscription = pendingCalls.filter(
			(call) => call.transcription && call.transcription.trim().length > 0
		);

		// Apply limit if provided
		if (args.limit) {
			return callsWithTranscription.slice(0, args.limit);
		}

		return callsWithTranscription;
	},
});
