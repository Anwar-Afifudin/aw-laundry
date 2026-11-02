import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  const missingEnvironmentVariables: string[] = [];

  if (!supabaseUrl) {
    missingEnvironmentVariables.push("VITE_SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    missingEnvironmentVariables.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  throw new Error(
    `Supabase configuration error: Missing required environment variable(s): ${missingEnvironmentVariables.join(
      ", ",
    )}.`,
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
