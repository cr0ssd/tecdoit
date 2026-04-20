const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar la Service Key en backend, NO la Anon Key

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;