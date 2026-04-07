import { createClient } from "@supabase/supabase-js";

// Substitua com suas credenciais do Supabase
const supabaseUrl = "https://kjkochjdwzocccebexxl.supabase.co";
const supabaseAnonKey = "sb_publishable_UJjP4a6JrYafdAwlttMzMA_SAXrY9j-";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Teste de conexão (adicione temporariamente)
// supabase.auth.getSession().then(console.log);
