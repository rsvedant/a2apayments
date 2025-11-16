"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Mic, TrendingUp, Target, Sparkles } from "lucide-react";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";

export default function Home() {
	return (
		<div className="container mx-auto max-w-6xl px-4 py-16">
			{/* Hero Section */}
			<div className="text-center mb-20 space-y-6">
				<div className="inline-block">
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-linear-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
						SalesPay
					</h1>
				</div>
				<p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
					Your AI-powered real-time sales assistant. Get instant feedback and get close deals in real-time.
				</p>
				
				<div className="flex gap-4 justify-center pt-4">
					<SignedOut>
						<Link href="/auth/sign-in">
							<Button size="lg" className="gap-2">
								Get Started <ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</SignedOut>
					<SignedIn>
						<Link href="/onboarding">
							<Button size="lg" className="gap-2">
								Get Started <ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
						<Link href="/practice">
							<Button size="lg" variant="outline" className="gap-2">
								<Mic className="h-4 w-4" />
								Start Practicing
							</Button>
						</Link>
					</SignedIn>
				</div>
			</div>

			{/* Features Grid */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="border-border/40 bg-card/50 backdrop-blur">
					<CardHeader className="space-y-4">
						<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
							<Mic className="h-6 w-6 text-primary" />
						</div>
						<CardTitle className="text-xl">Voice Practice</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Practice sales conversations with AI. Get instant feedback and improve your pitch in real-time.
						</p>
					</CardContent>
				</Card>

				<Card className="border-border/40 bg-card/50 backdrop-blur">
					<CardHeader className="space-y-4">
						<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
							<TrendingUp className="h-6 w-6 text-primary" />
						</div>
						<CardTitle className="text-xl">Performance Analytics</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Track your metrics, conversion rates, and progress. Make data-driven decisions to boost your results.
						</p>
					</CardContent>
				</Card>

				<Card className="border-border/40 bg-card/50 backdrop-blur">
					<CardHeader className="space-y-4">
						<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
							<Sparkles className="h-6 w-6 text-primary" />
						</div>
						<CardTitle className="text-xl">AI-Powered Insights</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Receive intelligent suggestions based on your company docs and sales scripts during every call.
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Stats Section */}
			<div className="mt-20 grid gap-8 md:grid-cols-3 text-center">
				<div>
					<div className="text-4xl font-bold text-foreground mb-2">87%</div>
					<p className="text-sm text-muted-foreground">Average AI Acceptance Rate</p>
				</div>
				<div>
					<div className="text-4xl font-bold text-foreground mb-2">+35%</div>
					<p className="text-sm text-muted-foreground">Increase in Conversion</p>
				</div>
				<div>
					<div className="text-4xl font-bold text-foreground mb-2">10min</div>
					<p className="text-sm text-muted-foreground">Average Practice Time</p>
				</div>
			</div>
		</div>
	);
}
