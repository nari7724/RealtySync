/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  TrendingUp, 
  BarChart3, 
  Award, 
  Users, 
  Layers, 
  Briefcase, 
  CheckCircle,
  HelpCircle,
  Percent
} from "lucide-react";
import { User, UserRole } from "../types.ts";

interface DashboardChartsProps {
  statsData: any;
  isAdmin: boolean;
  currentUser: User | null;
}

export function DashboardCharts({ statsData, isAdmin, currentUser }: DashboardChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!statsData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-white rounded-xl h-64 border border-slate-100 p-5"></div>
        <div className="bg-white rounded-xl h-64 border border-slate-100 p-5"></div>
      </div>
    );
  }

  // --- ADMIN RENDER FLOW ---
  if (isAdmin) {
    // 1. Line Area Chart Data calculation
    const monthlyData = statsData.monthlyRegistrations && statsData.monthlyRegistrations.length > 0
      ? statsData.monthlyRegistrations
      : [
          { month: "Jan", count: 2 },
          { month: "Feb", count: 4 },
          { month: "Mar", count: 5 },
          { month: "Apr", count: 3 },
          { month: "May", count: 8 },
          { month: "Jun", count: 6 },
        ];

    const maxCount = Math.max(...monthlyData.map((d: any) => d.count), 6);
    
    // Convert to SVG points (Width = 500, Height = 180)
    // padding x = 40, width available = 440
    // padding y bottom = 140, height available = 120
    const points = monthlyData.map((d: any, i: number) => {
      const x = 45 + i * (430 / (monthlyData.length - 1));
      const y = 140 - (d.count / maxCount) * 110;
      return { x, y, month: d.month, count: d.count };
    });

    const pointsStr = points.map((p: any) => `${p.x},${p.y}`).join(" ");
    const areaPathStr = monthlyData.length > 0
      ? `M 45,140 L ${pointsStr} L ${points[points.length - 1].x},140 Z`
      : "";
    const linePathStr = `M ${pointsStr}`;

    // 2. Leaderboard comparison Bar Chart (Top 3 or 4 agents)
    const leaderboardData = statsData.leaderboard ? statsData.leaderboard.slice(0, 4) : [];
    const maxAgentVal = Math.max(
      ...leaderboardData.map((a: any) => Math.max(a.clientsCount || 0, a.bookingsCount || 0)),
      1
    );

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="admin-charts-bento-grid">
        
        {/* CHART 1: Client Acquisition Line Area Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="chart-client-acquisition">
          <div className="space-y-1 pb-3 border-b border-slate-50">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Acquisition Velocity (Monthly Registrations)
            </h4>
            <p className="text-[11px] text-slate-400">Monthly count representing newly registered client profiles across all broker agents.</p>
          </div>

          <div className="relative pt-4 h-48 select-none">
            {/* Tooltip Overlay */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div 
                className="absolute z-10 bg-slate-900 text-white text-[10px] rounded px-2.2 py-1 font-bold pointer-events-none shadow-md"
                style={{ 
                  left: `${(points[hoveredIndex].x / 500) * 100}%`, 
                  top: `${Math.max(10, (points[hoveredIndex].y / 180) * 100 - 20/*px*/)}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {points[hoveredIndex].month}: <span className="text-teal-300 font-extrabold">{points[hoveredIndex].count}</span> leads
              </div>
            )}

            {/* SVG Crisp Rendering Container */}
            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const yGrid = 140 - ratio * 110;
                const valueLabel = Math.round(ratio * maxCount);
                return (
                  <g key={index} className="opacity-40">
                    <line x1="45" y1={yGrid} x2="480" y2={yGrid} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="15" y={yGrid + 4} className="fill-slate-400 font-mono text-[9px] text-right font-semibold">{valueLabel}</text>
                  </g>
                );
              })}

              {/* Shaded Area */}
              {areaPathStr && (
                <path d={areaPathStr} fill="url(#areaGrad)" className="transition-all duration-350" />
              )}

              {/* Line Stroke */}
              {linePathStr && (
                <path 
                  d={linePathStr} 
                  fill="none" 
                  stroke="#0d9488" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="transition-all duration-350" 
                />
              )}

              {/* Circular Pins */}
              {points.map((p: any, i: number) => (
                <g key={i}>
                  {/* Outer Hover Interaction Area */}
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="12" 
                    fill="transparent" 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Inline visual pin point */}
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={hoveredIndex === i ? "5.5" : "3.5"} 
                    fill={hoveredIndex === i ? "#0d9488" : "white"} 
                    stroke="#0d9488" 
                    strokeWidth="2" 
                    className="transition-all pointer-events-none" 
                  />
                </g>
              ))}

              {/* X Axis Labels */}
              {points.map((p: any, i: number) => (
                <text key={i} x={p.x} y="162" textAnchor="middle" className="fill-slate-500 font-mono text-[9px] font-bold">
                  {p.month}
                </text>
              ))}
            </svg>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-50 pt-2 text-[10px] text-slate-400 justify-end">
            <span className="w-2.5 h-2.5 rounded bg-teal-600 inline-block"></span>
            <span>Registration Rate</span>
          </div>
        </div>

        {/* CHART 2: Agent Performance KPIs Chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="chart-agent-kpis">
          <div className="space-y-1 pb-3 border-b border-slate-50">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Leaderboard Team Accountability Index
            </h4>
            <p className="text-[11px] text-slate-400">Side-by-side performance breakdown comparing customer registrations vs active property bookings.</p>
          </div>

          {leaderboardData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
              No active agent statistical metrics available.
            </div>
          ) : (
            <div className="relative pt-4 h-48 select-none">
              <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                {/* Horizontal Baseline Gridlines */}
                {[0, 0.5, 1].map((ratio, index) => {
                  const yGrid = 140 - ratio * 110;
                  const valueLabel = Math.round(ratio * maxAgentVal);
                  return (
                    <g key={index} className="opacity-40">
                      <line x1="45" y1={yGrid} x2="480" y2={yGrid} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <text x="15" y={yGrid + 3} className="fill-slate-400 font-mono text-[9px] text-right font-semibold">{valueLabel}</text>
                    </g>
                  );
                })}

                {/* Render bar pairs for each top agent */}
                {leaderboardData.map((agent: any, idx: number) => {
                  // Spacing computations
                  const groupWidth = 90;
                  const groupGap = 15;
                  const startX = 65 + idx * (groupWidth + groupGap);
                  
                  // Compute heights
                  const clientsHeight = (agent.clientsCount / maxAgentVal) * 110;
                  const bookingsHeight = (agent.bookingsCount / maxAgentVal) * 110;

                  return (
                    <g key={agent.id}>
                      {/* Bar 1: Clients Count (Teal) */}
                      <rect 
                        x={startX} 
                        y={140 - clientsHeight} 
                        width="18" 
                        height={clientsHeight} 
                        fill="#0d9488" 
                        rx="2"
                        className="transition-all hover:opacity-85 cursor-pointer"
                        title={`${agent.name}: ${agent.clientsCount} clients`}
                      />

                      {/* Bar 2: Bookings Count (Indigo) */}
                      <rect 
                        x={startX + 22} 
                        y={140 - bookingsHeight} 
                        width="18" 
                        height={bookingsHeight} 
                        fill="#6366f1" 
                        rx="2"
                        className="transition-all hover:opacity-85 cursor-pointer"
                        title={`${agent.name}: ${agent.bookingsCount} bookings`}
                      />

                      {/* Agent Surname Label */}
                      <text 
                        x={startX + 20} 
                        y="158" 
                        textAnchor="middle" 
                        className="fill-slate-700 font-sans text-[10px] font-bold"
                      >
                        {agent.name.split(" ").slice(-1)[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Color Indicators Legend */}
          <div className="flex items-center gap-4 border-t border-slate-50 pt-2 text-[10px] justify-end">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-teal-600 inline-block"></span>
              <span className="text-slate-450">Registered Clients</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span>
              <span className="text-slate-450">Property Bookings</span>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // --- AGENT RENDER FLOW (SPECIFIC FOR LOGGED AGENT DATA ONLY) ---
  const myTotalClients = statsData.totalClients || 0;
  const myTotalBookings = statsData.totalBookings || 0;
  const myOpenBookings = statsData.totalOpenBookings || 0;
  const mySalesVolume = statsData.totalCompletedSales || 0;

  // Compute conversion percentage rate safely
  const conversionRate = myTotalClients > 0 
    ? ((mySalesVolume / myTotalClients) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="agent-charts-bento-grid">
      
      {/* CHART A: Funnel Conversion Matrix Progress List */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col justify-between" id="chart-funnel-matrix">
        <div className="space-y-1 pb-3 border-b border-slate-50">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
            <BarChart3 className="w-4 h-4 text-teal-600" />
            My Acquisition & Sales Funnel
          </h4>
          <p className="text-[11px] text-slate-400">Track and optimize your conversion pipeline from registered client leads down to finalized bookings.</p>
        </div>

        <div className="space-y-4 pt-1 flex-1">
          {/* Funnel row 1: Client Registrations */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> 1. Registered Customers</span>
              <span className="font-mono text-slate-900">{myTotalClients} Leads</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full rounded-full transition-all" style={{ width: myTotalClients > 0 ? "100%" : "0%" }}></div>
            </div>
          </div>

          {/* Funnel row 2: Reservation Bookings */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-indigo-400" /> 2. Reservation Count</span>
              <span className="font-mono text-slate-900">{myTotalBookings} Files <span className="text-slate-400 text-[10px]">({myTotalClients > 0 ? Math.round((myTotalBookings / myTotalClients) * 100) : 0}%)</span></span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: myTotalClients > 0 ? `${(myTotalBookings / myTotalClients) * 100}%` : "0%" }}></div>
            </div>
          </div>

          {/* Funnel row 3: Active Open Pipelines */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-amber-500" /> 3. Processing / Open Bookings</span>
              <span className="font-mono text-slate-900">{myOpenBookings} Pipelines <span className="text-slate-400 text-[10px]">({myTotalBookings > 0 ? Math.round((myOpenBookings / myTotalBookings) * 100) : 0}%)</span></span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: myTotalBookings > 0 ? `${(myOpenBookings / myTotalBookings) * 100}%` : "0%" }}></div>
            </div>
          </div>

          {/* Funnel row 4: Completed Sales */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-550 text-teal-600" /> 4. Approved & Closed Contracts</span>
              <span className="font-mono text-slate-900">{mySalesVolume} Approved <span className="text-slate-400 text-[10px]">({myTotalBookings > 0 ? Math.round((mySalesVolume / myTotalBookings) * 100) : 0}%)</span></span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: myTotalBookings > 0 ? `${(mySalesVolume / myTotalBookings) * 100}%` : "0%" }}></div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[11px] text-slate-500">
          <span className="font-medium flex items-center gap-1 text-slate-455">
            <Percent className="w-3.5 h-3.5 text-teal-600" /> Total Conversion Yield:
          </span>
          <span className="font-extrabold text-teal-700 text-xs">{conversionRate}%</span>
        </div>
      </div>

      {/* CHART B: Leaderboard Share and Top Team Context */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="chart-leaderboard-share">
        <div className="space-y-1 pb-3 border-b border-slate-50">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
            <Award className="w-4 h-4 text-amber-500 animate-bounce" />
            Performance Benchmark Comparison
          </h4>
          <p className="text-[11px] text-slate-400">See how your current sales volume compares with the overall broker team leaderboard standards.</p>
        </div>

        <div className="space-y-3.5 flex-1 pt-3">
          {statsData.leaderboard ? (
            statsData.leaderboard.slice(0, 3).map((agent: any, i: number) => {
              // Calculate width relative to top agent
              const topVolume = statsData.leaderboard[0].salesVolume || 1;
              const widthPct = Math.max(10, Math.round((agent.salesVolume / topVolume) * 100));
              const isMe = agent.id === currentUser?.id;

              return (
                <div key={agent.id} className={`space-y-1.5 p-3 rounded-lg border ${isMe ? 'bg-teal-50/40 border-teal-205 border-teal-150' : 'bg-slate-50/50 border-slate-100/60'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span className="text-[10px] w-4.5 h-4.5 rounded-full bg-slate-200 font-mono text-slate-600 flex items-center justify-center font-bold">{i + 1}</span>
                      {agent.name} {isMe && <span className="bg-teal-600 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ml-1">YOU</span>}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-slate-900">PHP {agent.salesVolume.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isMe ? 'bg-teal-600' : 'bg-slate-350'}`} style={{ width: `${widthPct}%` }}></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-28 bg-slate-50 animate-pulse rounded-lg"></div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 text-[10px] text-slate-450 pt-2.5">
          <span>Sales values of peak high-performers</span>
          <span className="font-bold text-slate-700">Team Realized Volume</span>
        </div>
      </div>

    </div>
  );
}
