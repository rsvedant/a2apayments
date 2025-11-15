"use client";

import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Phone,
	PhoneOff,
	Mic,
	MicOff,
	Radio,
	MessageSquare,
	Clock,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface TranscriptMessage {
	role: "user" | "assistant";
	transcript: string;
	timestamp: Date;
}

export function PracticeSession() {
	const [isCallActive, setIsCallActive] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [callStatus, setCallStatus] = useState<string>("Ready");
	const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
	const [callDuration, setCallDuration] = useState(0);
	const [volumeLevel, setVolumeLevel] = useState(0);

	const vapiRef = useRef<Vapi | null>(null);
	const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const lastTranscriptRef = useRef<{ role: string; text: string } | null>(null);

	useEffect(() => {
		// Initialize Vapi instance
		const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_API_KEY;
		if (!publicKey) {
			toast.error("Vapi API key not configured");
			return;
		}

		const vapi = new Vapi(publicKey);
		vapiRef.current = vapi;

		// Set up event listeners
		vapi.on("call-start", () => {
			setCallStatus("Connected");
			setIsCallActive(true);
			toast.success("Call started! Start practicing.");

			// Start duration counter
			durationIntervalRef.current = setInterval(() => {
				setCallDuration((prev) => prev + 1);
			}, 1000);
		});

		vapi.on("call-end", () => {
			setCallStatus("Call Ended");
			setIsCallActive(false);
			toast.info("Practice session ended");

			// Clear duration counter
			if (durationIntervalRef.current) {
				clearInterval(durationIntervalRef.current);
				durationIntervalRef.current = null;
			}

			setTimeout(() => {
				setCallStatus("Ready");
				setCallDuration(0);
			}, 2000);
		});

		vapi.on("speech-start", () => {
			setCallStatus("Listening...");
		});

		vapi.on("speech-end", () => {
			setCallStatus("Processing...");
		});

		vapi.on("message", (message: any) => {
			// Only process final transcripts to avoid duplicates
			if (
				message.type === "transcript" && 
				message.transcript && 
				message.transcriptType === "final"
			) {
				// Check if this is a duplicate of the last transcript
				const transcriptKey = `${message.role}-${message.transcript}`;
				const lastKey = lastTranscriptRef.current 
					? `${lastTranscriptRef.current.role}-${lastTranscriptRef.current.text}`
					: null;

				// Only add if it's not a duplicate
				if (transcriptKey !== lastKey) {
					const newTranscript: TranscriptMessage = {
						role: message.role,
						transcript: message.transcript,
						timestamp: new Date(),
					};
					setTranscripts((prev) => [...prev, newTranscript]);
					lastTranscriptRef.current = { role: message.role, text: message.transcript };
				}
			}

			if (message.type === "conversation-update") {
				setCallStatus("Connected");
			}
		});

		vapi.on("volume-level", (level: number) => {
			setVolumeLevel(level);
		});

		vapi.on("error", (error: any) => {
			console.error("Vapi error:", error);
			toast.error("Call error occurred");
			setCallStatus("Error");
			setIsCallActive(false);
		});

		// Cleanup
		return () => {
			if (vapiRef.current) {
				vapiRef.current.stop();
			}
			if (durationIntervalRef.current) {
				clearInterval(durationIntervalRef.current);
			}
		};
	}, []);

	// Autoscroll transcript to bottom when new messages arrive
	useEffect(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, [transcripts]);

	const startCall = async () => {
		const assistantId = process.env.NEXT_PUBLIC_VAPI_PUBLIC_ASSISTANT_ID;
		if (!assistantId) {
			toast.error("Assistant ID not configured");
			return;
		}

		if (!vapiRef.current) {
			toast.error("Vapi not initialized");
			return;
		}

		try {
			setCallStatus("Connecting...");
			setTranscripts([]);
			lastTranscriptRef.current = null; // Reset transcript tracking
			await vapiRef.current.start(assistantId);
		} catch (error) {
			console.error("Failed to start call:", error);
			toast.error("Failed to start practice session");
			setCallStatus("Ready");
		}
	};

	const endCall = () => {
		if (vapiRef.current) {
			vapiRef.current.stop();
		}
	};

	const toggleMute = () => {
		if (vapiRef.current) {
			vapiRef.current.setMuted(!isMuted);
			setIsMuted(!isMuted);
			toast.info(isMuted ? "Microphone unmuted" : "Microphone muted");
		}
	};

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<div className="space-y-4">
			{/* Status Cards Row */}
			<div className="grid gap-4 md:grid-cols-3">
				{/* Call Status */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Call Status</CardTitle>
						<Radio
							className={`h-4 w-4 ${
								isCallActive
									? "text-green-600 dark:text-green-400 animate-pulse"
									: "text-muted-foreground"
							}`}
						/>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{callStatus}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{isCallActive ? "Active session" : "Ready to practice"}
						</p>
					</CardContent>
				</Card>

				{/* Duration */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Duration</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{formatDuration(callDuration)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Total practice time
						</p>
					</CardContent>
				</Card>

				{/* Audio Level */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Audio Level</CardTitle>
						<Zap className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{Math.round(volumeLevel * 100)}%
						</div>
						<div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-100"
								style={{ width: `${volumeLevel * 100}%` }}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main Practice Area */}
			<div className="grid gap-4 md:grid-cols-2">
				{/* Call Controls */}
				<Card>
					<CardHeader>
						<CardTitle>Practice Controls</CardTitle>
						<p className="text-sm text-muted-foreground">
							Start your practice session with the AI sales coach
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-3">
							{!isCallActive ? (
								<Button
									onClick={startCall}
									size="lg"
									className="w-full"
									disabled={callStatus === "Connecting..."}
								>
									<Phone className="mr-2 h-5 w-5" />
									{callStatus === "Connecting..."
										? "Connecting..."
										: "Start Practice Session"}
								</Button>
							) : (
								<>
									<Button
										onClick={endCall}
										size="lg"
										variant="destructive"
										className="w-full"
									>
										<PhoneOff className="mr-2 h-5 w-5" />
										End Session
									</Button>
									<Button
										onClick={toggleMute}
										size="lg"
										variant="outline"
										className="w-full"
									>
										{isMuted ? (
											<>
												<MicOff className="mr-2 h-5 w-5" />
												Unmute
											</>
										) : (
											<>
												<Mic className="mr-2 h-5 w-5" />
												Mute
											</>
										)}
									</Button>
								</>
							)}
						</div>

						{/* Tips */}
						<div className="mt-6 p-4 bg-muted rounded-lg">
							<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
								<MessageSquare className="h-4 w-4" />
								Practice Tips
							</h4>
							<ul className="text-xs text-muted-foreground space-y-1.5">
								<li>• Speak clearly and naturally</li>
								<li>• Handle objections professionally</li>
								<li>• Practice active listening</li>
								<li>• Ask discovery questions</li>
								<li>• Close with confidence</li>
							</ul>
						</div>
					</CardContent>
				</Card>

				{/* Live Transcript */}
				<Card>
					<CardHeader>
						<CardTitle>Live Transcript</CardTitle>
						<p className="text-sm text-muted-foreground">
							Real-time conversation recording
						</p>
					</CardHeader>
					<CardContent>
						<ScrollArea ref={scrollAreaRef} className="h-[400px] w-full rounded-md border p-4">
							{transcripts.length === 0 ? (
								<div className="flex items-center justify-center h-full text-center text-muted-foreground">
									<div>
										<MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p className="text-sm">
											Transcript will appear here during your call
										</p>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									{transcripts.map((msg, idx) => (
										<div key={idx} className="space-y-1">
											<div className="flex items-center gap-2">
												<Badge
													variant={
														msg.role === "assistant" ? "default" : "secondary"
													}
												>
													{msg.role === "assistant" ? "AI Coach" : "You"}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{msg.timestamp.toLocaleTimeString()}
												</span>
											</div>
											<p className="text-sm text-foreground pl-2 border-l-2 border-muted">
												{msg.transcript}
											</p>
										</div>
									))}
								</div>
							)}
						</ScrollArea>
					</CardContent>
				</Card>
			</div>

			{/* Session Stats */}
			<Card>
				<CardHeader>
					<CardTitle>Session Stats</CardTitle>
					<p className="text-sm text-muted-foreground">
						Track your practice performance
					</p>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center p-4 bg-muted rounded-lg">
							<div className="text-2xl font-bold text-foreground">
								{transcripts.filter((t) => t.role === "user").length}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								Your Messages
							</p>
						</div>
						<div className="text-center p-4 bg-muted rounded-lg">
							<div className="text-2xl font-bold text-foreground">
								{transcripts.filter((t) => t.role === "assistant").length}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								AI Responses
							</p>
						</div>
						<div className="text-center p-4 bg-muted rounded-lg">
							<div className="text-2xl font-bold text-foreground">
								{formatDuration(callDuration)}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								Total Time
							</p>
						</div>
						<div className="text-center p-4 bg-muted rounded-lg">
							<div className="text-2xl font-bold text-foreground">
								{transcripts.length > 0
									? Math.round(
											(transcripts.filter((t) => t.role === "user").length /
												transcripts.length) *
												100
									  )
									: 0}
								%
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								Talk Ratio
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
