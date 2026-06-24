import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uprykiqtdklubvhmrsai.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_JNlbM9HDsTj6ihBjoNbFWg_PdhU7aNN";

async function test() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log("Attempting anonymous sign in...");
  const anonRes = await supabase.auth.signInAnonymously();
  if (anonRes.error) {
    console.error("Anonymous sign in failed:", anonRes.error.message);
  } else {
    console.log("Anonymous sign in succeeded! User:", anonRes.data.user);
    console.log("Checking if we can insert into 'notifications' now...");
    const notif = {
      id: "test_notif_" + Date.now(),
      title: "Test Notification",
      message: "Test Message",
      timestamp: new Date().toISOString(),
      read: false,
      type: "DUPLICATE_ALERT"
    };
    const insertRes = await supabase.from("notifications").insert(notif).select();
    if (insertRes.error) {
      console.error("Insert failed even while authenticated:", insertRes.error.message, JSON.stringify(insertRes.error));
    } else {
      console.log("Insert succeeded!", insertRes.data);
      // clean up
      await supabase.from("notifications").delete().eq("id", notif.id);
    }
  }
}

test();
