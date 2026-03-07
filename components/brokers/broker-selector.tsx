'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BrokerSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const brokers = [
  { value: 'zerodha', label: 'Zerodha', icon: '🟦' },
  { value: 'angel_one', label: 'Angel One', icon: '📱' },
  { value: 'shoonya', label: 'Shoonya', icon: '🔷' },
  { value: 'alice_blue', label: 'Alice Blue', icon: '💙' },
  { value: 'paper', label: 'Paper Trading', icon: '📄' },
];

export function BrokerSelector({ value, onValueChange }: BrokerSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a broker" />
      </SelectTrigger>
      <SelectContent>
        {brokers.map((broker) => (
          <SelectItem key={broker.value} value={broker.value}>
            <span>{broker.icon} {broker.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
