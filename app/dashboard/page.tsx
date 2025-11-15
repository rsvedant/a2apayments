"use client";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { SalesAssistant } from "@/components/dashboard/sales-assistant";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
} from "convex/react";
import { useState } from "react";

export default function DashboardPage() {
	const [showSignIn, setShowSignIn] = useState(false);

	return (
		<>
			<Authenticated>
				<div className="container mx-auto max-w-7xl px-4 py-6">
					<div className="mb-6">
						<h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
						<p className="text-muted-foreground">
							Track your performance and AI-powered insights
						</p>
					</div>
					<SalesAssistant />
				</div>
			</Authenticated>
			<Unauthenticated>
				{showSignIn ? (
					<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
				) : (
					<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
				)}
			</Unauthenticated>
			<AuthLoading>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</div>
			</AuthLoading>
		</>
	);
}
