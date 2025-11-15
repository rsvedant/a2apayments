"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import OpenAI from "openai";

/**
 * Extract semantic meaning from call transcription and determine HubSpot entities to create
 */
export const extractSemanticEntities = internalAction({
	args: {
		transcription: v.string(),
		participantsJson: v.string(),
		systemPrompt: v.optional(v.string()),
		salesScript: v.optional(v.string()),
		companyDocs: v.optional(v.string()),
		callTimestamp: v.optional(v.number()), // Unix timestamp of the call
	},
	handler: async (ctx, args): Promise<{
		contacts: Array<{
			email?: string;
			firstname?: string;
			lastname?: string;
			company?: string;
			jobtitle?: string;
			phone?: string;
		}>;
		tickets: Array<{
			subject: string;
			content: string;
			hs_ticket_priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
			hs_pipeline?: string;
			hs_pipeline_stage?: string;
		}>;
		deals: Array<{
			dealname: string;
			dealstage: string;
			pipeline: string;
			amount?: string;
			closedate?: string;
		}>;
		note: {
			subject: string;
			body: string;
		};
		meeting: {
			title: string;
			body: string;
			startTime?: string;
			endTime?: string;
		};
	}> => {
		const openaiApiKey = process.env.OPENAI_API_KEY;
		if (!openaiApiKey) {
			throw new Error("OPENAI_API_KEY environment variable not set");
		}

		const openai = new OpenAI({ apiKey: openaiApiKey });

		// Build context from user settings
		let contextPrompt = "";
		if (args.systemPrompt) {
			contextPrompt += `\n\nSystem Context:\n${args.systemPrompt}`;
		}
		if (args.salesScript) {
			contextPrompt += `\n\nSales Script:\n${args.salesScript}`;
		}
		if (args.companyDocs) {
			contextPrompt += `\n\nCompany Documentation:\n${args.companyDocs}`;
		}

		// Parse existing participants if provided
		let participants: Array<Record<string, any>> = [];
		try {
			participants = JSON.parse(args.participantsJson);
		} catch (error) {
			// Ignore parsing errors
		}

		const callTimeISO = args.callTimestamp
			? new Date(args.callTimestamp).toISOString()
			: new Date().toISOString();

		const systemPrompt = `You are an AI assistant that analyzes sales call transcriptions and determines what needs to be created in HubSpot CRM.

Your task is to analyze the transcription and extract semantic meaning to determine:

1. **TICKETS**: Create tickets if there are:
   - Customer questions or issues that need resolution
   - Technical problems mentioned
   - Support requests
   - Follow-up actions that require tracking
   - Bugs or issues reported
   - Feature requests
   
   DO NOT create tickets for general sales discussions, scheduling meetings, or routine follow-ups.

2. **DEALS**: Create deals if there is:
   - Discussion about pricing or products
   - Interest in purchasing or subscribing
   - Next steps toward a sale
   - Mention of budget, timeline, or procurement process
   - Agreement to move forward with purchase
   - Discussion of contract terms
   
   DO NOT create deals for exploratory calls, discovery calls without clear sales intent, or general conversations.

3. **NOTE**: Always create a note with:
   - A concise summary (2-3 sentences) of the call
   - Key discussion points
   - Important information shared

4. **MEETING**: Always create a meeting entry to log the call:
   - Use the call title or generate one from the content
   - Include key discussion points in the body

5. **CONTACTS**: Extract and enrich participant information from the conversation

${contextPrompt}

Return your analysis as a JSON object with the following EXACT structure:
{
  "contacts": [
    {
      "email": "email@example.com",
      "firstname": "John",
      "lastname": "Smith",
      "company": "Acme Corp",
      "jobtitle": "VP of Sales",
      "phone": "+1234567890"
    }
  ],
  "tickets": [
    {
      "subject": "Short ticket title",
      "content": "Detailed description of the issue or question",
      "hs_ticket_priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "hs_pipeline": "0",
      "hs_pipeline_stage": "1"
    }
  ],
  "deals": [
    {
      "dealname": "Company Name - Product/Service",
      "dealstage": "appointmentscheduled",
      "pipeline": "default",
      "amount": "50000",
      "closedate": "2025-12-31"
    }
  ],
  "note": {
    "subject": "Call Summary",
    "body": "2-3 sentence summary of the call with key points"
  },
  "meeting": {
    "title": "Call Title",
    "body": "Brief description of the meeting",
    "startTime": "ISO 8601 timestamp",
    "endTime": "ISO 8601 timestamp"
  }
}

Important guidelines:
- Only create tickets/deals if they are clearly warranted by the conversation
- Be conservative - it's better to create fewer entities than too many
- The note and meeting should ALWAYS be created
- Use appropriate priorities for tickets (default to MEDIUM if unsure)
- Use standard HubSpot deal stages: "appointmentscheduled", "qualifiedtobuy", "presentationscheduled", "decisionmakerboughtin", "closedwon", "closedlost"
- Default pipeline is "default" for deals
- Extract contact information from the transcription and merge with provided participants`;

		const userPrompt = `Analyze the following sales call transcription and determine what HubSpot entities to create:

Call Time: ${callTimeISO}
${participants.length > 0 ? `\nKnown participants: ${JSON.stringify(participants)}` : ""}

Transcription:
${args.transcription}

Based on the semantic meaning of this conversation, determine what tickets, deals, notes, and meetings should be created in HubSpot.`;

		try {
			const response = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
				response_format: { type: "json_object" },
				temperature: 0.3, // Lower temperature for more consistent extraction
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("Empty response from OpenAI");
			}

			const extracted = JSON.parse(content);

			// Validate and normalize the response
			const contacts = Array.isArray(extracted.contacts) ? extracted.contacts : [];
			const tickets = Array.isArray(extracted.tickets) ? extracted.tickets : [];
			const deals = Array.isArray(extracted.deals) ? extracted.deals : [];

			// Ensure required fields exist
			if (!extracted.note || !extracted.note.body) {
				throw new Error("Note is required but not found in LLM response");
			}

			if (!extracted.meeting || !extracted.meeting.title) {
				throw new Error("Meeting is required but not found in LLM response");
			}

			// Normalize tickets
			const normalizedTickets = tickets.map((t: any) => ({
				subject: t.subject || "Untitled Ticket",
				content: t.content || t.subject || "",
				hs_ticket_priority: t.hs_ticket_priority || "MEDIUM",
				hs_pipeline: t.hs_pipeline || "0",
				hs_pipeline_stage: t.hs_pipeline_stage || "1",
			}));

			// Normalize deals
			const normalizedDeals = deals.map((d: any) => ({
				dealname: d.dealname || "Untitled Deal",
				dealstage: d.dealstage || "appointmentscheduled",
				pipeline: d.pipeline || "default",
				amount: d.amount,
				closedate: d.closedate,
			}));

			// Merge contact enrichment with existing participants
			let enrichedContacts = participants;
			if (contacts.length > 0) {
				// Define contact type
				type ContactType = {
					email?: string;
					firstname?: string;
					lastname?: string;
					company?: string;
					jobtitle?: string;
					phone?: string;
				};

				// Merge by matching email or name
				enrichedContacts = participants.map((p) => {
					const enriched = contacts.find(
						(ep: ContactType) =>
							(ep.email && p.email === ep.email) ||
							(ep.firstname && ep.lastname && p.name === `${ep.firstname} ${ep.lastname}`)
					);
					if (enriched) {
						return { ...p, ...enriched };
					}
					return p;
				});

				// Add new contacts that weren't in the original list
				for (const ep of contacts) {
					const exists = enrichedContacts.some(
						(p) =>
							(ep.email && p.email === ep.email) ||
							(ep.firstname && ep.lastname && p.name === `${ep.firstname} ${ep.lastname}`)
					);
					if (!exists) {
						enrichedContacts.push(ep);
					}
				}
			}

			return {
				contacts: enrichedContacts.length > 0 ? enrichedContacts : contacts,
				tickets: normalizedTickets,
				deals: normalizedDeals,
				note: {
					subject: extracted.note.subject || "Call Summary",
					body: extracted.note.body,
				},
				meeting: {
					title: extracted.meeting.title,
					body: extracted.meeting.body || extracted.meeting.title,
					startTime: extracted.meeting.startTime || callTimeISO,
					endTime: extracted.meeting.endTime || callTimeISO,
				},
			};
		} catch (error: any) {
			console.error("OpenAI extraction error:", error);
			throw new Error(`Failed to extract semantic entities: ${error.message}`);
		}
	},
});

