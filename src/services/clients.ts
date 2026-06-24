import { supabase } from "../lib/supabase/client";
import { Client } from "../types";

export const clientsService = {
  /**
   * Fetches client list with optional filtering and search limits.
   */
  async getClients(filters?: { 
    assignedAgentId?: string; 
    search?: string; 
    limit?: number;
    duplicateStatus?: string;
  }): Promise<Client[]> {
    let query = supabase.from("clients").select("*");

    if (filters?.assignedAgentId) {
      query = query.eq("assignedAgentId", filters.assignedAgentId);
    }

    if (filters?.duplicateStatus) {
      query = query.eq("duplicateStatus", filters.duplicateStatus);
    }

    if (filters?.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(`firstName.ilike.${searchVal},lastName.ilike.${searchVal},mobileNumber.ilike.${searchVal},address.ilike.${searchVal}`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order("dateRegistered", { ascending: false });

    if (error) {
      console.error("[clientsService.getClients] Error:", error.message);
      throw new Error(error.message);
    }

    return (data || []) as Client[];
  },

  /**
   * Retrieves a client by unique identifier.
   */
  async getClientById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[clientsService.getClientById] Error for ${id}:`, error.message);
      throw new Error(error.message);
    }

    return data as Client | null;
  },

  /**
   * Registers/inserts a new client.
   */
  async createClient(client: Client): Promise<Client> {
    const { data, error } = await supabase
      .from("clients")
      .insert(client)
      .select()
      .single();

    if (error) {
      console.error("[clientsService.createClient] Error:", error.message);
      throw new Error(error.message);
    }

    return data as Client;
  },

  /**
   * Updates existing client values.
   */
  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[clientsService.updateClient] Error for ${id}:`, error.message);
      throw new Error(error.message);
    }

    return data as Client;
  }
};
