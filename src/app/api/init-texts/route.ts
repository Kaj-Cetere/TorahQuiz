import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchText } from '@/lib/sefaria/api';

// This endpoint needs to use the service role key to bypass RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a service role client that can bypass RLS policies
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// A simple endpoint to initialize the database with some texts
export async function GET() {
  try {
    console.log('Running database initialization with service role client...');
    
    // Check if we already have texts in the torah_texts table
    const { data: existingTexts, error: checkError } = await serviceClient
      .from('torah_texts')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing texts:', checkError);
      return NextResponse.json({ error: 'Failed to check existing texts' }, { status: 500 });
    }
    
    if (existingTexts && existingTexts.length > 0) {
      console.log('Database already has texts, skipping initialization');
      return NextResponse.json({ message: 'Database already has texts' });
    }
    
    // We'll add a few texts from Berakhot to get started
    const tractate = 'Berakhot';
    const results = [];
    
    // Add a few dafim
    for (let daf = 2; daf <= 5; daf++) {
      for (const amud of ['a', 'b']) {
        const ref = `${tractate}.${daf}${amud}`;
        console.log(`Adding ${ref}...`);
        
        try {
          // Fetch text from Sefaria
          const textData = await fetchText(ref);
          
          if (textData && textData.he && textData.text) {
            // Store Hebrew text using the service role client
            const { data: heData, error: heError } = await serviceClient
              .from('torah_texts')
              .insert({
                ref,
                book: tractate,
                content: JSON.stringify(textData.he),
                language: 'he',
                section: `${daf}${amud}`
              })
              .select();
            
            if (heError) {
              console.error(`Error adding Hebrew text for ${ref}:`, heError);
              throw heError;
            }
            
            // Store English text using the service role client
            const { data: enData, error: enError } = await serviceClient
              .from('torah_texts')
              .insert({
                ref,
                book: tractate,
                content: JSON.stringify(textData.text),
                language: 'en',
                section: `${daf}${amud}`
              })
              .select();
            
            if (enError) {
              console.error(`Error adding English text for ${ref}:`, enError);
              throw enError;
            }
            
            results.push({ ref, success: true });
            console.log(`Successfully added ${ref}`);
          } else {
            results.push({ ref, success: false, reason: 'No text data returned from Sefaria' });
            console.log(`Failed to add ${ref}: No text data`);
          }
        } catch (textError) {
          console.error(`Error adding ${ref}:`, textError);
          results.push({ ref, success: false, reason: 'Error processing text' });
        }
      }
    }
    
    return NextResponse.json({ 
      message: 'Database initialization complete', 
      results 
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json({ error: 'Database initialization failed' }, { status: 500 });
  }
} 