// src/app/leads/analytics/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowLeft, TrendingUp, Users, Target, Phone } from 'lucide-react';
import Link from 'next/link';

interface SourceStats {
  source: string;
  leads: number;
  contacted: number;
  meetings: number;
  booked: number;
  conversionRate: number;
}

interface StatusCount {
  status: string;
  count: number;
  color: string;
}

interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',        // blue
  contacted: '#06b6d4',  // cyan
  meeting_booked: '#22c55e', // green
  quoted: '#a855f7',     // purple
  booked: '#16a34a',     // dark green
  lost: '#ef4444',       // red
  dead: '#6b7280',       // gray
};

const SHOW_LABELS: Record<string, string> = {
  'modern-feb-2026': 'Modern Bridal Show',
  'weddingring-oakville-mar-2026': 'Wedding Ring Oakville',
  'hamilton-ring-mar-2026': 'Hamilton Ring Show',
  'manual-entry': 'Manual Entry',
};

export default function AnalyticsPage() {
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    // Fetch all leads
    const { data: leads } = await supabase
      .from('ballots')
      .select('*');

    if (!leads) {
      setLoading(false);
      return;
    }

    setTotalLeads(leads.length);

    // Calculate source stats
    const sourceMap = new Map<string, { leads: number; contacted: number; meetings: number; booked: number }>();

    leads.forEach(lead => {
      const sourceName = SHOW_LABELS[lead.show_id] || lead.show_id || 'Unknown';
      const current = sourceMap.get(sourceName) || { leads: 0, contacted: 0, meetings: 0, booked: 0 };

      current.leads++;
      if (lead.status !== 'new') current.contacted++;
      if (lead.status === 'meeting_booked' || lead.status === 'quoted' || lead.status === 'booked') current.meetings++;
      if (lead.status === 'booked') current.booked++;

      sourceMap.set(sourceName, current);
    });

    const sourceStatsArray: SourceStats[] = Array.from(sourceMap.entries())
      .map(([source, stats]) => ({
        source: source.replace(/\s*\([^)]*\)/g, ''), // Remove parenthetical text
        ...stats,
        conversionRate: stats.leads > 0 ? Math.round((stats.booked / stats.leads) * 100) : 0,
      }))
      .sort((a, b) => b.leads - a.leads);

    setSourceStats(sourceStatsArray);

    // Calculate status counts
    const statusMap = new Map<string, number>();
    leads.forEach(lead => {
      statusMap.set(lead.status, (statusMap.get(lead.status) || 0) + 1);
    });

    const statusCountsArray: StatusCount[] = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status: status.replace('_', ' ').toUpperCase(),
        count,
        color: STATUS_COLORS[status] || '#6b7280',
      }))
      .sort((a, b) => b.count - a.count);

    setStatusCounts(statusCountsArray);

    // Calculate funnel
    const total = leads.length;
    const contacted = leads.filter(l => l.status !== 'new').length;
    const meetings = leads.filter(l => ['meeting_booked', 'quoted', 'booked'].includes(l.status)).length;
    const quoted = leads.filter(l => ['quoted', 'booked'].includes(l.status)).length;
    const booked = leads.filter(l => l.status === 'booked').length;

    setFunnel([
      { name: 'Leads', value: total, percentage: 100 },
      { name: 'Contacted', value: contacted, percentage: Math.round((contacted / total) * 100) },
      { name: 'Meetings', value: meetings, percentage: Math.round((meetings / total) * 100) },
      { name: 'Quoted', value: quoted, percentage: Math.round((quoted / total) * 100) },
      { name: 'Booked', value: booked, percentage: Math.round((booked / total) * 100) },
    ]);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Lead Analytics</h1>
          <p className="text-muted-foreground">Performance metrics for {totalLeads} leads</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Contacted</span>
            </div>
            <p className="text-2xl font-bold mt-1">{funnel[1]?.value || 0}</p>
            <p className="text-xs text-muted-foreground">{funnel[1]?.percentage || 0}% of leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Meetings</span>
            </div>
            <p className="text-2xl font-bold mt-1">{funnel[2]?.value || 0}</p>
            <p className="text-xs text-muted-foreground">{funnel[2]?.percentage || 0}% of leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Booked</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{funnel[4]?.value || 0}</p>
            <p className="text-xs text-muted-foreground">{funnel[4]?.percentage || 0}% conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip
                    formatter={(value: any) => {
                      const step = funnel.find(f => f.value === value);
                      return [`${value} (${step?.percentage ?? 0}%)`, 'Count'];
                    }}
                  />
                  <Bar dataKey="value" fill="#0d4f4f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }: any) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Source</th>
                  <th className="text-right py-2 font-medium">Leads</th>
                  <th className="text-right py-2 font-medium">Contacted</th>
                  <th className="text-right py-2 font-medium">Meetings</th>
                  <th className="text-right py-2 font-medium">Booked</th>
                  <th className="text-right py-2 font-medium">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {sourceStats.map((source, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{source.source}</td>
                    <td className="text-right py-2">{source.leads}</td>
                    <td className="text-right py-2">{source.contacted}</td>
                    <td className="text-right py-2">{source.meetings}</td>
                    <td className="text-right py-2 font-medium text-green-600">{source.booked}</td>
                    <td className="text-right py-2">
                      <span className={source.conversionRate > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                        {source.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Chase Effectiveness - which touch converts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chase Effectiveness</CardTitle>
          <p className="text-sm text-muted-foreground">Contact attempts vs outcomes</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{statusCounts.find(s => s.status === 'NEW')?.count || 0}</p>
              <p className="text-xs text-muted-foreground">Never Contacted</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{statusCounts.find(s => s.status === 'DEAD')?.count || 0}</p>
              <p className="text-xs text-muted-foreground">Exhausted (6+ touches)</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{statusCounts.find(s => s.status === 'LOST')?.count || 0}</p>
              <p className="text-xs text-muted-foreground">Said No</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
