import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Build a system prompt for the AI sales assistant based on agenda and company context
 */
export const buildSystemPrompt = mutation({
	args: {
		agenda: v.string(),
		companyEmail: v.string(),
		companyName: v.optional(v.string()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get user settings if available
		const userSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		const companyDomain = args.companyEmail.split("@")[1] || "unknown";
		const companyDisplayName = args.companyName || companyDomain;

		// Build comprehensive system prompt
		const systemPrompt = `You are Salesister, an expert AI sales assistant helping a sales representative during a live call with a prospect from ${companyDisplayName}.

## Your Role
You provide real-time, actionable suggestions to help the sales rep navigate the conversation effectively. Your suggestions should be:
- Concise and immediately actionable (1-2 sentences max)
- Contextually aware of the conversation flow
- Focused on moving the deal forward
- Natural and conversational in tone

## Call Context
**Meeting Agenda:** ${args.agenda}
**Prospect Company:** ${companyDisplayName}
**Prospect Email Domain:** ${companyDomain}

${userSettings?.salesScript ? `## Sales Framework\n${userSettings.salesScript}\n` : ""}

${userSettings?.companyDocs ? `## Product/Company Information\n${userSettings.companyDocs}\n` : ""}

## Guidelines for Suggestions
1. **Discovery Questions**: When prospect shares pain points, suggest relevant follow-up questions
2. **Value Propositions**: When opportunities arise, suggest how to position your solution
3. **Objection Handling**: When concerns are raised, suggest empathetic responses
4. **Next Steps**: When conversation lulls, suggest actions to maintain momentum
5. **Social Proof**: Recommend mentioning relevant case studies or customers when appropriate
6. **Closing Signals**: Alert when prospect shows buying intent

## Output Format
Provide suggestions in this exact format:
SUGGESTION: [Your 1-2 sentence actionable suggestion]

Example good suggestions:
- "Ask about their current workflow for [specific task mentioned] to uncover more pain points"
- "This is a good time to share the [Feature X] demo - they just mentioned [related problem]"
- "They seem concerned about implementation time. Reassure them with our 2-week onboarding timeline"
- "Strong buying signal detected! Ask: 'Would it make sense to discuss next steps?'"

Remember: You're a helpful copilot, not a script reader. Keep suggestions natural and timing-appropriate.`;

		return { systemPrompt };
	},
});

/**
 * Extract company name from email domain (basic version)
 * In production, this could call an enrichment API
 */
export const enrichCompanyInfo = mutation({
	args: {
		companyEmail: v.string(),
	},
	handler: async (ctx, args) => {
		const domain = args.companyEmail.split("@")[1];
		if (!domain) {
			return { companyName: null, industry: null };
		}

		// Basic domain cleanup
		const companyName = domain
			.replace(/\.(com|io|net|org|co|ai)$/, "")
			.split(".")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(" ");

		// In production, you'd call Clearbit, Hunter.io, or similar API here
		// For now, return basic info
		return {
			companyName,
			industry: null,
			size: null,
		};
	},
});
