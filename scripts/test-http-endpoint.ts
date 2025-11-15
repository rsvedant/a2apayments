/**
 * Test script for the HTTP endpoint that receives call data from Chrome extension
 */

const CONVEX_SITE_URL = "https://adamant-hedgehog-462.convex.site";

async function testCallCreationEndpoint() {
	console.log("🧪 Testing HTTP endpoint: POST /api/calls/create\n");

	// Dummy call data
	const dummyCallData = {
		userId: "test_user_12345",
		title: "Sales Call with Acme Corporation",
		transcription: `
[00:00] Sarah (Sales Rep): Hi John, thanks for joining the call today. How are you doing?

[00:15] John (Client): Hi Sarah, I'm doing well, thanks for asking. I'm excited to learn more about your product.

[00:30] Sarah: Great! So I understand you're looking for a solution to help manage your customer data more effectively. Can you tell me more about your current challenges?

[00:50] John: Sure. Right now, we're using spreadsheets to track everything, and it's becoming really difficult to manage as we scale. We have about 5,000 customers now, and we're adding about 200 new ones each month.

[01:15] Sarah: I see. That sounds like a common pain point. Our platform can help you consolidate all that data into a single CRM system with automated workflows. How does your team currently handle follow-ups?

[01:35] John: Honestly, it's very manual. We set reminders in our calendars, but things slip through the cracks sometimes. We've probably lost a few deals because of delayed follow-ups.

[02:00] Sarah: That's exactly what our system can solve. We have automated follow-up reminders, task assignments, and even AI-powered suggestions for the best time to reach out. Would you be interested in seeing a demo?

[02:20] John: Yes, definitely. Can we schedule that for next week? Maybe Tuesday or Wednesday?

[02:30] Sarah: Absolutely! Let me check my calendar. Tuesday at 2 PM works for me. Does that work for you?

[02:40] John: Tuesday at 2 PM is perfect. Also, I wanted to ask about pricing. Can you give me a ballpark figure?

[02:55] Sarah: Of course. For a team your size, we typically see customers in the $5,000 to $7,000 per month range, depending on which features you need. But we can discuss that in more detail during the demo.

[03:15] John: That's actually lower than I expected. We're currently spending about $8,000 on various tools, so this could be a cost savings for us.

[03:30] Sarah: That's great to hear! I'll send you a calendar invite for Tuesday at 2 PM, and I'll include some materials for you to review beforehand. Is there anything else you'd like to know today?

[03:50] John: No, I think that covers it. I'll review the materials and come prepared with questions for Tuesday.

[04:00] Sarah: Perfect! Thanks for your time, John. Talk to you next week!

[04:10] John: Thanks, Sarah. Looking forward to it!
		`.trim(),
		participants: JSON.stringify([
			{
				name: "Sarah Johnson",
				email: "sarah.johnson@mysalescompany.com",
				role: "Sales Representative",
			},
			{
				name: "John Smith",
				email: "john.smith@acmecorp.com",
				company: "Acme Corporation",
				role: "VP of Operations",
			},
		]),
		duration: 250, // 4 minutes 10 seconds
		recordingUrl: "https://example.com/recordings/call-12345.mp4",
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
			console.log(
				"\n🔄 The call will be processed by the cron job within 1 minute."
			);
			console.log(
				"🎯 Check your Convex dashboard to see the new call record."
			);
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

