import { supabase } from "../lib/supabase/client";
import { Booking } from "../types";

export const bookingsService = {
  /**
   * Fetches booking/appointment schedules with clean filters.
   */
  async getBookings(filters?: { 
    agentId?: string; 
    clientId?: string; 
    status?: string; 
    search?: string;
  }): Promise<Booking[]> {
    let query = supabase.from("bookings").select("*");

    if (filters?.agentId) {
      query = query.eq("agentId", filters.agentId);
    }

    if (filters?.clientId) {
      query = query.eq("clientId", filters.clientId);
    }

    if (filters?.status && filters.status !== "All") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search) {
      const searchVal = `%${filters.search}%`;
      query = query.or(`clientName.ilike.${searchVal},agentName.ilike.${searchVal},appointmentType.ilike.${searchVal},location.ilike.${searchVal}`);
    }

    const { data, error } = await query.order("dateTime", { ascending: true });

    if (error) {
      console.error("[bookingsService.getBookings] Error:", error.message);
      throw new Error(error.message);
    }

    return (data || []) as Booking[];
  },

  /**
   * Fetches a booking schedule by its primary ID.
   */
  async getBookingById(id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`[bookingsService.getBookingById] Error for ${id}:`, error.message);
      throw new Error(error.message);
    }

    return data as Booking | null;
  },

  /**
   * Inserts / schedules a new booking.
   */
  async createBooking(booking: Booking): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .insert(booking)
      .select()
      .single();

    if (error) {
      console.error("[bookingsService.createBooking] Error:", error.message);
      throw new Error(error.message);
    }

    return data as Booking;
  },

  /**
   * Updates an appointment schedule detail.
   */
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[bookingsService.updateBooking] Error for ${id}:`, error.message);
      throw new Error(error.message);
    }

    return data as Booking;
  }
};
