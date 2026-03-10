'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminStats } from '@/components/admin/admin-stats'
import { Loader2 } from 'lucide-react'

export default function AdminPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, invitations, and system settings</p>
      </div>

      {stats && <AdminStats stats={stats} />}

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Navigate to different admin sections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <h3 className="font-semibold">Manage Users</h3>
              <p className="text-sm text-muted-foreground">View, activate, or deactivate user accounts</p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <h3 className="font-semibold">Invitations</h3>
              <p className="text-sm text-muted-foreground">Send and manage user invitations</p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <h3 className="font-semibold">Audit Log</h3>
              <p className="text-sm text-muted-foreground">View admin actions and security logs</p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <h3 className="font-semibold">Settings</h3>
              <p className="text-sm text-muted-foreground">Configure system and security settings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
