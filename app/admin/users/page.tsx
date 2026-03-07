'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserTable } from '@/components/admin/user-table'
import { InviteUserDialog } from '@/components/admin/invite-user-dialog'
import { Loader2 } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(id: string) {
    await fetch(`/api/admin/users/${id}/toggle-active`, { method: 'POST' })
    fetchUsers()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    fetchUsers()
  }

  async function handleInvite(data: any) {
    await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    fetchUsers()
  }

  if (loading) {
    return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Invite User</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} />
        </CardContent>
      </Card>

      <InviteUserDialog open={dialogOpen} onOpenChange={setDialogOpen} onInvite={handleInvite} />
    </div>
  )
}
