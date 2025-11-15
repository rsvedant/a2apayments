/**
 * Test script for the HTTP endpoint that receives call data from Chrome extension
 */

const CONVEX_SITE_URL = "https://adamant-hedgehog-462.convex.site";

async function testCallCreationEndpoint() {
	console.log("🧪 Testing HTTP endpoint: POST /api/calls/create\n");

	// Dummy call data - designed to create HubSpot contacts, tickets, and deals
	// TODO: Replace with your actual userId from Convex database (userSettings table)
	const dummyCallData = {
		userId: "test_user_12345", // CHANGE THIS to your real userId to test HubSpot sync
		title: "Discovery Call - TechCorp Enterprise CRM Implementation",
		transcription: `
[00:00] Sarah Martinez (Sales Rep): Good morning Michael! Thanks so much for taking the time to meet with me today. How are you doing?

[00:15] Michael Chen (Client): Good morning Sarah! I'm doing great, thanks. Really excited to discuss how your CRM solution might help us at TechCorp.

[00:30] Sarah: Wonderful! So I understand from your inquiry that you're currently looking to replace your existing CRM system. Can you tell me more about what's driving that decision?

[00:50] Michael: Absolutely. We're a fast-growing tech company with about 250 employees now, and we've been using Salesforce for the past 3 years. The problem is it's become incredibly expensive - we're paying about $45,000 per year - and it's way too complex for our sales team. Our adoption rate is only about 40%, which is causing huge data quality issues.

[01:30] Sarah: I see. That's actually a very common problem we solve. Our platform is specifically designed for mid-market tech companies like yours. Can you tell me about your sales team structure?

[01:50] Michael: Sure. We have 15 sales reps, 3 sales managers, and about 8 customer success people. We're also planning to hire another 10 sales people in Q1 next year as we expand into the European market.

[02:15] Sarah: Got it. And what are the most critical features you need in a CRM?

[02:25] Michael: Well, we need contact management obviously, deal pipeline tracking, email integration with Gmail, and reporting. But the biggest thing is we need something intuitive that our team will actually use. We also need to migrate about 15,000 contacts and 2,000 active deals from Salesforce.

[03:00] Sarah: Perfect. We can definitely handle all of that. Our platform has a proven migration tool that we've used successfully with dozens of Salesforce migrations. Let me ask - what's your timeline for making this switch?

[03:20] Michael: We're hoping to have a new system in place by January 1st. Our Salesforce contract renews in February, and we want to give notice before then. So realistically, we need to make a decision by mid-December.

[03:45] Sarah: That's definitely doable. Based on what you've told me, I think our Enterprise plan would be perfect for you. For 26 users with the features you need, you'd be looking at around $18,000 per year - so you'd save about $27,000 compared to what you're paying now.

[04:20] Michael: Wow, that's significant savings! And that includes the data migration support?

[04:30] Sarah: Yes, migration support is included in the Enterprise plan. We'll assign a dedicated migration specialist to work with your team. The whole process typically takes 4-6 weeks from kickoff to go-live.

[04:50] Michael: That sounds great. What are the next steps?

[05:00] Sarah: I'd like to schedule a detailed demo for you and your team. We can show you the platform, walk through a migration plan, and answer any technical questions. Would next Tuesday December 3rd at 2 PM PST work? I'd like to include your sales managers if possible.

[05:25] Michael: Let me check... Yes, Tuesday December 3rd at 2 PM works. I'll bring Alex Thompson, our Sales Director, and probably Jenny Liu from our IT team to discuss the technical integration.

[05:45] Sarah: Perfect! I'll send calendar invites to all three of you. In the meantime, I'm going to send you some case studies from similar companies we've worked with, including a SaaS company that migrated from Salesforce last quarter.

[06:05] Michael: That would be very helpful. Oh, one more thing - we also need API integration with our billing system, Stripe. Is that something you support?

[06:20] Sarah: Yes absolutely! We have native Stripe integration. I'll make sure our solutions engineer is on the demo call to discuss that specifically.

[06:35] Michael: Excellent. I think we have a really strong business case here. The cost savings alone would pay for the migration effort.

[06:50] Sarah: I agree! One action item for you before the demo - could you prepare a list of the specific reports your sales managers need? That way we can show you exactly how to build those in our system.

[07:10] Michael: Sure, I'll work with Alex to put that together and send it to you by Friday.

[07:20] Sarah: Perfect. And I'll send you a technical questionnaire about your current Salesforce setup so we can prepare a detailed migration timeline.

[07:35] Michael: Sounds good. This has been really helpful, Sarah. Looking forward to the demo!

[07:45] Sarah: Likewise! Thanks so much for your time, Michael. I'll get those materials over to you today, and we'll talk soon.

[07:55] Michael: Great, thank you! Have a good rest of your day.

[08:00] Sarah: You too! Bye!
		`.trim(),
		participants: JSON.stringify([
			{
				firstname: "Sarah",
				lastname: "Martinez",
				email: "sarah.martinez@agentsale.com",
				phone: "+1-555-0123",
				company: "AgentSale",
				jobtitle: "Senior Sales Executive",
			},
			{
				firstname: "Michael",
				lastname: "Chen",
				email: "michael.chen@techcorp.io",
				phone: "+1-555-9876",
				company: "TechCorp Solutions",
				jobtitle: "VP of Sales",
				website: "https://techcorp.io",
			},
			{
				firstname: "Alex",
				lastname: "Thompson",
				email: "alex.thompson@techcorp.io",
				company: "TechCorp Solutions",
				jobtitle: "Sales Director",
			},
			{
				firstname: "Jenny",
				lastname: "Liu",
				email: "jenny.liu@techcorp.io",
				company: "TechCorp Solutions",
				jobtitle: "IT Manager",
			},
		]),
		duration: 480, // 8 minutes
		recordingUrl: "https://example.com/recordings/techcorp-discovery-2024.mp4",
	};

	console.log("📤 Sending request to:", `${CONVEX_SITE_URL}/api/calls/create`);
	console.log("📦 Payload:", JSON.stringify(dummyCallData, null, 2));
	console.log("\n⏳ Waiting for response...\n");

	try {
		const response = await fetch(`${CONVEX_SITE_URL}/api/calls/create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(dummyCallData),
		});

		const responseData = await response.json();

		console.log("📊 Response Status:", response.status);
		console.log("📨 Response Data:", JSON.stringify(responseData, null, 2));

	if (response.ok && responseData.success) {
		console.log("\n✅ SUCCESS! Call created successfully!");
		console.log(`📝 Call ID: ${responseData.callId}`);
		console.log(`💬 Message: ${responseData.message}`);
		
		// Show processing results
		if (responseData.processed !== undefined) {
			console.log("\n🔄 Processing Results:");
			console.log(`   ✓ Processed: ${responseData.processed ? "Yes" : "No"}`);
			if (responseData.processed) {
				console.log(`   🎫 Tickets Created: ${responseData.ticketsCreated || 0}`);
				console.log(`   💼 Deals Created: ${responseData.dealsCreated || 0}`);
				console.log(`   📧 Emails Sent: ${responseData.emailsSent || 0}`);
				console.log(`   🔌 HubSpot Sync: ${responseData.hubspotSyncEnabled ? "Enabled" : "Disabled"}`);
				console.log(`   📨 Agentmail Sync: ${responseData.agentmailSyncEnabled ? "Enabled" : "Disabled"}`);
			} else if (responseData.processingError) {
				console.log(`   ⚠️  Processing Error: ${responseData.processingError}`);
			}
		}
		
		console.log("\n🎯 Check your Convex dashboard to see the call record and processing results.");
	} else {
		console.error("\n❌ FAILED! Error creating call:");
		console.error(responseData);
	}
	} catch (error: any) {
		console.error("\n❌ REQUEST FAILED!");
		console.error("Error:", error.message);
		console.error("Stack:", error.stack);
	}
}

// Run the test
testCallCreationEndpoint();

