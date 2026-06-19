/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Building2, 
  MapPin, 
  ExternalLink, 
  Search, 
  Layers, 
  Info, 
  Check, 
  SlidersHorizontal,
  Navigation,
  Globe,
  User,
  X
} from "lucide-react";
import { Project, UserRole } from "../types.ts";

const REALTY_PROJECT_ADDRESSES: Record<string, string> = {
  "Avida Towers Riala": "Apas, Cebu IT Park, Cebu City, Cebu",
  "Solinea Resort Condominium": "Cardiff St, Cebu IT Park, Cebu City, Cebu",
  "The Alcoves": "Luz, Cebu City, Cebu",
  "Park Point Residences": "Cardinal Rosales Ave, Cebu City, Cebu",
  "Amara Subdivision": "Catarman, Liloan, Cebu",
  "Amaia Steps Mandaue": "Plaridel St, Mandaue City, Cebu",
  "Cebu IT Park Residences": "Jose Maria del Mar St, Cebu City, Cebu",
  "Marco Polo Residences": "Nivel Hills, Lahug, Cebu City, Cebu"
};

const ALL_PROJECTS: Project[] = [
  {
    id: "PRJ-ATR01",
    projectName: "Avida Towers Riala",
    developersName: "Avida Land Corp. (Ayala Land)",
    location: "Avida Towers Riala",
    minimumCut: "22sqm (Studio)",
    pricePerSqm: 154000
  },
  {
    id: "PRJ-SRC02",
    projectName: "Solinea Resort Condominium",
    developersName: "Alveo Land (Ayala Land)",
    location: "Solinea Resort Condominium",
    minimumCut: "100sqm",
    pricePerSqm: 182000
  },
  {
    id: "PRJ-ALC03",
    projectName: "The Alcoves",
    developersName: "Ayala Land Premier",
    location: "The Alcoves",
    minimumCut: "200sqm",
    pricePerSqm: 255000
  },
  {
    id: "PRJ-PPR04",
    projectName: "Park Point Residences",
    developersName: "Ayala Land Premier",
    location: "Park Point Residences",
    minimumCut: "200sqm",
    pricePerSqm: 242000
  },
  {
    id: "PRJ-AMR05",
    projectName: "Amara Subdivision",
    developersName: "Ayala Land Premier & Cebu Holdings Inc.",
    location: "Amara Subdivision",
    minimumCut: "200sqm",
    pricePerSqm: 38000
  },
  {
    id: "PRJ-ASM06",
    projectName: "Amaia Steps Mandaue",
    developersName: "Amaia Land (Ayala Land)",
    location: "Amaia Steps Mandaue",
    minimumCut: "100sqm",
    pricePerSqm: 96000
  },
  {
    id: "PRJ-CPR07",
    projectName: "Cebu IT Park Residences",
    developersName: "Cebu Holdings Inc.",
    location: "Cebu IT Park Residences",
    minimumCut: "100sqm",
    pricePerSqm: 165000
  },
  {
    id: "PRJ-MPR08",
    projectName: "Marco Polo Residences",
    developersName: "Federal Land",
    location: "Marco Polo Residences",
    minimumCut: "200sqm",
    pricePerSqm: 172000
  }
];

interface MyProjectsProps {
  currentUser: { id: string; firstName: string; lastName: string; role: string };
}

export function MyProjects({ currentUser }: MyProjectsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeveloper, setSelectedDeveloper] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Let's perform deterministic project assignment for agent based on Agent ID
  // Agent A sees Avida Towers Riala, Solinea, The Alcoves, Amara.
  // Agent B sees Park Point, Amaia Steps, Cebu IT Park Residences, Marco Polo.
  // Others see all or filtered list.
  const getAssignedProjects = (): Project[] => {
    if (isAdmin) return ALL_PROJECTS;
    
    // Sort / filter deterministically per Agent ID
    const agentHash = currentUser.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ALL_PROJECTS.filter((_, idx) => {
      // Each agent gets 4-5 projects assigned deterministically
      return (idx + agentHash) % 2 === 0 || (idx + agentHash) % 3 === 0;
    });
  };

  const assignedProjects = getAssignedProjects();

  // Unique list of developers for filtering
  const developers = Array.from(new Set(assignedProjects.map(p => p.developersName)));

  // Filter based on search term & developer
  const filteredProjects = assignedProjects.filter(p => {
    const matchesSearch = 
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.developersName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDeveloper = !selectedDeveloper || p.developersName === selectedDeveloper;
    
    return matchesSearch && matchesDeveloper;
  });

  const getMapsUrl = (projectName: string) => {
    const address = REALTY_PROJECT_ADDRESSES[projectName] || projectName;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="space-y-6" id="projects-index-panel">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-700 dark:text-teal-400 font-bold" />
            {isAdmin ? "Corporate Project Inventories" : "My Assigned Realty Projects"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin 
              ? "Oversee complete enterprise project licenses, cut dimensions, and baseline prices." 
              : "Review and explore specific developer properties currently assigned under your brokerage account."}
          </p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by ID, Developer, or Project Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDeveloper}
            onChange={(e) => setSelectedDeveloper(e.target.value)}
            className="w-full lg:w-auto px-3.5 py-2 text-sm rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="">All Developers</option>
            {developers.map(dev => (
              <option key={dev} value={dev}>{dev}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects list table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden" id="projects-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Project ID</th>
                <th className="px-6 py-4">Project Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Developer Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-300">
              {filteredProjects.map((project, index) => (
                <tr 
                  key={project.id} 
                  className={`${
                    index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-950/20"
                  } hover:bg-slate-55/70 dark:hover:bg-slate-950/40 transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="text-[#00786f] hover:text-[#005a53] font-mono font-bold hover:underline cursor-pointer focus:outline-none"
                    >
                      {project.id}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-105">
                    {project.projectName}
                  </td>
                  <td className="px-6 py-4 text-slate-505 dark:text-slate-400 font-medium">
                    {REALTY_PROJECT_ADDRESSES[project.location] || project.location}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-705 dark:text-slate-350">
                    {project.developersName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProjects.length === 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-750 mb-3" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300">No project listings found</h3>
            <p className="text-slate-455 mt-1 text-xs">Try adjusting your search terms or developer classifications filter.</p>
          </div>
        )}
      </div>

      {/* PROJECT DETAILS MODAL OVERLAY */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-xs" 
          id="earliest-detail-overlay"
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden shrink-0 text-left animate-scale-up hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600 font-bold" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Project Specifications</h3>
                  <p className="text-[10px] font-mono font-bold text-[#0D9488] dark:text-[#2DD4BF] uppercase tracking-widest mt-0.5">Project ID: {selectedProject.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProject(null)} 
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-205 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-slate-605 dark:text-slate-300">
              {/* Name and Developer */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[9px] uppercase font-extrabold text-teal-650 dark:text-teal-400 tracking-wider">
                  Development registry details
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                    {selectedProject.projectName}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Corporate Developer: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedProject.developersName}</span>
                  </div>
                </div>
              </div>

              {/* Specifications: Min cut and baseline price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    Minimum Unit Cut
                  </span>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">
                    {selectedProject.minimumCut}
                  </div>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    Baseline Price
                  </span>
                  <div className="font-extrabold text-[#0D9488] dark:text-[#2DD4BF] text-xs font-mono">
                    ₱{selectedProject.pricePerSqm.toLocaleString()} per sqm
                  </div>
                </div>
              </div>

              {/* Geographic Details and Google Maps pin lookup */}
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Site Project Location:
                  </span>
                  <div className="font-extrabold text-slate-850 dark:text-slate-200 pl-4.5 text-xs flex flex-wrap items-center gap-2">
                    <span>{selectedProject.location}</span>
                    
                    {/* View on Map link using GOOGLE_MAPS search query as requested */}
                    <a 
                      href={getMapsUrl(selectedProject.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900 transition-all"
                    >
                      <Navigation className="w-2.5 h-2.5 text-teal-600 dark:text-teal-405 fill-current" />
                      <span>View on Map</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {REALTY_PROJECT_ADDRESSES[selectedProject.location] && (
                    <div className="pl-4.5 text-[10px] text-slate-455 dark:text-slate-400 font-medium italic">
                      Complete address: {REALTY_PROJECT_ADDRESSES[selectedProject.location]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-end">
              <button 
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 transition-all cursor-pointer border border-transparent shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
