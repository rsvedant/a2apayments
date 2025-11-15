"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Client } from "@hubspot/api-client";

/**
 * Find a HubSpot contact by email
 */
export const findContactByEmail = internalAction({
	args: {
		email: v.string(),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string; properties: Record<string, string> } | null> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		try {
			// Search for contact by email
			const response = await hubspotClient.crm.contacts.searchApi.doSearch({
				filterGroups: [
					{
						filters: [
							{
								propertyName: "email",
								operator: "EQ",
								value: args.email,
							},
						],
					},
				],
				properties: ["email", "firstname", "lastname", "phone", "company", "jobtitle"],
				limit: 1,
			});

			if (response.results && response.results.length > 0) {
				const contact = response.results[0];
				return {
					id: contact.id,
					properties: contact.properties as Record<string, string>,
				};
			}

			return null;
		} catch (error: any) {
			// If contact not found, return null (not an error)
			if (error.statusCode === 404 || error.code === 404) {
				return null;
			}
			throw error;
		}
	},
});

/**
 * Create a new HubSpot contact
 */
export const createContact = internalAction({
	args: {
		properties: v.object({
			email: v.optional(v.string()),
			firstname: v.optional(v.string()),
			lastname: v.optional(v.string()),
			phone: v.optional(v.string()),
			company: v.optional(v.string()),
			jobtitle: v.optional(v.string()),
		}),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string; properties: Record<string, string> }> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		const contactData = {
			properties: args.properties,
		};

		const response = await hubspotClient.crm.contacts.basicApi.create(contactData);

		return {
			id: response.id,
			properties: response.properties as Record<string, string>,
		};
	},
});

/**
 * Update an existing HubSpot contact
 */
export const updateContact = internalAction({
	args: {
		contactId: v.string(),
		properties: v.object({
			email: v.optional(v.string()),
			firstname: v.optional(v.string()),
			lastname: v.optional(v.string()),
			phone: v.optional(v.string()),
			company: v.optional(v.string()),
			jobtitle: v.optional(v.string()),
		}),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string; properties: Record<string, string> }> => {
		const hubspotClient = new Client({ accessToken: args.hubspotApiKey });

		const contactData = {
			properties: args.properties,
		};

		const response = await hubspotClient.crm.contacts.basicApi.update(args.contactId, contactData);

		return {
			id: response.id,
			properties: response.properties as Record<string, string>,
		};
	},
});

/**
 * Find or create a HubSpot contact
 * First searches by email, creates if not found
 */
export const findOrCreateContact = internalAction({
	args: {
		properties: v.object({
			email: v.optional(v.string()),
			firstname: v.optional(v.string()),
			lastname: v.optional(v.string()),
			phone: v.optional(v.string()),
			company: v.optional(v.string()),
			jobtitle: v.optional(v.string()),
		}),
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<{ id: string; properties: Record<string, string>; created: boolean }> => {
		// First try to find by email if provided
		if (args.properties.email) {
			const existing = await ctx.runAction(internal.contactSync.findContactByEmail, {
				email: args.properties.email,
				hubspotApiKey: args.hubspotApiKey,
			});

			if (existing) {
				// Update with any new information
				const updateProps: Record<string, string> = {};
				if (args.properties.firstname && !existing.properties.firstname) {
					updateProps.firstname = args.properties.firstname;
				}
				if (args.properties.lastname && !existing.properties.lastname) {
					updateProps.lastname = args.properties.lastname;
				}
				if (args.properties.phone && !existing.properties.phone) {
					updateProps.phone = args.properties.phone;
				}
				if (args.properties.company && !existing.properties.company) {
					updateProps.company = args.properties.company;
				}
				if (args.properties.jobtitle && !existing.properties.jobtitle) {
					updateProps.jobtitle = args.properties.jobtitle;
				}

				if (Object.keys(updateProps).length > 0) {
					const updated = await ctx.runAction(internal.contactSync.updateContact, {
						contactId: existing.id,
						properties: updateProps,
						hubspotApiKey: args.hubspotApiKey,
					});
					return { ...updated, created: false };
				}

				return { ...existing, created: false };
			}
		}

		// Create new contact if not found
		const created = await ctx.runAction(internal.contactSync.createContact, {
			properties: args.properties,
			hubspotApiKey: args.hubspotApiKey,
		});

		return { ...created, created: true };
	},
});

/**
 * Process participant JSON and create/update HubSpot contacts
 * Returns array of contact IDs
 */
export const processParticipantsToContacts = internalAction({
	args: {
		participantsJson: v.string(), // JSON string of participant array
		hubspotApiKey: v.string(),
	},
	handler: async (ctx, args): Promise<string[]> => {
		let participants: Array<{
			email?: string;
			name?: string;
			phone?: string;
			company?: string;
			role?: string;
		}>;

		try {
			participants = JSON.parse(args.participantsJson);
		} catch (error) {
			// If JSON parsing fails, return empty array
			return [];
		}

		if (!Array.isArray(participants)) {
			return [];
		}

		const contactIds: string[] = [];

		for (const participant of participants) {
			// Extract firstname and lastname from name if provided
			let firstname: string | undefined;
			let lastname: string | undefined;

			if (participant.name) {
				const nameParts = participant.name.trim().split(/\s+/);
				if (nameParts.length === 1) {
					firstname = nameParts[0];
				} else if (nameParts.length >= 2) {
					firstname = nameParts[0];
					lastname = nameParts.slice(1).join(" ");
				}
			}

			const properties: Record<string, string> = {};
			if (participant.email) properties.email = participant.email;
			if (firstname) properties.firstname = firstname;
			if (lastname) properties.lastname = lastname;
			if (participant.phone) properties.phone = participant.phone;
			if (participant.company) properties.company = participant.company;
			if (participant.role) properties.jobtitle = participant.role;

			// Only create contact if we have at least email or name
			if (properties.email || firstname || lastname) {
				try {
					const contact = await ctx.runAction(internal.contactSync.findOrCreateContact, {
						properties,
						hubspotApiKey: args.hubspotApiKey,
					});
					contactIds.push(contact.id);
				} catch (error: any) {
					// Log error but continue processing other participants
					console.error(`Failed to create/update contact for ${participant.email || participant.name}:`, error.message);
				}
			}
		}

		return contactIds;
	},
});

