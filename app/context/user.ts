import type { User } from "@supabase/supabase-js";
import { createContext } from "react-router";

export const userContext = createContext<User | null>(null);
