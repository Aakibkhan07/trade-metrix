'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditLogTable } from '@/components/admin/audit-log-table'
import { Loader2 } from 'lucide-react'

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/audit-log')
      const data = await res.json()
      setLogs(data)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Track all admin actions and system events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Actions ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  )
}
