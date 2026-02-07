import { createClient } from "@supabase/supabase-js";
import { databaseApiKey, databaseUrl } from "~/constants/db";

export const client = createClient(databaseUrl, databaseApiKey);
