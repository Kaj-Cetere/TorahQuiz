import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { fetchText } from '../lib/sefaria/api';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Supabase connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Missing OpenAI API key in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the Bavli tractates
const bavliTractates = [
  { title: "Berakhot", heTitle: "ברכות", section: "Seder Zeraim", length: 64 },
  { title: "Shabbat", heTitle: "שבת", section: "Seder Moed", length: 157 },
  { title: "Eruvin", heTitle: "עירובין", section: "Seder Moed", length: 105 },
  { title: "Pesachim", heTitle: "פסחים", section: "Seder Moed", length: 121 },
  { title: "Rosh Hashanah", heTitle: "ראש השנה", section: "Seder Moed", length: 35 },
  { title: "Yoma", heTitle: "יומא", section: "Seder Moed", length: 88 },
  { title: "Sukkah", heTitle: "סוכה", section: "Seder Moed", length: 56 },
  { title: "Beitzah", heTitle: "ביצה", section: "Seder Moed", length: 40 },
  { title: "Taanit", heTitle: "תענית", section: "Seder Moed", length: 31 },
  { title: "Megillah", heTitle: "מגילה", section: "Seder Moed", length: 32 },
  { title: "Moed Katan", heTitle: "מועד קטן", section: "Seder Moed", length: 29 },
  { title: "Chagigah", heTitle: "חגיגה", section: "Seder Moed", length: 27 },
  { title: "Yevamot", heTitle: "יבמות", section: "Seder Nashim", length: 122 },
  { title: "Ketubot", heTitle: "כתובות", section: "Seder Nashim", length: 112 },
  { title: "Nedarim", heTitle: "נדרים", section: "Seder Nashim", length: 91 },
  { title: "Nazir", heTitle: "נזיר", section: "Seder Nashim", length: 66 },
  { title: "Sotah", heTitle: "סוטה", section: "Seder Nashim", length: 49 },
  { title: "Gittin", heTitle: "גיטין", section: "Seder Nashim", length: 90 },
  { title: "Kiddushin", heTitle: "קידושין", section: "Seder Nashim", length: 82 },
  { title: "Bava Kamma", heTitle: "בבא קמא", section: "Seder Nezikin", length: 119 },
  { title: "Bava Metzia", heTitle: "בבא מציעא", section: "Seder Nezikin", length: 119 },
  { title: "Bava Batra", heTitle: "בבא בתרא", section: "Seder Nezikin", length: 176 },
  { title: "Sanhedrin", heTitle: "סנהדרין", section: "Seder Nezikin", length: 113 },
  { title: "Makkot", heTitle: "מכות", section: "Seder Nezikin", length: 24 },
  { title: "Shevuot", heTitle: "שבועות", section: "Seder Nezikin", length: 49 },
  { title: "Avodah Zarah", heTitle: "עבודה זרה", section: "Seder Nezikin", length: 76 },
  { title: "Horayot", heTitle: "הוריות", section: "Seder Nezikin", length: 14 },
  { title: "Zevachim", heTitle: "זבחים", section: "Seder Kodashim", length: 120 },
  { title: "Menachot", heTitle: "מנחות", section: "Seder Kodashim", length: 110 },
  { title: "Chullin", heTitle: "חולין", section: "Seder Kodashim", length: 142 },
  { title: "Bekhorot", heTitle: "בכורות", section: "Seder Kodashim", length: 61 },
  { title: "Arakhin", heTitle: "ערכין", section: "Seder Kodashim", length: 34 },
  { title: "Temurah", heTitle: "תמורה", section: "Seder Kodashim", length: 34 },
  { title: "Keritot", heTitle: "כריתות", section: "Seder Kodashim", length: 28 },
  { title: "Meilah", heTitle: "מעילה", section: "Seder Kodashim", length: 22 },
  { title: "Tamid", heTitle: "תמיד", section: "Seder Kodashim", length: 9 },
  { title: "Niddah", heTitle: "נדה", section: "Seder Tahorot", length: 73 }
];

// Function to create a reference string in Sefaria format
const createRef = (tractate: string, daf: number, amud: 'a' | 'b') => {
  return `${tractate}.${daf}${amud}`;
};

// Function to pre-embed a single text
async function embedText(
  tractate: string, 
  daf: number, 
  amud: 'a' | 'b', 
  embeddings: OpenAIEmbeddings
): Promise<boolean> {
  const ref = createRef(tractate, daf, amud);
  console.log(`Processing ${ref}...`);
  
  try {
    // Check if text already exists in the database
    const { data: existingText, error: checkError } = await supabase
      .from('torah_texts')
      .select('id')
      .eq('ref', ref)
      .limit(1);
    
    if (checkError) {
      console.error(`Error checking if ${ref} exists:`, checkError);
      return false;
    }
    
    if (existingText && existingText.length > 0) {
      console.log(`${ref} already exists in the database, skipping...`);
      return true;
    }
    
    // Fetch text from Sefaria
    const textData = await fetchText(ref);
    
    if (!textData || !textData.he || !textData.text) {
      console.error(`No text data found for ${ref}`);
      return false;
    }
    
    // Process Hebrew text
    const heText = Array.isArray(textData.he) ? textData.he.join(' ') : textData.he;
    const heMetadata = {
      ref,
      book: tractate,
      section: `${daf}${amud}`,
      language: 'he',
    };
    
    // Process English text
    const enText = Array.isArray(textData.text) ? textData.text.join(' ') : textData.text;
    const enMetadata = {
      ref,
      book: tractate,
      section: `${daf}${amud}`,
      language: 'en',
    };
    
    // Create embeddings and insert into database
    // Use LangChain's SupabaseVectorStore to handle embedding and storage
    await SupabaseVectorStore.fromTexts(
      [heText],
      [heMetadata],
      embeddings,
      {
        client: supabase,
        tableName: 'torah_texts',
        queryName: 'match_torah_texts',
      }
    );
    
    await SupabaseVectorStore.fromTexts(
      [enText],
      [enMetadata],
      embeddings,
      {
        client: supabase,
        tableName: 'torah_texts',
        queryName: 'match_torah_texts',
      }
    );
    
    console.log(`Successfully embedded ${ref}`);
    return true;
  } catch (error) {
    console.error(`Error embedding ${ref}:`, error);
    return false;
  }
}

// Main function to process all tractates
async function embedAllTalmudTexts() {
  console.log('Starting to embed all Talmud texts...');
  
  // Initialize OpenAI embeddings
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: openaiApiKey,
    modelName: 'text-embedding-3-small', // Using the latest model
  });
  
  // Process each tractate
  for (const tractate of bavliTractates) {
    console.log(`\nProcessing tractate: ${tractate.title} (${tractate.heTitle})`);
    
    // Process all dafim from 2a to the end
    for (let daf = 2; daf <= tractate.length; daf++) {
      // Process both 'a' and 'b' sides of each daf
      await embedText(tractate.title, daf, 'a', embeddings);
      await embedText(tractate.title, daf, 'b', embeddings);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`Completed tractate: ${tractate.title}`);
  }
  
  console.log('Finished embedding all Talmud texts');
}

// Run the script
embedAllTalmudTexts()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 