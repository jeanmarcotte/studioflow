'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ClientExtra {
  id: string;
  item_type: string | null;
  description: string | null;
  quantity: number | null;
  total: string | number | null;
  status: string | null;
}

interface ExtrasCardProps {
  clientExtras: ClientExtra[];
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

export function ExtrasCard({ clientExtras }: ExtrasCardProps) {
  if (clientExtras.length === 0) return null;

  const total = clientExtras.reduce((sum, e) => sum + (parseFloat(String(e.total || '0')) || 0), 0);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          C3 — Client Extras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientExtras.map((ext) => (
              <TableRow key={ext.id}>
                <TableCell className="font-medium">{ext.item_type || '—'}</TableCell>
                <TableCell>{ext.description || '—'}</TableCell>
                <TableCell className="text-center">{ext.quantity ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(parseFloat(String(ext.total || '0')) || 0)}
                </TableCell>
                <TableCell>
                  {ext.status ? (
                    <Badge variant="secondary">{ext.status}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-right text-sm font-semibold mt-2 text-muted-foreground">
          Total: {fmt(total)}
        </div>
      </CardContent>
    </Card>
  );
}
