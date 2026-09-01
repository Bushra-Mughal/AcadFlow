import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createAdminAccount() {
  const username = 'admin';
  const password = 'Admin@AcadFlow2026!';
  const email = `${username}@miaoda.com`;

  try {
    console.log('Creating admin account...');
    
    // Step 1: Sign up the user (triggers handle_new_user)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return;
    }

    if (!authData.user) {
      console.error('No user returned from signup');
      return;
    }

    console.log('User created with ID:', authData.user.id);

    // Step 2: Update role to admin using service role key
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return;
    }

    console.log('\nâœ… Admin account created successfully!');
    console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
    console.log('\nâš ï¸  Please save these credentials securely!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminAccount();


