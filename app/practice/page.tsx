"use client";

import { PracticeSession } from "@/components/practice/practice-session";
import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";

export default function PracticePage() {
	return (
		<>
			<RedirectToSignIn />
			<SignedIn>
				<div className="container mx-auto max-w-7xl px-4 py-6">
					<div className="mb-6">
						<h1 className="text-3xl font-bold tracking-tight">
							Practice Session
						</h1>
						<p className="text-muted-foreground">
							Practice your sales calls with our AI-powered voice coach
						</p>
					</div>
					<PracticeSession />
				</div>
			</SignedIn>
		</>
	);
}
