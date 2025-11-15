import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

/**
 * HTTP endpoint for Chrome extension to submit call data
 * POST /api/calls/create
 * Body: { userId, title, transcription, participants, duration, companyName, aiSuggestionCount }
 */
http.route({
	path: "/api/calls/create",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			// Parse request body
			const body = await request.json();

			// Validate required fields
			if (!body.userId || typeof body.userId !== "string") {
				return new Response(
					JSON.stringify({ success: false, error: "userId is required" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			if (!body.title || typeof body.title !== "string") {
				return new Response(
					JSON.stringify({ success: false, error: "title is required" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			if (!body.transcription || typeof body.transcription !== "string") {
				return new Response(
					JSON.stringify({ success: false, error: "transcription is required" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

		// Create call using internal mutation (bypasses auth)
		const callId = await ctx.runMutation(internal.calls.createInternal, {
			userId: body.userId,
			title: body.title,
			transcription: body.transcription,
			participants: body.participants || "[]",
			duration: body.duration,
			recordingUrl: body.recordingUrl,
		});

		// Process the call immediately instead of waiting for cron
		let processingResult;
		try {
			processingResult = await ctx.runAction(internal.callProcessing.processCallTranscription, {
				callId: callId,
				userId: body.userId,
			});
		} catch (processingError: any) {
			console.error("Error processing call:", processingError);
			// Still return success for call creation, but indicate processing failed
			return new Response(
				JSON.stringify({
					success: true,
					callId: callId,
					processed: false,
					processingError: processingError.message,
					message: "Call created but processing failed. You can manually process it later.",
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				}
			);
		}

		// Return success response with processing results
		return new Response(
			JSON.stringify({
				success: true,
				callId: callId,
				processed: processingResult.success,
				ticketsCreated: processingResult.ticketsCreated,
				dealsCreated: processingResult.dealsCreated,
				emailsSent: processingResult.emailsSent,
				hubspotSyncEnabled: processingResult.hubspotSyncEnabled,
				agentmailSyncEnabled: processingResult.agentmailSyncEnabled,
				message: "Call created and processed successfully!",
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*", // Allow CORS for extension
				},
			}
		);
		} catch (error: any) {
			console.error("Error creating call via HTTP:", error);
			return new Response(
				JSON.stringify({
					success: false,
					error: error.message || "Internal server error",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	}),
});

// Handle CORS preflight requests for the extension
http.route({
	path: "/api/calls/create",
	method: "OPTIONS",
	handler: httpAction(async (ctx, request) => {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		});
	}),
});

export default http;
