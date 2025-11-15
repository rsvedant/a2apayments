#!/usr/bin/env node

/**
 * Script to populate test data in Convex database for CRM sync testing
 * 
 * This creates:
 * 1. User settings with HubSpot API key (if not exists)
 * 2. Test call records
 * 3. Test actionable records linked to calls
 * 
 * Usage:
 *   npm run populate:data
 *   or
 *   HUBSPOT_API_KEY=your_key npm run populate:data
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as readline from "readline";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID || "test-user-123"; // Use consistent test user ID

if (!CONVEX_URL) {
	console.error("❌ Error: CONVEX_URL environment variable not set");
	process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

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

async function populateData() {
	console.log("🚀 Populating Test Data in Convex Database\n");

	try {
		console.log(`📝 Using test user ID: ${TEST_USER_ID}\n`);

		// Step 1: Configure HubSpot API key
		console.log("📝 Step 1: Setting up HubSpot API key");
		let hubspotApiKey = HUBSPOT_API_KEY;
		if (!hubspotApiKey) {
			hubspotApiKey = await promptInput("Enter your HubSpot API key: ");
		}

		// Use admin function to set settings (no auth required)
		await client.mutation(api.admin.setHubSpotSettings, {
			userId: TEST_USER_ID,
			hubspotApiKey,
			hubspotEnabled: true,
		});
		console.log("   ✅ Configured HubSpot settings\n");

		// Step 2: Create test calls
		console.log("📝 Step 2: Creating test calls");
		
		const call1Id = await client.mutation(api.admin.createTestCall, {
			userId: TEST_USER_ID,
			title: "Follow-up Call with Acme Corp - Product Demo",
			transcription: `Sales Rep: Good morning, thanks for taking the time today.
Customer: Of course, I'm interested in learning more about your product.
Sales Rep: Great! Let me walk you through the key features that align with your needs.
Customer: That sounds perfect. What about pricing?
Sales Rep: Our pricing starts at $99/month for the basic plan. For your company size, I'd recommend the Pro plan at $299/month.
Customer: That's reasonable. Can we schedule a follow-up to discuss implementation?
Sales Rep: Absolutely, I'll send you a calendar invite for next week.`,
			participants: JSON.stringify([
				{ name: "John Smith", role: "customer", company: "Acme Corp" },
				{ name: "Sarah Johnson", role: "sales" },
			]),
			duration: 1200, // 20 minutes
			metadata: JSON.stringify({
				callType: "demo",
				customerInterest: "high",
				nextSteps: "Schedule implementation call",
			}),
		});
		console.log(`   ✅ Created Call 1: ${call1Id}`);

		const call2Id = await client.mutation(api.admin.createTestCall, {
			userId: TEST_USER_ID,
			title: "Discovery Call - TechStart Inc",
			transcription: `Sales Rep: Hi, thanks for joining. I understand you're looking for a CRM solution?
Customer: Yes, we're evaluating options for our sales team of 10 people.
Sales Rep: Perfect. What are your main pain points with your current system?
Customer: Integration with our email platform and lack of automation features.
Sales Rep: Our platform has native email integration and extensive automation. Let me show you...
Customer: This looks promising. What's the onboarding process like?
Sales Rep: We provide dedicated onboarding support and can get you started in under a week.`,
			participants: JSON.stringify([
				{ name: "Mike Davis", role: "customer", company: "TechStart Inc" },
				{ name: "Sarah Johnson", role: "sales" },
			]),
			duration: 1800, // 30 minutes
			metadata: JSON.stringify({
				callType: "discovery",
				teamSize: 10,
				painPoints: ["email integration", "automation"],
			}),
		});
		console.log(`   ✅ Created Call 2: ${call2Id}\n`);

		// Step 3: Create test actionables
		console.log("📝 Step 3: Creating test actionables");
		
		// Task for Call 1
		const task1Id = await client.mutation(api.admin.createTestActionable, {
			userId: TEST_USER_ID,
			callId: call1Id,
			type: "task",
			title: "Send pricing proposal to Acme Corp",
			description: "Follow up with detailed pricing proposal and implementation timeline for Acme Corp. Include ROI calculator.",
			priority: "high",
			dueDate: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
			status: "pending",
		});
		console.log(`   ✅ Created Task 1: ${task1Id}`);

		// Follow-up for Call 1
		const followUp1Id = await client.mutation(api.admin.createTestActionable, {
			userId: TEST_USER_ID,
			callId: call1Id,
			type: "follow_up",
			title: "Schedule implementation call with Acme Corp",
			description: "Coordinate with customer to schedule implementation planning session for next week.",
			priority: "high",
			dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
			status: "pending",
		});
		console.log(`   ✅ Created Follow-up 1: ${followUp1Id}`);

		// Deal for Call 2
		const deal1Id = await client.mutation(api.admin.createTestActionable, {
			userId: TEST_USER_ID,
			callId: call2Id,
			type: "deal",
			title: "TechStart Inc - CRM Implementation Deal",
			description: "Potential deal for TechStart Inc. High interest in email integration and automation features.",
			priority: "medium",
			dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
			status: "pending",
		});
		console.log(`   ✅ Created Deal 1: ${deal1Id}`);

		// Task for Call 2
		const task2Id = await client.mutation(api.admin.createTestActionable, {
			userId: TEST_USER_ID,
			callId: call2Id,
			type: "task",
			title: "Send demo access credentials to TechStart Inc",
			description: "Provide trial access and setup onboarding call with TechStart Inc technical team.",
			priority: "medium",
			dueDate: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day from now
			status: "pending",
		});
		console.log(`   ✅ Created Task 2: ${task2Id}\n`);

		// Summary
		console.log("=".repeat(60));
		console.log("✅ TEST DATA CREATED SUCCESSFULLY");
		console.log("=".repeat(60));
		console.log(`\n👤 Test User ID: ${TEST_USER_ID}`);
		console.log(`\n📋 Created Records:`);
		console.log(`\n📞 Calls:`);
		console.log(`   1. ${call1Id} - "Follow-up Call with Acme Corp"`);
		console.log(`   2. ${call2Id} - "Discovery Call - TechStart Inc"`);
		console.log(`\n📝 Actionables:`);
		console.log(`   1. ${task1Id} - Task (High Priority)`);
		console.log(`   2. ${followUp1Id} - Follow-up (High Priority)`);
		console.log(`   3. ${deal1Id} - Deal (Medium Priority)`);
		console.log(`   4. ${task2Id} - Task (Medium Priority)`);
		console.log(`\n🚀 Next Steps:`);
		console.log(`   Run the CRM sync test with:`);
		console.log(`   TEST_USER_ID=${TEST_USER_ID} npm run test:crm ${call1Id} ${task1Id}`);
		console.log(`   or`);
		console.log(`   TEST_USER_ID=${TEST_USER_ID} npm run test:crm ${call2Id} ${deal1Id}`);
		console.log(`\n💡 Tip: You can also test syncing any combination of callId and actionableId`);

	} catch (error: any) {
		console.error("\n❌ FAILED TO POPULATE DATA");
		console.error("=".repeat(60));
		console.error(`Error: ${error.message}`);
		if (error.stack) {
			console.error("\nStack trace:");
			console.error(error.stack);
		}
		process.exit(1);
	}
}

populateData();

