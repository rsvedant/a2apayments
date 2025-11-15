"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Zap, TrendingUp, Target } from "lucide-react";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			<pre className="overflow-x-auto font-mono text-sm mb-8">{TITLE_TEXT}</pre>
			
			<div className="text-center mb-12">
				<h2 className="text-4xl font-bold mb-4">AI-Powered Sales Assistant</h2>
				<p className="text-xl text-muted-foreground mb-8">
					Get real-time AI suggestions during sales calls and track your performance
				</p>
				<div className="flex gap-4 justify-center">
					<Link href="/onboarding">
						<Button size="lg" className="gap-2">
							Get Started <ArrowRight className="h-4 w-4" />
						</Button>
					</Link>
					<Link href="/dashboard">
						<Button size="lg" variant="outline">
							View Dashboard
						</Button>
					</Link>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3 mb-12">
				<Card>
					<CardHeader>
						<Zap className="h-8 w-8 text-primary mb-2" />
						<CardTitle>Real-time AI Suggestions</CardTitle>
						<CardDescription>
							Get intelligent recommendations during your sales calls
						</CardDescription>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<TrendingUp className="h-8 w-8 text-primary mb-2" />
						<CardTitle>Performance Analytics</CardTitle>
						<CardDescription>
							Track your metrics and improve your conversion rates
						</CardDescription>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<Target className="h-8 w-8 text-primary mb-2" />
						<CardTitle>Goal Tracking</CardTitle>
						<CardDescription>
							Monitor progress towards your monthly sales targets
						</CardDescription>
					</CardHeader>
				</Card>

			</div>
		</div>
	);
}
