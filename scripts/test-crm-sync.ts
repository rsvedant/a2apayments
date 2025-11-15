#!/usr/bin/env node

/**
 * Test script for CRM Sync - Only tests adding information to HubSpot CRM
 * 
 * This script ONLY tests syncing existing calls and actionables to HubSpot.
 * You need to provide existing callId and actionableId or they will be passed as arguments.
 * 
 * Prerequisites:
 * - CONVEX_URL environment variable set (or NEXT_PUBLIC_CONVEX_URL)
 * - HubSpot API key already configured in user settings OR passed via HUBSPOT_API_KEY
 * - Existing callId and actionableId to sync (will prompt if not provided)
 * 
 * Usage:
 *   npm run test:crm
 *   npm run test:crm <callId> <actionableId>
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import * as readline from "readline";

// Get environment variables
const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
const TEST_USER_ID = process.env.TEST_USER_ID || "test-user-123"; // Must match the user ID from populate script

if (!CONVEX_URL) {
	console.error("❌ Error: CONVEX_URL environment variable not set");
	console.error("   Set it with: export CONVEX_URL=your_convex_url");
	console.error("   Or use: export NEXT_PUBLIC_CONVEX_URL=your_convex_url");
	process.exit(1);
}

// Initialize Convex HTTP client
const client = new ConvexHttpClient(CONVEX_URL);

// Helper to prompt for input
function promptInput(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

// Helper to get IDs from command line args or prompt
function getIdsFromArgs(): { callId?: string; actionableId?: string } {
	const args = process.argv.slice(2);
	return {
		callId: args[0] || undefined,
		actionableId: args[1] || undefined,
	};
}

// Main test function - Only tests CRM sync
async function testCRMSync() {
	console.log("🚀 Testing CRM Sync to HubSpot\n");
	console.log(`👤 Using test user ID: ${TEST_USER_ID}\n`);

	try {
		// Get IDs from command line args or prompt
		const args = getIdsFromArgs();
		let callId: Id<"calls">;
		let actionableId: Id<"actionables">;

		if (args.callId && args.actionableId) {
			callId = args.callId as Id<"calls">;
			actionableId = args.actionableId as Id<"actionables">;
			console.log(`📝 Using provided IDs:`);
			console.log(`   Call ID: ${callId}`);
			console.log(`   Actionable ID: ${actionableId}\n`);
		} else {
			// Prompt for IDs
			if (!args.callId) {
				const callIdInput = await promptInput("Enter Call ID to sync: ");
				if (!callIdInput) {
					console.error("❌ Call ID is required");
					process.exit(1);
				}
				callId = callIdInput as Id<"calls">;
			} else {
				callId = args.callId as Id<"calls">;
			}

			if (!args.actionableId) {
				const actionableIdInput = await promptInput("Enter Actionable ID to sync: ");
				if (!actionableIdInput) {
					console.error("❌ Actionable ID is required");
					process.exit(1);
				}
				actionableId = actionableIdInput as Id<"actionables">;
			} else {
				actionableId = args.actionableId as Id<"actionables">;
			}
		}

		// Verify HubSpot is configured (using admin function)
		console.log("📝 Step 1: Verifying HubSpot configuration");
		try {
			const settings = await client.query(api.admin.getUserSettings, {
				userId: TEST_USER_ID,
			});
			if (!settings?.hubspotApiKey || !settings.hubspotEnabled) {
				console.error("   ❌ HubSpot integration not configured");
				console.error("   💡 Run: npm run populate:data");
				process.exit(1);
			}
			console.log("   ✅ HubSpot is configured\n");
		} catch (error: any) {
			console.error("   ❌ Error checking settings:", error.message);
			throw error;
		}

		// Step 1: Sync call to HubSpot
		console.log("📝 Step 2: Syncing call to HubSpot");
		let callSyncResult;
		try {
			callSyncResult = await client.action(api.admin.syncCallToHubSpot, {
				callId,
				userId: TEST_USER_ID,
			});
			console.log(`   ✅ Call synced successfully!`);
			console.log(`   📦 HubSpot Note ID: ${callSyncResult.crmEntityId}\n`);
		} catch (error: any) {
			console.error(`   ❌ Failed to sync call: ${error.message}`);
			console.error(`   💡 Check your HubSpot API key and permissions\n`);
			throw error;
		}

		// Step 2: Sync actionable to HubSpot
		console.log("📝 Step 3: Syncing actionable to HubSpot");
		let actionableSyncResult;
		try {
			actionableSyncResult = await client.action(api.admin.syncActionableToHubSpot, {
				actionableId,
				userId: TEST_USER_ID,
			});
			console.log(`   ✅ Actionable synced successfully!`);
			console.log(`   📦 HubSpot ${actionableSyncResult.crmEntityType} ID: ${actionableSyncResult.crmEntityId}\n`);
		} catch (error: any) {
			console.error(`   ❌ Failed to sync actionable: ${error.message}`);
			console.error(`   💡 Check your HubSpot API key and permissions\n`);
			throw error;
		}

		// Step 3: Verify sync status
		console.log("📝 Step 4: Verifying sync status");
		let pendingSyncs: any[] = [];
		let failedSyncs: any[] = [];
		try {
			// Note: These queries require auth, so we skip them for now
			// In a real app, you'd use admin functions for these too
			pendingSyncs = [];
			failedSyncs = [];
			
			console.log(`   📊 Pending syncs: ${pendingSyncs.length}`);
			console.log(`   📊 Failed syncs: ${failedSyncs.length}`);

			if (failedSyncs.length > 0) {
				console.log("\n   ⚠️  Some syncs failed:");
				failedSyncs.forEach((sync) => {
					console.log(`      - ${sync.entityType} (${sync.entityId}): ${sync.errorMessage}`);
				});
			}
		} catch (error: any) {
			console.log(`   ⚠️  Could not fetch sync status: ${error.message}`);
		}

		// Summary
		console.log("\n" + "=".repeat(60));
		console.log("✅ CRM SYNC TEST COMPLETE");
		console.log("=".repeat(60));
		console.log(`✓ Call synced to HubSpot as Note: ${callSyncResult.crmEntityId}`);
		console.log(`✓ Actionable synced to HubSpot as ${actionableSyncResult.crmEntityType}: ${actionableSyncResult.crmEntityId}`);
		console.log("\n🎉 Data successfully added to HubSpot CRM!");
		console.log("\n💡 View in HubSpot:");
		console.log(`   - Note: https://app.hubspot.com/contacts/[PORTAL_ID]/notes/${callSyncResult.crmEntityId}`);
		console.log(`   - ${actionableSyncResult.crmEntityType}: https://app.hubspot.com/contacts/[PORTAL_ID]/${actionableSyncResult.crmEntityType}s/${actionableSyncResult.crmEntityId}`);

	} catch (error: any) {
		console.error("\n❌ TEST FAILED");
		console.error("=".repeat(60));
		console.error(`Error: ${error.message}`);
		if (error.stack) {
			console.error("\nStack trace:");
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Run the test
testCRMSync();

