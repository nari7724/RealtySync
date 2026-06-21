/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  TrendingUp, 
  Download, 
  Calendar, 
  Users, 
  AlertTriangle, 
  FileSpreadsheet, 
  Printer, 
  Loader2, 
  DollarSign, 
  Sliders, 
  ChevronRight 
} from "lucide-react";

interface SummaryData {
  totalActiveAgents: number;
  totalClients: number;
  totalBookings: number;
  totalDuplicates: number;
  registeredToday: number;
  bookingsToday: number;
  leaderboard: Array<{
    id: string;
    name: string;
    clientsCount: number;
    bookingsCount: number;
    salesVolume: number;
    status: string;
  }>;
  monthlyRegistrations: Array<{ month: string; count: number }>;
  duplicateTrends: Array<{ status: string; count: number }>;
}

export function ReportsPanel() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReportType, setSelectedReportType] = useState("agent-performance");

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching reports metadata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Simulating professional CSV generation & download
  const handleExportCSV = (type: string) => {
    if (!summary) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `${type}_report.csv`;

    if (type === "agent-performance") {
      csvContent += "Agent Name,Status,Linked Clients,Bookings Filed,Sales Volumes (PHP)\n";
      summary.leaderboard.forEach((item) => {
        csvContent += `"${item.name}","${item.status}",${item.clientsCount},${item.bookingsCount},${item.salesVolume}\n`;
      });
    } else if (type === "client-acquisition") {
      csvContent += "Month,Raw Registered Leads Count\n";
      summary.monthlyRegistrations.forEach((item) => {
        csvContent += `"${item.month}",${item.count}\n`;
      });
    } else if (type === "duplicate-trend") {
      csvContent += "Duplicate Status Index,Claim Records Count\n";
      summary.duplicateTrends.forEach((item) => {
        csvContent += `"${item.status}",${item.count}\n`;
      });
    }

    const encodeUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodeUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Triggers print wizard formatted nicely for system print-to-PDF
  const handlePrintPDF = () => {
    window.print();
  };

  if (loading || !summary) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-24 text-center shadow-sm">
        <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Compiling ledger statistics...</p>
      </div>
    );
  }

  // Calculate maximum of monthly registrants to scale chart
  const maxRegistrationsCount = Math.max(...summary.monthlyRegistrations.map(m => m.count), 1);

  return (
    <div className="space-y-6" id="reports-module">
      {/* Page Title & Downloader */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-700 dark:text-teal-400" />
            Executive Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Acquisition and compliance trends, agency performance lists, and spreadsheet CSV ledger exporting systems.</p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-205 dark:border-slate-700 font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save to PDF
          </button>
        </div>
      </div>

      {/* Primary KPI Grid Summary numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-grid-reports">
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Active Agents</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.totalActiveAgents}</div>
          <div className="text-[10px] text-green-600 dark:text-green-400 mt-1.5 font-medium">100% Accountable</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Registrations</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.totalClients}</div>
          <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-1.5 font-medium">PHP 12.5M Estimated pipeline</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Reservation Count</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.totalBookings}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">All properties consolidated</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">Duplicate Rate</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{Math.round((summary.totalDuplicates / (summary.totalClients || 1)) * 100)}%</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">{summary.totalDuplicates} overlapping profiles flagged</div>
        </div>
      </div>

      {/* Visual Analytics Inline-SVG Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="report-charts-grid">
        {/* Chart A: Monthly registrations bar graph */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm tracking-tight mb-1">Monthly Acquisition Volume</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Total client registrations recorded over recent months.</p>
          </div>

          <div className="h-44 w-full flex items-end justify-between px-2 gap-4">
            {summary.monthlyRegistrations.map((m, idx) => {
              const pct = (m.count / maxRegistrationsCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[11px] py-1 px-2 rounded mb-2 transition-opacity absolute translate-y-[-140%] pointer-events-none whitespace-nowrap z-10 shadow">
                    {m.count} leads
                  </div>
                  {/* Bar */}
                  <div 
                    style={{ height: `${pct || 12}%` }}
                    className="w-full bg-teal-700/90 group-hover:bg-teal-600 rounded-t-md transition-all duration-300 relative"
                  >
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white max-sm:hidden">
                      {m.count}
                    </span>
                  </div>
                  {/* Label */}
                  <span className="text-xs text-slate-500 dark:text-slate-450 mt-2 font-medium">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart B: Donut duplicate trends */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm tracking-tight mb-1">Lead Health Registry Integrity</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Total duplicate overlaps categorized under tracking layers.</p>
          </div>

          <div className="flex flex-row items-center justify-around h-44">
            {/* Donut graphic */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" strokeWidth="11" fill="transparent" className="stroke-slate-100 dark:stroke-slate-800" />
                <circle cx="50" cy="50" r="40" stroke="#EF4444" strokeWidth="11" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (summary.totalDuplicates / (summary.totalClients || 1)))} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {summary.totalDuplicates}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">Overlaps</span>
              </div>
            </div>

            {/* Legends list */}
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500 block"></span>
                <div>
                  <strong className="block text-slate-900 dark:text-slate-200">Duplicated Index</strong>
                  <span className="text-[11px] text-slate-400 dark:text-slate-505">{summary.totalDuplicates} Overlapping Claims</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 block"></span>
                <div>
                  <strong className="block text-slate-900 dark:text-slate-200">Clean Records</strong>
                  <span className="text-[11px] text-slate-400 dark:text-slate-505">{summary.totalClients - summary.totalDuplicates} Secure Profiles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive download action table list */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" id="reports-exporter-panel">
        <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-105 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">Reports Exporter Registry</h3>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-teal-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="agent-performance">Agent Sales Performance Ledger</option>
              <option value="client-acquisition">Monthly Acquisition Leads Index</option>
              <option value="duplicate-trend">Duplication Risk Analytics Trend</option>
            </select>

            <button
              onClick={() => handleExportCSV(selectedReportType)}
              id="btn-report-export-csv"
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded shadow-sm hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Dynamic preview list based on selection */}
        <div className="p-4 overflow-x-auto">
          {selectedReportType === "agent-performance" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-150 dark:border-slate-850">
                  <th className="px-4 py-3">Agent Representative</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3 text-center">Active Client Registries</th>
                  <th className="px-4 py-3 text-center">Bookings Submitted</th>
                  <th className="px-4 py-3 text-right">Reservation Pipeline Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
                {summary.leaderboard.map((item) => (
                  <tr key={item.id} className="odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50/50 dark:even:bg-slate-950/30 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        item.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-medium">{item.clientsCount} clients</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-medium">{item.bookingsCount} files</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">PHP {(item.salesVolume || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportType === "client-acquisition" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-150 dark:border-slate-850">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Raw Leaded Registration Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
                {summary.monthlyRegistrations.map((m, idx) => (
                  <tr key={idx} className="odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50/50 dark:even:bg-slate-950/30 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{m.month}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">{m.count} registered lines</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReportType === "duplicate-trend" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-150 dark:border-slate-850">
                  <th className="px-4 py-3">Overlap Category Status</th>
                  <th className="px-4 py-3 text-right">Claim Overlaps Sum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
                {summary.duplicateTrends.map((d, idx) => (
                  <tr key={idx} className="odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50/50 dark:even:bg-slate-950/30 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{d.status} Duplicate Flag</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 dark:text-amber-400">{d.count} accounts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
