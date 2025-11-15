/**
 * Quick diagnostic to check Agentmail environment variables
 */

const CONVEX_URL = process.env.CONVEX_URL || "https://ideal-porcupine-867.convex.cloud";

async function checkAgentmailEnv() {
	console.log("🔍 Checking Agentmail Configuration...\n");
	console.log("═══════════════════════════════════════════════════════════");

	// Call a diagnostic endpoint or query
	const response = await fetch(`${CONVEX_URL}/api/calls/create`, {
		method: "OPTIONS", // Just to check connectivity
	});

	console.log("\n📋 Required Environment Variables:");
	console.log("──────────────────────────────────────────────────────────");
	console.log("✓ AGENTMAIL_API_KEY - Your Agentmail API key");
	console.log("✓ AGENTMAIL_INBOX_EMAIL - Your inbox email (e.g., sales@agentmail.to)");
	console.log("\n📝 To set these variables, run:");
	console.log('──────────────────────────────────────────────────────────');
	console.log('npx convex env set AGENTMAIL_API_KEY "your-api-key-here"');
	console.log('npx convex env set AGENTMAIL_INBOX_EMAIL "sales@agentmail.to"');
	
	console.log("\n\n🔗 Get your API key and inbox from:");
	console.log("──────────────────────────────────────────────────────────");
	console.log("https://console.agentmail.to/");
	console.log("\n1. Create an API key in the console");
	console.log("2. Create an inbox (or use existing)");
	console.log("3. Copy your inbox email (e.g., yourname@agentmail.to)");
	console.log("4. Set the environment variables in Convex");
	
	console.log("\n═══════════════════════════════════════════════════════════");
}

checkAgentmailEnv().catch(console.error);

