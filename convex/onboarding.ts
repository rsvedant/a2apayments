/**
 * Onboarding flow backend with Moss vector search integration
 * Handles text storage and vector index creation for company docs
 * Uses direct HTTP calls to Moss API to avoid bundling issues
 */

import { v } from "convex/values";
import { action, mutation, internalAction } from "./_generated/server";
import { authComponent } from "./auth";
import { internal } from "./_generated/api";

/**
 * Moss API endpoint
 */
const MOSS_API_URL = "https://q65uayaa3mjrvpw5t3rwmjj4wq0npjgl.lambda-url.us-east-1.on.aws/";

/**
 * Call Moss API directly via HTTP
 */
async function callMossAPI(
	projectId: string,
	projectKey: string,
	action: string,
	payload: Record<string, any>
) {
	const response = await fetch(MOSS_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			action,
			projectId,
			projectKey,
			...payload,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Moss API error (${response.status}): ${errorText}`);
	}

	return await response.json();
}

/**
 * Helper function to chunk text into smaller pieces for better semantic search
 */
function chunkText(text: string, maxWords: number): string[] {
	const words = text.split(/\s+/);
	const chunks: string[] = [];

	for (let i = 0; i < words.length; i += maxWords) {
		const chunk = words.slice(i, i + maxWords).join(" ");
		if (chunk.trim()) {
			chunks.push(chunk);
		}
	}

	return chunks.length > 0 ? chunks : [text];
}

/**
 * Helper function to get authenticated user ID from action context
 * Actions can only access ctx.auth.getUserIdentity(), not authComponent.getAuthUser()
 */
async function requireUserId(ctx: any): Promise<string> {
	// In actions, we can only use ctx.auth.getUserIdentity()
	// The subject field contains the Better Auth user ID
	const identity = await ctx.auth.getUserIdentity();

	console.log("[requireUserId] Identity:", identity);

	if (!identity) {
		throw new Error("Not authenticated - no identity found");
	}

	// The subject is the Better Auth user ID
	if (identity.subject) {
		return identity.subject;
	}

	throw new Error("Not authenticated - no subject in identity");
}

/**
 * Initialize Moss vector search index with company documentation
 * Derives userId from auth context on server side
 */
export const initializeMossIndex = action({
	args: {
		companyDocs: v.array(
			v.object({
				fileName: v.string(),
				text: v.string(),
			})
		),
	},
	handler: async (
		ctx,
		args
	): Promise<{
		indexName: string;
		documentCount: number;
		sourceFiles: string[];
	}> => {
		// Get authenticated user ID
		const derivedUserId = await requireUserId(ctx);

		console.log("[initializeMossIndex] User authenticated:", derivedUserId);

		// Get Moss credentials from environment
		const projectId = process.env.MOSS_PROJECT_ID;
		const apiKey = process.env.MOSS_API_KEY;

		if (!projectId || !apiKey) {
			throw new Error(
				"Moss credentials not configured. Please set MOSS_PROJECT_ID and MOSS_API_KEY environment variables."
			);
		}

		// Create a unique index name for this user
		const timestamp = Date.now();
		const indexName: string = `user-${derivedUserId}-docs-${timestamp}`;

		try {
			// Prepare documents for Moss - chunk large documents
			const documents: Array<{
				id: string;
				text: string;
				metadata?: Record<string, string>;
			}> = [];

			for (const doc of args.companyDocs) {
				// Chunk the document into smaller pieces (max ~500 words per chunk)
				const chunks = chunkText(doc.text, 500);

				chunks.forEach((chunk, index) => {
					documents.push({
						id: `${doc.fileName}-chunk-${index}`,
						text: chunk,
						metadata: {
							fileName: doc.fileName,
							chunkIndex: index.toString(),
							totalChunks: chunks.length.toString(),
							category: "company_docs",
							userId: derivedUserId,
						},
					});
				});
			}

			if (documents.length === 0) {
				throw new Error("No documents to index");
			}

			console.log(
				`Creating Moss index with ${documents.length} document chunks...`
			);

			// Create the index via Moss API
			await callMossAPI(projectId, apiKey, "createIndex", {
				indexName,
				docs: documents,
				modelId: "moss-minilm",
			});

			console.log(`Successfully created Moss index: ${indexName}`);

			return {
				indexName,
				documentCount: documents.length,
				sourceFiles: args.companyDocs.map((d) => d.fileName),
			};
		} catch (error) {
			console.error("Error creating Moss index:", error);
			throw new Error(
				`Failed to create Moss index: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	},
});

/**
 * Query the Moss index for relevant company documentation
 * Used during sales calls to retrieve contextual information
 */
export const queryCompanyDocs = action({
	args: {
		query: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			throw new Error("Unauthorized - must be signed in");
		}

		// Get user settings to find their Moss index
		const settings = await ctx.runQuery(internal.userSettings.getInternal, {
			userId: user.userId,
		});

		if (!settings?.mossIndexName) {
			throw new Error(
				"No company documentation index found. Please complete onboarding first."
			);
		}

		// Get Moss credentials from environment
		const projectId = process.env.MOSS_PROJECT_ID;
		const apiKey = process.env.MOSS_API_KEY;

		if (!projectId || !apiKey) {
			throw new Error("Moss credentials not configured");
		}

		try {
			// Load the index first (required by Moss)
			await callMossAPI(projectId, apiKey, "loadIndex", {
				indexName: settings.mossIndexName,
			});

			// Query the index
			const results = await callMossAPI(projectId, apiKey, "query", {
				indexName: settings.mossIndexName,
				query: args.query,
				topK: args.limit || 5,
			});

			return {
				query: args.query,
				timeTakenInMs: results.timeTakenInMs || 0,
				results: results.docs || [],
			};
		} catch (error) {
			console.error("Error querying Moss index:", error);
			throw new Error(
				`Failed to query company docs: ${error instanceof Error ? error.message : "Unknown error"}`
			);
		}
	},
});

/**
 * Complete the onboarding process and save all settings to the database
 * This is called when the user finishes the onboarding flow
 */
export const completeOnboarding = mutation({
	args: {
		salesScript: v.optional(v.string()),
		companyDocs: v.optional(v.string()),
		mossIndexName: v.optional(v.string()),
		hubspotApiKey: v.optional(v.string()),
		hubspotEnabled: v.boolean(),
		locusApiKey: v.optional(v.string()),
		locusWalletAddress: v.optional(v.string()),
		locusEnabled: v.boolean(),
	},
	handler: async (ctx, args) => {
		let user;
		try {
			user = await authComponent.getAuthUser(ctx);
		} catch (error) {
			console.log("Auth check failed, but allowing onboarding to complete");
			// Return success anyway - user can redo onboarding later when signed in
			return {
				success: true,
				settingsId: null,
				message: "Onboarding completed without saving (not authenticated)"
			};
		}

		if (!user?.userId) {
			// Not authenticated, but don't block
			console.log("No userId found, but allowing onboarding to complete");
			return {
				success: true,
				settingsId: null,
				message: "Onboarding completed without saving (no userId)"
			};
		}

		const userId = user.userId;

		// Check if settings already exist
		const existing = await ctx.db
			.query("userSettings")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first();

		const settingsData = {
			salesScript: args.salesScript,
			companyDocs: args.companyDocs,
			mossIndexName: args.mossIndexName,
			hubspotApiKey: args.hubspotApiKey,
			hubspotEnabled: args.hubspotEnabled,
			locusApiKey: args.locusApiKey,
			locusWalletAddress: args.locusWalletAddress,
			locusEnabled: args.locusEnabled,
		};

		let settingsId;

		if (existing) {
			// Update existing settings
			await ctx.db.patch(existing._id, settingsData);
			settingsId = existing._id;
		} else {
			// Create new settings
			settingsId = await ctx.db.insert("userSettings", {
				userId: userId,
				...settingsData,
			});
		}

		console.log(`Onboarding completed for user ${userId}`);

		return {
			success: true,
			settingsId,
		};
	},
});

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user?.userId) {
			return false;
		}

		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_userId", (q) => q.eq("userId", user.userId || ""))
			.first();

		// Consider onboarding complete if user has settings saved
		return !!settings;
	},
});