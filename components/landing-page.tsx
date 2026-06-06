"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Users, BookOpen, Zap } from "lucide-react"
import Link from "next/link"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Mentix Trading</h1>
          <Link href="/dashboard">
            <Button>Open Dashboard</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">
          Trade Like A Professional
        </h2>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Master Trading. Unlock Your Edge & Transform Your Trading Strategy With Expert Guidance.
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Live Trading"
            description="Real-time market analysis and trading signals"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Expert Mentors"
            description="Learn from professional traders"
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Education"
            description="Comprehensive trading courses and materials"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="24/7 Support"
            description="Round-the-clock assistance and guidance"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h3 className="text-3xl font-bold text-white mb-4">
          Ready to Start Your Trading Journey?
        </h3>
        <p className="text-slate-300 mb-8 text-lg">
          Join thousands of traders who have transformed their trading strategy with Mentix.
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Enter Dashboard <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-400">
          <p>&copy; 2024 Mentix Trading. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800/70 transition-colors">
      <div className="text-blue-400 mb-3">{icon}</div>
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-slate-400">{description}</p>
    </div>
  )
}
