import Link from 'next/link'
import { Users, Mail, FileText, Settings, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AdminSidebar() {
  return (
    <div className="w-64 border-r bg-slate-50 p-6">
      <h2 className="mb-8 text-2xl font-bold">Trade Metrix Admin</h2>
      <nav className="space-y-2">
        <Link href="/admin">
          <Button variant="ghost" className="w-full justify-start">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant="ghost" className="w-full justify-start">
            <Users className="mr-2 h-4 w-4" />
            Users
          </Button>
        </Link>
        <Link href="/admin/invitations">
          <Button variant="ghost" className="w-full justify-start">
            <Mail className="mr-2 h-4 w-4" />
            Invitations
          </Button>
        </Link>
        <Link href="/admin/audit-log">
          <Button variant="ghost" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" />
            Audit Log
          </Button>
        </Link>
        <Link href="/admin/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </nav>
    </div>
  )
}
