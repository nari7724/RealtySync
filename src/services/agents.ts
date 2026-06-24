import { supabase } from "../lib/supabase/client";
import { Agent } from "../types";

export const agentsService = {
  /**
   * Fetches all agents, optionally filtered by status and search terms.
   */
  async getAgents(filters?: { status?: string; search?: string }): Promise<Agent[]> {
    let query = supabase.from("agents").select("*");

    if (filters?.status && filters.status !== "All") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(`firstName.ilike.${searchVal},lastName.ilike.${searchVal},email.ilike.${searchVal},prcLicenseNumber.ilike.${searchVal}`);
    }

    const { data, error } = await query.order("lastName", { ascending: true });

    if (error) {
      console.error("[agentsService.getAgents] Error:", error.message);
      throw new Error(error.message);
    }

    return (data || []) as Agent[];
  },

  /**
   * Fetches a single agent by ID.
   */
  async getAgentById(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[agentsService.getAgentById] Error for ${id}:`, error.message);
      throw new Error(error.message);
    }

    return data as Agent | null;
  },

  /**
   * Creates a new agent record.
   */
  async createAgent(agent: Agent): Promise<Agent> {
    const { data, error } = await supabase
      .from("agents")
      .insert(agent)
      .select()
      .single();

    if (error) {
      console.error("[agentsService.createAgent] Error:", error.message);
      throw new Error(error.message);
    }

    return data as Agent;
  },

  /**
   * Updates an existing agent profile.
   */
  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    const { data, error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[agentsService.updateAgent] Error for ${id}:`, error.message);
      throw new Error(error.message);
    }

    return data as Agent;
  }
};
