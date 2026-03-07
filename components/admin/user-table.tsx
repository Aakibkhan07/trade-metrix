import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Toggle2 } from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  is_verified: boolean
  last_login_at: string
  created_at: string
}

interface UserTableProps {
  users: User[]
  onToggleActive: (id: string) => void
  onDelete: (id: string) => void
}

export function UserTable({ users, onToggleActive, onDelete }: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-mono text-sm">{user.email}</TableCell>
            <TableCell>{user.display_name || '-'}</TableCell>
            <TableCell>
              <Badge>{user.role}</Badge>
            </TableCell>
            <TableCell>
              <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className={user.is_verified ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                {user.is_verified ? 'Verified' : 'Pending'}
              </Badge>
            </TableCell>
            <TableCell>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleActive(user.id)}
                >
                  <Toggle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(user.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
