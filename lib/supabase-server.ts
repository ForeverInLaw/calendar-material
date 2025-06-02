// lib/supabase-server.ts
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Define a type for the mock client to avoid 'any'
type MockSupabaseClient = {
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
  };
  // Add other methods you might mock
  from: (table: string) => any; // Keep 'any' for simplicity or type properly
};

export const createServiceRoleClient = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase URL or Service Role Key is missing for service client.");
    // Можно вернуть мок или выбросить ошибку
    throw new Error("Service client configuration error.");
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      // Отключаем автоматическое обновление токена, так как это сервисный ключ
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const createServerClient = (): SupabaseClient | MockSupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase URL or Anon Key is missing. Returning a mock client for build/preview.",
    );
    // Return a mock client for build/preview or if env vars are missing
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: (_table: string) => ({ // Mock 'from' and subsequent calls
        select: (_query?: string) => ({
          eq: (_column: string, _value: any) => ({
            eq: (_column2: string, _value2: any) => ({ // chain further if needed
              not: (_column3: string, _operator: string, _value3: any) => Promise.resolve({ data: [], error: null }),
              single: () => Promise.resolve({ data: null, error: null }), // if you use .single()
              // Add other common query methods you use if needed
            }),
            not: (_column2: string, _operator: string, _value2: any) => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          // Add other Supabase methods you use in these routes
        }),
      }),
    } as MockSupabaseClient;
  }

  const cookieStore = cookies(); // This is now called within a request context

  return createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Handle cases where cookies can't be set (e.g., during SSG)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Handle cases where cookies can't be removed
        }
      },
    },
  });
};

// DO NOT export a pre-initialized client like this:
// export const supabaseServer = createServerClient();
// This was the primary cause of the "cookies outside request scope" error.
