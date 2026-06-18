/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  TrendingUp, 
  BarChart3, 
  Award, 
  Layers, 
  Briefcase, 
  CheckCircle,
  HelpCircle,
  Percent,
  Calendar,
  Clock,
  MapPin,
  Bookmark,
  FileCheck,
  MessageSquare,
  Users,
  FileText
} from "lucide-react";
import { User, UserRole } from "../types.ts";

interface DashboardChartsProps {
  statsData: any;
  isAdmin: boolean;
  currentUser: User | null;
}

const TYPE_COLORS: Record<string, string> = {
  "Site Visit": "#0d9488", // Teal
  "Reservation": "#6366f1", // Indigo
  "Submit Requirements": "#f59e0b", // Amber
  "Payment": "#10b981", // Emerald
  "Inquiry": "#3b82f6", // Blue
  "Meeting": "#a855f7", // Purple
  "Release of Title": "#f43f5e" // Rose
};

const TYPE_BG_TAILWIND: Record<string, string> = {
  "Site Visit": "bg-teal-500",
  "Reservation": "bg-indigo-500",
  "Submit Requirements": "bg-amber-500",
  "Payment": "bg-emerald-500",
  "Inquiry": "bg-blue-500",
  "Meeting": "bg-purple-500",
  "Release of Title": "bg-rose-500"
};

const TYPE_ICONS: Record<string, any> = {
  "Site Visit": MapPin,
  "Reservation": Bookmark,
  "Submit Requirements": FileCheck,
  "Payment": CheckCircle,
  "Inquiry": MessageSquare,
  "Meeting": Users,
  "Release of Title": FileText
};

export function DashboardCharts({ statsData, isAdmin, currentUser }: DashboardChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!statsData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-white rounded-xl h-72 border border-slate-100 p-6"></div>
        <div className="bg-white rounded-xl h-72 border border-slate-100 p-6"></div>
      </div>
    );
  }

  // Common calculations for monthly bookings (appointments per month)
  const monthlyData = statsData.monthlyBookings && statsData.monthlyBookings.length > 0
    ? statsData.monthlyBookings
    : [
        { month: "Jan", count: 2 },
        { month: "Feb", count: 3 },
        { month: "Mar", count: 4 },
        { month: "Apr", count: 5 },
        { month: "May", count: 8 },
        { month: "Jun", count: 12 },
      ];

  const monthlyRegistrationsData = statsData.monthlyRegistrations && statsData.monthlyRegistrations.length > 0
    ? statsData.monthlyRegistrations
    : [
        { month: "Jan", count: 1 },
        { month: "Feb", count: 2 },
        { month: "Mar", count: 3 },
        { month: "Apr", count: 4 },
        { month: "May", count: 6 },
        { month: "Jun", count: 9 },
      ];

  // We find the max of both datasets to keep them relative and scaled correctly
  const maxVal = Math.max(
    ...monthlyData.map((d: any) => d.count),
    ...monthlyRegistrationsData.map((d: any) => d.count),
    6
  );

  // Convert to SVG points for Bookings (Teal)
  const points = monthlyData.map((d: any, i: number) => {
    const x = 45 + i * (430 / (monthlyData.length - 1));
    const y = 140 - (d.count / maxVal) * 110;
    return { x, y, month: d.month, count: d.count };
  });

  const pointsStr = points.map((p: any) => `${p.x},${p.y}`).join(" ");
  const areaPathStr = monthlyData.length > 0
    ? `M 45,140 L ${pointsStr} L ${points[points.length - 1].x},140 Z`
    : "";
  const linePathStr = `M ${pointsStr}`;

  // Convert to SVG points for Registrations (Indigo)
  const regPoints = monthlyRegistrationsData.map((d: any, i: number) => {
    const x = 45 + i * (430 / (monthlyRegistrationsData.length - 1));
    const y = 140 - (d.count / maxVal) * 110;
    return { x, y, month: d.month, count: d.count };
  });

  const regPointsStr = regPoints.map((p: any) => `${p.x},${p.y}`).join(" ");
  const regAreaPathStr = monthlyRegistrationsData.length > 0
    ? `M 45,140 L ${regPointsStr} L ${regPoints[regPoints.length - 1].x},140 Z`
    : "";
  const regLinePathStr = `M ${regPointsStr}`;

  // Common appointment type breakdowns overall count
  const typeBreakdown = statsData.appointmentTypeCountsOverall && statsData.appointmentTypeCountsOverall.length > 0
    ? statsData.appointmentTypeCountsOverall
    : [
        { type: "Site Visit", count: 8 },
        { type: "Reservation", count: 4 },
        { type: "Submit Requirements", count: 3 },
        { type: "Payment", count: 5 },
        { type: "Inquiry", count: 6 },
        { type: "Meeting", count: 5 },
        { type: "Release of Title", count: 2 }
      ];

  const totalTypesCount = typeBreakdown.reduce((acc: number, cur: any) => acc + (cur.count || 0), 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-charts-bento-grid">
      
      {/* CHART 1: Animating monthly appointments visual graph */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="chart-monthly-appointments">
        <div className="space-y-1 pb-3 border-b border-slate-50">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
            <TrendingUp className="w-4 h-4 text-teal-600 animate-pulse" />
            Monthly Appointments & Registration Velocity
          </h4>
          <p className="text-[11px] text-slate-450">Active scheduling representing appointment pipelines and registered clients over 6 months.</p>
        </div>

        <div className="relative pt-4 h-48 select-none">
          {/* Tooltip Overlay */}
          {hoveredIndex !== null && points[hoveredIndex] && regPoints[hoveredIndex] && (
            <div 
              className="absolute z-10 bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 font-bold pointer-events-none shadow-md border border-slate-800"
              style={{ 
                left: `${(points[hoveredIndex].x / 500) * 100}%`, 
                top: `${Math.max(10, (Math.min(points[hoveredIndex].y, regPoints[hoveredIndex].y) / 180) * 100 - 25)}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="text-slate-400 border-b border-slate-800 pb-0.5 mb-1 font-mono uppercase tracking-wider">{points[hoveredIndex].month} Statistics</div>
              <div className="flex justify-between gap-4">
                <span>Appointments:</span>
                <span className="text-teal-300 font-extrabold">{points[hoveredIndex].count}</span>
              </div>
              <div className="flex justify-between gap-4 mt-0.5">
                <span>Registered:</span>
                <span className="text-indigo-300 font-extrabold">{regPoints[hoveredIndex].count}</span>
              </div>
            </div>
          )}

          {/* SVG Container */}
          <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGradAppt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22"/>
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="areaGradReg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.20"/>
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/>
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const yGrid = 140 - ratio * 110;
              const valueLabel = Math.round(ratio * maxVal);
              return (
                <g key={index} className="opacity-40">
                  <line x1="45" y1={yGrid} x2="480" y2={yGrid} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="15" y={yGrid + 4} className="fill-slate-400 font-mono text-[9px] text-right font-semibold">{valueLabel}</text>
                </g>
              );
            })}

            {/* Shaded Area for Appointments (Teal) */}
            {areaPathStr && (
              <path d={areaPathStr} fill="url(#areaGradAppt)" className="transition-all duration-500 ease-out" />
            )}

            {/* Shaded Area for Registrations (Indigo) */}
            {regAreaPathStr && (
              <path d={regAreaPathStr} fill="url(#areaGradReg)" className="transition-all duration-500 ease-out" />
            )}

            {/* Line-chart stroke path for Appointments (Teal) */}
            {linePathStr && (
              <path 
                d={linePathStr} 
                fill="none" 
                stroke="#0d9488" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-500 ease-out" 
              />
            )}

            {/* Line-chart stroke path for Registrations (Indigo) */}
            {regLinePathStr && (
              <path 
                d={regLinePathStr} 
                fill="none" 
                stroke="#4f46e5" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-500 ease-out" 
              />
            )}

            {/* circular pins and points for interactive hover */}
            {points.map((p: any, i: number) => (
              <g key={i}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="14" 
                  fill="transparent" 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                
                {/* Bookings pin (Teal) */}
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={hoveredIndex === i ? "5.5" : "3.5"} 
                  fill={hoveredIndex === i ? "#0d9488" : "white"} 
                  stroke="#0d9488" 
                  strokeWidth="2" 
                  className="transition-all duration-150 pointer-events-none" 
                />

                {/* Registrations pin (Indigo) */}
                <circle 
                  cx={regPoints[i].x} 
                  cy={regPoints[i].y} 
                  r={hoveredIndex === i ? "5.5" : "3.5"} 
                  fill={hoveredIndex === i ? "#4f46e5" : "white"} 
                  stroke="#4f46e5" 
                  strokeWidth="2" 
                  className="transition-all duration-150 pointer-events-none" 
                />
              </g>
            ))}

            {/* X Labels */}
            {points.map((p: any, i: number) => (
              <text key={i} x={p.x} y="162" textAnchor="middle" className="fill-slate-500 font-mono text-[9px] font-bold">
                {p.month}
              </text>
            ))}
          </svg>
        </div>

        {/* Legend block at bottom showing both lines */}
        <div className="flex items-center gap-4 border-t border-slate-50 pt-2 text-[10px] text-slate-400 justify-end select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-teal-600 inline-block"></span>
            <span>Appointments Velocity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block"></span>
            <span>Registered Client</span>
          </div>
        </div>
      </div>

      {/* CHART 2: Appointments Type Bars with legends OR Performance Leaderboard for non-admin */}
      {!isAdmin ? (
        /* Agent View: Performance Leaderboard */
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="chart-agent-leaderboards">
          <div className="space-y-1 pb-3 border-b border-slate-50">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Award className="w-4 h-4 text-indigo-600 animate-pulse" />
              Performance Leaderboard
            </h4>
            <p className="text-[11px] text-slate-450">Brokers rank metric calculated based on registered clients and successfully completed reservation & payment slots.</p>
          </div>

          <div className="space-y-3.5 flex-1 pt-3">
            {statsData.leaderboard ? (
              (() => {
                // Ensure leaderboard is sorted on performanceScore
                const sortedLeaders = [...statsData.leaderboard].sort((a: any, b: any) => {
                  const bScore = b.performanceScore !== undefined ? b.performanceScore : b.bookingsCount;
                  const aScore = a.performanceScore !== undefined ? a.performanceScore : a.bookingsCount;
                  return bScore - aScore;
                });
                const topScore = Math.max(1, sortedLeaders[0]?.performanceScore || sortedLeaders[0]?.bookingsCount || 1);

                return sortedLeaders.slice(0, 3).map((agent: any, i: number) => {
                  const score = agent.performanceScore !== undefined ? agent.performanceScore : agent.bookingsCount;
                  const widthPct = Math.max(10, Math.round((score / topScore) * 100));
                  const isMe = agent.id === currentUser?.id;

                  return (
                    <div key={agent.id} className={`space-y-1.5 p-3 rounded-lg border ${isMe ? 'bg-teal-50 border-teal-150' : 'bg-slate-50/50 border-slate-100/60'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span className="text-[9px] w-4.5 h-4.5 rounded-full bg-slate-200/80 font-mono text-slate-600 flex items-center justify-center font-extrabold">{i + 1}</span>
                          {agent.name} {isMe && <span className="bg-teal-700 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase ml-1">YOU</span>}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{score} Points</span>
                      </div>
                      
                      {/* Metric Breakdown */}
                      <div className="flex gap-2 text-[10px] text-slate-500 font-medium font-mono select-none">
                        <span>Clients: <strong className="text-slate-700">{agent.clientsCount}</strong></span>
                        <span>•</span>
                        <span>Res Done: <strong className="text-slate-700">{agent.doneReservations || 0}</strong></span>
                        <span>•</span>
                        <span>Pay Done: <strong className="text-slate-700">{agent.donePayments || 0}</strong></span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isMe ? 'bg-teal-600' : 'bg-indigo-600'}`} style={{ width: `${widthPct}%` }}></div>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="h-28 bg-slate-50 animate-pulse rounded-lg"></div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 text-[10px] text-slate-400">
            <span>Score formula: Clients + Done Reservations + Done Payments</span>
            <span className="font-extrabold text-indigo-600 font-mono uppercase tracking-wide">Broker Benchmark</span>
          </div>
        </div>
      ) : (
        /* Admin View: Sleek Appointments Type Bars with Legends */
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between" id="chart-appointments-types">
          <div className="space-y-1 pb-3 border-b border-slate-50">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Appointment Category Share
            </h4>
            <p className="text-[11px] text-slate-450">Breakdown representational volumes and legends across our 7 distinct operational reservation types.</p>
          </div>

          {/* Type Bars Display */}
          <div className="space-y-2.5 flex-1 pt-3">
            {typeBreakdown.map((item: any) => {
              const percentage = Math.round((item.count / totalTypesCount) * 100);
              const IconComp = TYPE_ICONS[item.type] || Briefcase;
              const bgClass = TYPE_BG_TAILWIND[item.type] || "bg-teal-600";
              const dotColor = TYPE_COLORS[item.type] || "#0d9488";

              return (
                <div key={item.type} className="flex items-center gap-3 py-0.5">
                  <div className="w-32 shrink-0 truncate flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span style={{ color: dotColor }} className="shrink-0">
                      <IconComp className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate" title={item.type}>{item.type}</span>
                  </div>

                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${bgClass}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <div className="w-16 text-right shrink-0 font-mono text-[11px] font-bold text-slate-800">
                    {item.count} <span className="text-slate-400 text-[9px] font-medium">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Indicators Legend */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-slate-50 pt-3 text-[9px] justify-start select-none font-medium">
            {Object.keys(TYPE_COLORS).map(k => (
              <div key={k} className="flex items-center gap-1 text-slate-500 shrink-0">
                <span style={{ backgroundColor: TYPE_COLORS[k] }} className="w-2 h-2 rounded-full inline-block"></span>
                <span>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
