const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Intentar cargar desde la raíz y luego desde local
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

// Mapear variables (Soporta nombres estándar de backend y nombres de Vite)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("ERROR: No se encontró SUPABASE_URL ni VITE_SUPABASE_URL en el .env");
}

if (!supabaseKey) {
  console.error("ERROR: No se encontró SUPABASE_SERVICE_ROLE_KEY ni VITE_SUPABASE_ANON_KEY en el .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;