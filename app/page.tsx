'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, Zap, Shield, Brain, Gauge } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Strategies',
      description: 'Create sophisticated trading strategies using advanced indicators and machine learning',
    },
    {
      icon: Zap,
      title: 'Real-Time Execution',
      description: 'Execute trades instantly with multiple broker integrations (Zerodha, Angel One, Shoonya, Alice Blue)',
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Built-in risk controls with stop-loss, take-profit, and drawdown limits',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive backtesting and performance analytics for strategy optimization',
    },
    {
      icon: Gauge,
      title: 'Position Tracking',
      description: 'Real-time monitoring of open positions with live P&L calculations',
    },
    {
      icon: TrendingUp,
      title: 'Performance Dashboard',
      description: 'Detailed insights into your trading performance and win rates',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Trade Metrix</div>
          <div className="space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-balance">
            Algorithmic Trading Made Simple
          </h1>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Trade Metrix Technologies provides a comprehensive platform for creating, testing, and executing automated trading strategies on Indian securities markets.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/dashboard">
              <Button size="lg">Start Trading</Button>
            </Link>
            <Button size="lg" variant="outline">Learn More</Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground">Everything you need to build and manage profitable trading strategies</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription className="mt-2">{feature.description}</CardDescription>
                    </div>
                    <Icon className="h-5 w-5 text-primary mt-1" />
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Brokers Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 bg-muted/30 rounded-2xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Supported Brokers</h2>
          <p className="text-muted-foreground">Connect with multiple brokers for seamless trading</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {['Zerodha', 'Angel One', 'Shoonya', 'Alice Blue'].map((broker, idx) => (
            <div key={idx} className="bg-background p-6 rounded-lg text-center">
              <p className="font-semibold">{broker}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
        <p className="text-lg text-muted-foreground">Join traders using Trade Metrix Technologies to automate their trading strategies</p>
        <Link href="/dashboard">
          <Button size="lg">Start Your Free Trial</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-muted-foreground">
        <p>&copy; 2024 Trade Metrix Technologies. All rights reserved.</p>
      </footer>
    </div>
  )
}
