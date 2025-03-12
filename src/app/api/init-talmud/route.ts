import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchText } from '@/lib/sefaria/api';

// This endpoint needs to use the service role key to bypass RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a service role client that can bypass RLS policies
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Define interface for tractate info
interface TractateInfo {
  length: number;
}

// Define the type for the tractate map
type TractateMap = {
  [key: string]: TractateInfo;
};

// Define the type for initialization results
interface InitializationResult {
  message?: string;
  error?: string;
  summary?: {
    totalProcessed: number;
    successful: number;
    failed: number;
  };
  results?: any[];
  errors?: any[];
}

// Talmud tractate information
const TRACTATE_INFO: TractateMap = {
  'Berakhot': { length: 64 },
  'Shabbat': { length: 157 },
  'Eruvin': { length: 105 },
  'Pesachim': { length: 121 },
  'Shekalim': { length: 22 },
  'Yoma': { length: 88 },
  'Sukkah': { length: 56 },
  'Beitzah': { length: 40 },
  'Rosh Hashanah': { length: 35 },
  'Taanit': { length: 31 },
  'Megillah': { length: 32 },
  'Moed Katan': { length: 29 },
  'Chagigah': { length: 27 },
  'Yevamot': { length: 122 },
  'Ketubot': { length: 112 },
  'Nedarim': { length: 91 },
  'Nazir': { length: 66 },
  'Sotah': { length: 49 },
  'Gittin': { length: 90 },
  'Kiddushin': { length: 82 },
  'Bava Kamma': { length: 119 },
  'Bava Metzia': { length: 119 },
  'Bava Batra': { length: 176 },
  'Sanhedrin': { length: 113 },
  'Makkot': { length: 24 },
  'Shevuot': { length: 49 },
  'Avodah Zarah': { length: 76 },
  'Horayot': { length: 14 },
  'Zevachim': { length: 120 },
  'Menachot': { length: 110 },
  'Chullin': { length: 142 },
  'Bekhorot': { length: 61 },
  'Arakhin': { length: 34 },
  'Temurah': { length: 34 },
  'Keritot': { length: 28 },
  'Meilah': { length: 22 },
  'Tamid': { length: 9 },
  'Niddah': { length: 73 }
};

// Batch size for insertion
const BATCH_SIZE = 2; // Adjust based on performance and rate limits

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tractateParam = url.searchParams.get('tractate');
    const force = url.searchParams.get('force') === 'true';
    const startDaf = parseInt(url.searchParams.get('startDaf') || '2', 10);
    const endDaf = parseInt(url.searchParams.get('endDaf') || '0', 10);
    
    // If tractates are specified, process them
    if (tractateParam) {
      // Split by comma to support multiple tractates
      const tractates = tractateParam.split(',').map(t => t.trim());
      
      // Validate tractates
      const validTractates = tractates.filter(t => t in TRACTATE_INFO);
      const invalidTractates = tractates.filter(t => !(t in TRACTATE_INFO));
      
      if (validTractates.length === 0) {
        return NextResponse.json({ 
          error: 'No valid tractates specified', 
          invalidTractates,
          availableTractates: Object.keys(TRACTATE_INFO)
        }, { status: 400 });
      }
      
      // Process each tractate
      const results: Record<string, InitializationResult> = {};
      
      for (const tractate of validTractates) {
        console.log(`Processing tractate: ${tractate}`);
        const tractateResult = await initializeTractate(tractate, force, startDaf, endDaf);
        results[tractate] = tractateResult;
      }
      
      return NextResponse.json({
        message: `Processed ${validTractates.length} tractates`,
        invalidTractates: invalidTractates.length > 0 ? invalidTractates : undefined,
        results
      });
    }
    
    // Otherwise, show available tractates and instructions
    return NextResponse.json({
      message: 'Please specify tractates to initialize',
      availableTractates: Object.keys(TRACTATE_INFO),
      usage: {
        initOneTractate: '/api/init-talmud?tractate=Berakhot',
        initMultipleTractates: '/api/init-talmud?tractate=Berakhot,Shabbat,Eruvin',
        initWithForce: '/api/init-talmud?tractate=Berakhot&force=true',
        initRangeOfPages: '/api/init-talmud?tractate=Berakhot&startDaf=2&endDaf=10'
      }
    });
  } catch (error) {
    console.error('Initialization failed:', error);
    return NextResponse.json({ error: 'Initialization failed' }, { status: 500 });
  }
}

async function initializeTractate(tractate: string, force: boolean = false, startDaf: number = 2, endDaf: number = 0): Promise<InitializationResult> {
  // Validate tractate
  if (!(tractate in TRACTATE_INFO)) {
    return { error: 'Invalid tractate' };
  }
  
  // Set proper end daf if not specified
  const maxDaf = TRACTATE_INFO[tractate].length;
  if (endDaf <= 0 || endDaf > maxDaf) {
    endDaf = maxDaf;
  }
  
  console.log(`Initializing ${tractate} from daf ${startDaf} to ${endDaf}...`);
  
  // Check if we already have this tractate in the database
  if (!force) {
    const { data: existingTexts, error: checkError } = await serviceClient
      .from('torah_texts')
      .select('id')
      .eq('book', tractate)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing texts:', checkError);
      return { error: 'Failed to check existing texts' };
    }
    
    if (existingTexts && existingTexts.length > 0) {
      console.log(`${tractate} already has texts in the database. Use force=true to override.`);
      return { 
        message: `${tractate} already has texts in the database. Use force=true to override.`
      };
    }
  }
  
  // Process the tractate in batches
  const results = [];
  const errors = [];
  
  for (let daf = startDaf; daf <= endDaf; daf++) {
    for (const amud of ['a', 'b']) {
      try {
        // Skip second side of last page if it doesn't exist
        if (daf === maxDaf && amud === 'b') {
          continue;
        }
        
        const ref = `${tractate}.${daf}${amud}`;
        console.log(`Processing ${ref}...`);
        
        // Check if this specific ref already exists
        const { data: existingRef, error: refCheckError } = await serviceClient
          .from('torah_texts')
          .select('id')
          .eq('ref', ref)
          .limit(1);
          
        if (refCheckError) {
          console.error(`Error checking if ${ref} exists:`, refCheckError);
          errors.push({ ref, error: refCheckError });
          continue;
        }
        
        if (existingRef && existingRef.length > 0 && !force) {
          console.log(`${ref} already exists, skipping...`);
          results.push({ ref, success: true, note: 'Already exists' });
          continue;
        }
        
        // Fetch text from Sefaria
        const textData = await fetchText(ref);
        
        if (textData && textData.he && textData.text) {
          // If force is true, delete existing entries first
          if (force && existingRef && existingRef.length > 0) {
            const { error: deleteError } = await serviceClient
              .from('torah_texts')
              .delete()
              .eq('ref', ref);
              
            if (deleteError) {
              console.error(`Error deleting existing ${ref}:`, deleteError);
              errors.push({ ref, error: deleteError });
              continue;
            }
          }
          
          // Store Hebrew text
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
            errors.push({ ref, language: 'he', error: heError });
          }
          
          // Store English text
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
            errors.push({ ref, language: 'en', error: enError });
          }
          
          results.push({ ref, success: !heError && !enError });
          console.log(`Successfully added ${ref}`);
        } else {
          console.log(`No data for ${ref}`);
          errors.push({ ref, error: 'No text data returned from Sefaria' });
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing daf ${daf}${amud}:`, error);
        errors.push({ daf: `${daf}${amud}`, error });
      }
    }
    
    // After each batch, wait a bit longer
    if (daf % BATCH_SIZE === 0) {
      console.log(`Completed batch up to daf ${daf}. Pausing before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return {
    message: `${tractate} initialization process completed`,
    summary: {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length
    },
    results,
    errors: errors.length > 0 ? errors : undefined
  };
} 