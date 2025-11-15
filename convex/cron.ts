import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Cron jobs configuration for SaleSister
 *
 * This file defines scheduled tasks that run automatically in the background
 */

const crons = cronJobs();

/**
 * Process unprocessed call transcriptions every minute
 *
 * This job finds calls with processed=false and transcriptions,
 * processes them using LLM to extract semantic meaning,
 * and creates appropriate HubSpot entities (tickets, deals, notes, meetings)
 */
crons.interval(
	"process-unprocessed-calls",
	{ minutes: 1 },
	internal.callProcessing.processUnprocessedCallsInternal
);

export default crons;
