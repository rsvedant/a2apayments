import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Admin functions for testing and data population
 * These functions bypass authentication and should only be used for testing
 * WARNING: In production, these should be protected or removed
 */

/**
 * Admin function to set HubSpot settings (no auth required)
 */
export const setHubSpotSettings = mutation({
	args: {
		userId: v.string(),
		hubspotApiKey: v.string(),
		hubspotEnabled: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("userSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				hubspotApiKey: args.hubspotApiKey,
				hubspotEnabled: args.hubspotEnabled ?? true,
			});
			return existing._id;
		} else {
			return await ctx.db.insert("userSettings", {
				userId: args.userId,
				hubspotApiKey: args.hubspotApiKey,
				hubspotEnabled: args.hubspotEnabled ?? true,
			});
		}
	},
});

/**
 * Admin function to get user settings (no auth required)
 */
export const getUserSettings = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		return settings;
	},
});

/**
 * Admin function to create a test call (no auth required)
 */
export const createTestCall = mutation({
	args: {
		userId: v.string(),
		title: v.string(),
		transcription: v.optional(v.string()),
		participants: v.optional(v.string()),
		duration: v.optional(v.number()),
		recordingUrl: v.optional(v.string()),
		metadata: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("calls", {
			userId: args.userId,
			title: args.title,
			transcription: args.transcription,
			participants: args.participants,
			duration: args.duration,
			recordingUrl: args.recordingUrl,
			processingStatus: "pending",
			metadata: args.metadata,
		});
	},
});

/**
 * Admin function to create a test actionable (no auth required)
 */
export const createTestActionable = mutation({
	args: {
		userId: v.string(),
		callId: v.id("calls"),
		type: v.union(v.literal("task"), v.literal("follow_up"), v.literal("deal")),
		title: v.string(),
		description: v.optional(v.string()),
		priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
		dueDate: v.optional(v.number()),
		status: v.union(
			v.literal("pending"),
			v.literal("in_progress"),
			v.literal("completed"),
			v.literal("cancelled")
		),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("actionables", {
			userId: args.userId,
			callId: args.callId,
			type: args.type,
			title: args.title,
			description: args.description,
			priority: args.priority,
			dueDate: args.dueDate,
			status: args.status,
			crmSynced: false,
		});
	},
});

/**
 * Admin function to list all calls for a user (no auth required)
 */
export const listUserCalls = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const calls = await ctx.db
			.query("calls")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.order("desc")
			.take(100);

		return calls;
	},
});

/**
 * Admin function to list all actionables for a user (no auth required)
 */
export const listUserActionables = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const actionables = await ctx.db
			.query("actionables")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.take(100);

		return actionables;
	},
});

/**
 * Admin function to get a call by ID (no auth required)
 */
export const getCall = query({
	args: {
		callId: v.id("calls"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.callId);
	},
});

/**
 * Admin function to get an actionable by ID (no auth required)
 */
export const getActionable = query({
	args: {
		actionableId: v.id("actionables"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.actionableId);
	},
});

/**
 * Admin action to sync a call to HubSpot (no auth required)
 * For testing purposes only - bypasses authentication
 */
export const syncCallToHubSpot = action({
	args: {
		callId: v.id("calls"),
		userId: v.string(),
	},
	handler: async (ctx, args): Promise<{ success: boolean; crmEntityId: string }> => {
		// Verify the call exists and belongs to the specified user
		const call: any = await ctx.runQuery(internal.calls.getInternal, { callId: args.callId });
		if (!call || call.userId !== args.userId) {
			throw new Error("Call not found or does not belong to the specified user");
		}

		// Call the internal sync function
		return await ctx.runAction(internal.crmSync.syncCallToHubSpot, {
			callId: args.callId,
			userId: args.userId,
		});
	},
});

/**
 * Admin action to sync an actionable to HubSpot (no auth required)
 * For testing purposes only - bypasses authentication
 */
export const syncActionableToHubSpot = action({
	args: {
		actionableId: v.id("actionables"),
		userId: v.string(),
	},
	handler: async (ctx, args): Promise<{ success: boolean; crmEntityId: string; crmEntityType: string }> => {
		// Verify the actionable exists and belongs to the specified user
		const actionable: any = await ctx.runQuery(internal.actionables.getInternal, {
			actionableId: args.actionableId,
		});
		if (!actionable || actionable.userId !== args.userId) {
			throw new Error("Actionable not found or does not belong to the specified user");
		}

		// Call the internal sync function
		return await ctx.runAction(internal.crmSync.syncActionableToHubSpot, {
			actionableId: args.actionableId,
			userId: args.userId,
		});
	},
});

