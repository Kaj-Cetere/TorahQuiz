import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

// Create Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateMatchFunction() {
  try {
    console.log('Reading SQL file...');
    const sqlFilePath = path.join(__dirname, './update-match-function.sql');
    
    // Check if file exists
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`SQL file not found at ${sqlFilePath}`);
      
      // Try relative path as fallback
      const altPath = path.resolve('./src/scripts/update-match-function.sql');
      console.log(`Trying alternative path: ${altPath}`);
      
      if (fs.existsSync(altPath)) {
        console.log(`Found SQL file at ${altPath}`);
        const sql = fs.readFileSync(altPath, 'utf8');
        console.log('SQL file content:', sql.substring(0, 100) + '...');
        
        // Continue with execution
        console.log('Executing SQL to update match_torah_texts function...');
        const { error } = await supabase.rpc('execute_sql', {
          sql_statement: sql
        });
        
        if (error) {
          console.error('Error updating match_torah_texts function:', error);
          
          // Fallback to direct execution (might not work depending on permissions)
          console.log('Trying direct SQL execution...');
          const { error: directError } = await supabase.from('sql_query_direct').insert({
            query: sql
          });
          
          if (directError) {
            console.error('Direct SQL execution failed:', directError);
            console.log('SQL function update failed. You may need to run this SQL manually in the Supabase dashboard.');
          } else {
            console.log('SQL function updated successfully via direct execution.');
          }
        } else {
          console.log('match_torah_texts function updated successfully!');
        }
      } else {
        console.error('SQL file not found at alternative location either.');
        process.exit(1);
      }
    } else {
      const sql = fs.readFileSync(sqlFilePath, 'utf8');
      console.log('SQL file content:', sql.substring(0, 100) + '...');
      
      console.log('Executing SQL to update match_torah_texts function...');
      const { error } = await supabase.rpc('execute_sql', {
        sql_statement: sql
      });
      
      if (error) {
        console.error('Error updating match_torah_texts function:', error);
        
        // Fallback to direct execution (might not work depending on permissions)
        console.log('Trying direct SQL execution...');
        const { error: directError } = await supabase.from('sql_query_direct').insert({
          query: sql
        });
        
        if (directError) {
          console.error('Direct SQL execution failed:', directError);
          console.log('SQL function update failed. You may need to run this SQL manually in the Supabase dashboard.');
        } else {
          console.log('SQL function updated successfully via direct execution.');
        }
      } else {
        console.log('match_torah_texts function updated successfully!');
      }
    }

    // Test if any torah_texts with embeddings exist
    console.log('Checking for records with embeddings...');
    const { data: embeddingsData, error: embeddingsError } = await supabase
      .from('torah_texts')
      .select('id, ref, language')
      .not('embedding', 'is', null)
      .limit(5);

    if (embeddingsError) {
      console.error('Error checking for embeddings:', embeddingsError);
    } else {
      console.log(`Found ${embeddingsData?.length || 0} texts with embeddings:`, embeddingsData);
    }

  } catch (error) {
    console.error('Unexpected error during function update:', error);
  }
}

// Run the update
updateMatchFunction(); 