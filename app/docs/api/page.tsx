import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Documentation - Trade Metrix',
  description: 'Complete API reference for Trade Metrix Trading Platform',
}

export default function ApiDocumentationPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-lg text-muted-foreground">
            Complete reference for the Trade Metrix v1 API
          </p>
        </div>

        <div className="bg-card rounded-lg border p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <p className="text-muted-foreground mb-4">
            The Trade Metrix API allows you to programmatically access your trading account, manage strategies, place orders, and receive real-time webhooks.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">Authentication</h3>
          <p className="text-muted-foreground mb-2">
            All API requests require an API key passed as a Bearer token:
          </p>
          <pre className="bg-muted p-4 rounded mb-4 overflow-x-auto">
            {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.trademetrix.com/api/v1/strategies`}
          </pre>

          <h3 className="text-xl font-semibold mt-6 mb-2">Base URL</h3>
          <p className="text-muted-foreground">
            <code className="bg-muted px-2 py-1 rounded">https://api.trademetrix.com/api/v1</code>
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-2">Rate Limiting</h3>
          <p className="text-muted-foreground">
            API requests are rate limited to 1,000 requests per hour. Check the X-RateLimit-* headers in responses for current limits.
          </p>
        </div>

        <div className="bg-card rounded-lg border p-8">
          <h2 className="text-2xl font-semibold mb-4">Endpoints</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">GET</span>
                /strategies
              </h3>
              <p className="text-muted-foreground">List all trading strategies</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-mono">POST</span>
                /strategies
              </h3>
              <p className="text-muted-foreground">Create a new trading strategy</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">GET</span>
                /orders
              </h3>
              <p className="text-muted-foreground">List all orders</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-mono">POST</span>
                /orders
              </h3>
              <p className="text-muted-foreground">Place a new order</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">GET</span>
                /positions
              </h3>
              <p className="text-muted-foreground">List open positions</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">GET</span>
                /account
              </h3>
              <p className="text-muted-foreground">Get account information</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-mono">GET</span>
                /webhooks
              </h3>
              <p className="text-muted-foreground">List configured webhooks</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-mono">POST</span>
                /webhooks
              </h3>
              <p className="text-muted-foreground">Create a webhook subscription</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <p className="text-sm text-blue-900">
            For detailed endpoint documentation, visit the <a href="/dashboard/developer" className="underline font-semibold">Developer Portal</a>
          </p>
        </div>
      </div>
    </div>
  )
}
