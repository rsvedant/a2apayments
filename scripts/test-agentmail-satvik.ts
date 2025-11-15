/**
 * Test script to send Agentmail to satvikkapoor007@gmail.com
 */

const CONVEX_SITE_URL = "https://adamant-hedgehog-462.convex.site";

async function testAgentmailToSatvik() {
	console.log("🧪 Testing Agentmail - Sending to satvikkapoor007@gmail.com\n");
	console.log("=" .repeat(70));

	// Create a test call with Satvik as the client
	const testCallData = {
		userId: "demo_user_hackathon_2024",
		title: "Demo Call - AgentSale Platform Overview",
		transcription: `
[00:00] Sarah (Sales Rep): Hi Satvik! Thanks for joining the call today. I'm excited to show you AgentSale.

[00:15] Satvik (satvikkapoor007@gmail.com): Hi Sarah! Thanks for having me. I'm really interested in learning about your AI-powered sales assistant platform.

[00:30] Sarah: Great! So AgentSale helps sales teams by providing real-time AI suggestions during calls, automatically syncing to HubSpot, and sending follow-up emails. Let me walk you through it.

[01:00] Satvik: That sounds amazing. We've been struggling with manual CRM updates and forgetting to send follow-ups. This could really help our team.

[01:30] Sarah: Exactly! And it integrates seamlessly with Google Meet, so your team can use it during their existing workflow. Let me show you the key features.

[02:00] Satvik: I love the Google Meet integration. How does the AI suggestion feature work during live calls?

[02:20] Sarah: The AI listens to the conversation in real-time and suggests relevant talking points, questions to ask, and next steps based on your sales playbook. It's like having a sales coach in every call.

[02:50] Satvik: That's incredible! What about pricing? We have a team of about 10 sales reps.

[03:10] Sarah: For a team of 10, we're looking at around $2,500 per month. That includes unlimited calls, HubSpot sync, and email automation. Plus, we have a 30-day free trial to get you started.

[03:40] Satvik: That's very reasonable! I'd love to try it out with my team. Can you send me some more information and set up a trial?

[04:00] Sarah: Absolutely! I'll send you a follow-up email right after this call with:
1. Trial signup link
2. Integration guide for Google Meet
3. HubSpot setup instructions
4. Demo video of the AI suggestions feature

[04:30] Satvik: Perfect! My email is satvikkapoor007@gmail.com. I'm excited to get started!

[04:45] Sarah: Wonderful! I'll also schedule a follow-up call next week to help you onboard your team. Does Tuesday at 2 PM work?

[05:00] Satvik: Tuesday at 2 PM works great! Looking forward to it.

[05:10] Sarah: Excellent! I'll send you a calendar invite along with all the materials. Thanks so much for your time today, Satvik!

[05:20] Satvik: Thank you, Sarah! Talk to you soon!
		`.trim(),
		participants: JSON.stringify([
			{
				firstname: "Sarah",
				lastname: "Johnson",
				email: "sarah@agentsale.com",
				company: "AgentSale",
				jobtitle: "Sales Executive",
			},
			{
				firstname: "Satvik",
				lastname: "Kapoor",
				email: "satvikkapoor007@gmail.com",
				company: "TechStartup Inc",
				jobtitle: "CEO",
			},
		]),
		duration: 320, // 5 minutes 20 seconds
	};

	console.log("\n📤 Step 1: Creating call via HTTP endpoint...\n");
	console.log(`📧 Target Email: satvikkapoor007@gmail.com`);
	console.log(`📝 Call Title: ${testCallData.title}\n`);

	try {
		const createResponse = await fetch(`${CONVEX_SITE_URL}/api/calls/create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(testCallData),
		});

		const createResult = await createResponse.json();

		if (!createResponse.ok || !createResult.success) {
			console.error("❌ Failed to create call:", createResult);
			return;
		}

		console.log("✅ Call created successfully!");
		console.log(`📝 Call ID: ${createResult.callId}`);

		if (createResult.processed) {
			console.log("\n✨ Call was processed immediately!");
			console.log(`📊 Processing Results:`);
			console.log(`   🎫 Tickets Created: ${createResult.ticketsCreated}`);
			console.log(`   💼 Deals Created: ${createResult.dealsCreated}`);
			console.log(`   📧 Emails Sent: ${createResult.emailsSent}`);
			console.log(`   🔌 HubSpot Sync: ${createResult.hubspotSyncEnabled ? 'Enabled' : 'Disabled'}`);
			console.log(`   📨 Agentmail Sync: ${createResult.agentmailSyncEnabled ? 'Enabled' : 'Disabled'}`);

			if (createResult.agentmailSyncEnabled && createResult.emailsSent > 0) {
				console.log(`\n🎉 SUCCESS! Email should be sent to satvikkapoor007@gmail.com`);
				console.log(`\n📬 Check your inbox for:`);
				console.log(`   • Subject: "Follow-up on our conversation"`);
				console.log(`   • Contains: Call summary and next steps`);
				console.log(`   • From: Your configured Agentmail address`);
			} else if (!createResult.agentmailSyncEnabled) {
				console.log(`\n⚠️  Agentmail is NOT configured!`);
				console.log(`\n❗ To enable email sending, run:`);
				console.log(`   npx convex env set AGENTMAIL_API_KEY "your-api-key"`);
				console.log(`\nThe call will still be in the database and will be picked up by cron.`);
			} else {
				console.log(`\n⚠️  No emails were sent. Check logs for details.`);
			}
		} else {
			console.log("\n⏳ Call will be processed by cron job (every 1 minute)");
			console.log("   Wait about 60 seconds and check your email inbox!");
		}

		console.log("\n" + "=".repeat(70));
		console.log("\n📋 Summary:");
		console.log("─".repeat(70));
		console.log(`✅ Call created with ID: ${createResult.callId}`);
		console.log(`📧 Email will be sent to: satvikkapoor007@gmail.com`);
		console.log(`🔍 Check Convex dashboard for processing logs`);
		console.log(`📬 Check your Gmail inbox for the follow-up email\n`);

	} catch (error: any) {
		console.error("\n❌ TEST FAILED!");
		console.error("Error:", error.message);
		console.error("Stack:", error.stack);
	}
}

// Run the test
testAgentmailToSatvik();

