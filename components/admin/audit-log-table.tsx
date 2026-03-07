import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface AuditLog {
  id: string
  admin_id: string
  action: string
  target_user_id: string
  details: any
  ip_address: string
  created_at: string
}

interface AuditLogTableProps {
  logs: AuditLog[]
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Admin</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Target User</TableHead>
          <TableHead>IP Address</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
            <TableCell className="font-mono text-sm">{log.admin_id.slice(0, 8)}...</TableCell>
            <TableCell>
              <Badge>{log.action}</Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">{log.target_user_id?.slice(0, 8) || '-'}</TableCell>
            <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
            <TableCell className="text-xs">{JSON.stringify(log.details).slice(0, 50)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
