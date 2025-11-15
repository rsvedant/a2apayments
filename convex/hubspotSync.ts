"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Client } from "@hubspot/api-client";

/**
 * Create a ticket in HubSpot
 */
export const createTicket = internalAction({
	args: {
		ticket: v.object({
			subject: v.string(),
			content: v.string(),
			hs_ticket_priority: v.optional(v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("URGENT"))),
			hs_pipeline: v.optional(v.string()),
			hs_pipeline_stage: v.optional(v.string()),
		}),
		contactIds: v.array(v.string()),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string }> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		// Build associations array
		const associations: Array<{
			to: { id: string };
			types: Array<{ associationCategory: "HUBSPOT_DEFINED"; associationTypeId: number }>;
		}> = [];

		// Ticket-to-Contact association type ID is 16
		for (const contactId of args.contactIds) {
			associations.push({
				to: { id: contactId },
				types: [{ associationCategory: "HUBSPOT_DEFINED" as const, associationTypeId: 16 }],
			});
		}

		const ticketData: any = {
			properties: {
				subject: args.ticket.subject,
				content: args.ticket.content,
				hs_ticket_priority: args.ticket.hs_ticket_priority || "MEDIUM",
				hs_pipeline: args.ticket.hs_pipeline || "0",
				hs_pipeline_stage: args.ticket.hs_pipeline_stage || "1",
			},
			associations: associations.length > 0 ? associations : [],
		};

		const response = await hubspotClient.crm.tickets.basicApi.create(ticketData);
		return { id: response.id };
	},
});

/**
 * Create a deal in HubSpot
 */
export const createDeal = internalAction({
	args: {
		deal: v.object({
			dealname: v.string(),
			dealstage: v.string(),
			pipeline: v.string(),
			amount: v.optional(v.string()),
			closedate: v.optional(v.string()),
		}),
		contactIds: v.array(v.string()),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string }> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		// Build associations array
		const associations: Array<{
			to: { id: string };
			types: Array<{ associationCategory: "HUBSPOT_DEFINED"; associationTypeId: number }>;
		}> = [];

		// Deal-to-Contact association type ID is 3
		for (const contactId of args.contactIds) {
			associations.push({
				to: { id: contactId },
				types: [{ associationCategory: "HUBSPOT_DEFINED" as const, associationTypeId: 3 }],
			});
		}

		const properties: Record<string, string> = {
			dealname: args.deal.dealname,
			dealstage: args.deal.dealstage,
			pipeline: args.deal.pipeline,
		};

		if (args.deal.amount) {
			properties.amount = args.deal.amount;
		}
		if (args.deal.closedate) {
			properties.closedate = args.deal.closedate;
		}

		const dealData: any = {
			properties,
			associations: associations.length > 0 ? associations : [],
		};

		const response = await hubspotClient.crm.deals.basicApi.create(dealData);
		return { id: response.id };
	},
});

/**
 * Create a note in HubSpot
 */
export const createNote = internalAction({
	args: {
		note: v.object({
			subject: v.string(),
			body: v.string(),
		}),
		contactIds: v.array(v.string()),
		hubspotApiKey: v.string(),
		timestamp: v.optional(v.string()), // ISO 8601 timestamp
	},
	handler: async (ctx, args): Promise<{ id: string }> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		// Build associations array
		const associations: Array<{
			to: { id: string };
			types: Array<{ associationCategory: "HUBSPOT_DEFINED"; associationTypeId: number }>;
		}> = [];

		// Note-to-Contact association type ID is 202
		for (const contactId of args.contactIds) {
			associations.push({
				to: { id: contactId },
				types: [{ associationCategory: "HUBSPOT_DEFINED" as const, associationTypeId: 202 }],
			});
		}

		const noteData: any = {
			properties: {
				hs_note_body: `${args.note.subject}\n\n${args.note.body}`,
				hs_timestamp: args.timestamp || new Date().toISOString(),
			},
			associations: associations.length > 0 ? associations : [],
		};

		const response = await hubspotClient.crm.objects.notes.basicApi.create(noteData);
		return { id: response.id };
	},
});

/**
 * Create a meeting in HubSpot
 */
export const createMeeting = internalAction({
	args: {
		meeting: v.object({
			title: v.string(),
			body: v.string(),
			startTime: v.optional(v.string()), // ISO 8601 timestamp
			endTime: v.optional(v.string()), // ISO 8601 timestamp
		}),
		contactIds: v.array(v.string()),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string }> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		// Build associations array
		const associations: Array<{
			to: { id: string };
			types: Array<{ associationCategory: "HUBSPOT_DEFINED"; associationTypeId: number }>;
		}> = [];

		// Meeting-to-Contact association type ID is 200
		for (const contactId of args.contactIds) {
			associations.push({
				to: { id: contactId },
				types: [{ associationCategory: "HUBSPOT_DEFINED" as const, associationTypeId: 200 }],
			});
		}

		const properties: Record<string, string> = {
			hs_meeting_title: args.meeting.title,
			hs_meeting_body: args.meeting.body,
			hs_timestamp: args.meeting.startTime || new Date().toISOString(),
		};

		if (args.meeting.startTime) {
			properties.hs_meeting_start_time = args.meeting.startTime;
		}
		if (args.meeting.endTime) {
			properties.hs_meeting_end_time = args.meeting.endTime;
		}

		const meetingData: any = {
			properties,
			associations: associations.length > 0 ? associations : [],
		};

		const response = await hubspotClient.crm.objects.meetings.basicApi.create(meetingData);
		return { id: response.id };
	},
});

