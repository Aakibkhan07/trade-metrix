import { ReactNode } from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - Trade Metrix Technologies',
  description: 'Manage your trading strategies, orders, and positions',
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
