import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Clock } from 'lucide-react'

interface AdminStatsProps {
  stats: {
    total_users: number
    active_users: number
    inactive_users: number
    verified_users: number
    admin_count: number
    trader_count: number
    active_last_week: number
  }
}

export function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">{stats.verified_users} verified</p>
            </div>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.active_users}</div>
              <p className="text-xs text-muted-foreground">{stats.active_last_week} last 7 days</p>
            </div>
            <UserCheck className="h-4 w-4 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.inactive_users}</div>
              <p className="text-xs text-muted-foreground">locked or disabled</p>
            </div>
            <UserX className="h-4 w-4 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.admin_count}</div>
              <p className="text-xs text-muted-foreground">{stats.trader_count} traders</p>
            </div>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
