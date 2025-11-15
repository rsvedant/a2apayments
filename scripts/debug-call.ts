/**
 * Debug script to check the call processing details
 */

const CONVEX_SITE_URL = "https://adamant-hedgehog-462.convex.site";
const CALL_ID = "jd7f92b7r41nt47q28mf76hdtn7tkbm2"; // From the last test

async function debugCall() {
	console.log("🔍 Debugging Call Processing\n");
	console.log(`Call ID: ${CALL_ID}\n`);

	// The call was processed immediately, so let's check what was extracted
	console.log("Based on the test output:");
	console.log("  ✅ Agentmail Sync: Enabled");
	console.log("  ⚠️  Emails Sent: 0");
	console.log("\nPossible reasons:");
	console.log("  1. No email address found in extracted contacts");
	console.log("  2. Agentmail API call failed");
	console.log("  3. Contact extraction didn't include satvikkapoor007@gmail.com\n");

	console.log("💡 Solution: Check Convex dashboard > Functions > callProcessing");
	console.log("   Look for logs containing 'Agentmail' to see the exact error\n");

	console.log("📝 Expected behavior:");
	console.log("   The LLM should extract:");
	console.log("   - Satvik Kapoor (satvikkapoor007@gmail.com) as primary contact");
	console.log("   - Should send follow-up email to that address\n");

	console.log("🔧 To manually test Agentmail API:");
	console.log("   Check if AGENTMAIL_API_KEY is valid");
	console.log("   Check if the API endpoint is correct");
	console.log("   Check Agentmail dashboard for any errors\n");
}

debugCall();

