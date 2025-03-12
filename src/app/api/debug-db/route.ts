import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { fetchText } from '@/lib/sefaria/api';

// This endpoint needs to use the service role key to bypass RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a service role client that can bypass RLS policies
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// A debug endpoint to check the database state
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const action = url.searchParams.get('action') || 'check';
  
  // Try to get userId from session if not provided in the URL
  if (!userId) {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        return NextResponse.redirect(
          new URL(`${url.pathname}?userId=${session.user.id}&action=${action}`, url.origin)
        );
      }
    } catch (error) {
      console.error('Error getting session:', error);
    }
  }
  
  try {
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter. Please log in or specify a userId.' }, { status: 400 });
    }
    
    const results: any = {
      userProgress: [],
      userTexts: [],
      masterTextsSummary: {},
      tractateCounts: {},
      action: action
    };
    
    // 1. Check user progress
    const { data: progressData, error: progressError } = await serviceClient
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);
      
    if (progressError) {
      console.error('Error checking user progress:', progressError);
      return NextResponse.json({ error: 'Failed to check user progress' }, { status: 500 });
    }
    
    results.userProgress = progressData || [];
    
    // 2. Check user texts
    const { data: userTexts, error: userTextsError } = await serviceClient
      .from('user_torah_texts')
      .select('*')
      .eq('user_id', userId);
      
    if (userTextsError) {
      console.error('Error checking user texts:', userTextsError);
      return NextResponse.json({ error: 'Failed to check user texts' }, { status: 500 });
    }
    
    results.userTexts = userTexts || [];
    
    // 3. Get a summary of what's in the master table
    const { data: masterSummary, error: masterSummaryError } = await serviceClient
      .from('torah_texts')
      .select('book, language')
      .order('book');
      
    if (masterSummaryError) {
      console.error('Error getting master table summary:', masterSummaryError);
    } else {
      // Group by tractate and count
      const tractateCounts: Record<string, {total: number, hebrew: number, english: number}> = {};
      
      masterSummary?.forEach(item => {
        if (!tractateCounts[item.book]) {
          tractateCounts[item.book] = { total: 0, hebrew: 0, english: 0 };
        }
        
        tractateCounts[item.book].total++;
        
        if (item.language === 'he') {
          tractateCounts[item.book].hebrew++;
        } else if (item.language === 'en') {
          tractateCounts[item.book].english++;
        }
      });
      
      results.tractateCounts = tractateCounts;
      results.masterTextsSummary = {
        totalTexts: masterSummary?.length || 0,
        uniqueTractates: Object.keys(tractateCounts).length,
      };
    }
    
    // 4. Check for Avodah Zarah in master table
    const { data: avodahZarahTexts, error: avodahZarahError } = await serviceClient
      .from('torah_texts')
      .select('section, language')
      .eq('book', 'Avodah Zarah');
      
    if (avodahZarahError) {
      console.error('Error checking for Avodah Zarah:', avodahZarahError);
    } else {
      // Group by section and count
      const sectionCounts: Record<string, {hebrew: boolean, english: boolean}> = {};
      
      avodahZarahTexts?.forEach(item => {
        if (!sectionCounts[item.section]) {
          sectionCounts[item.section] = { hebrew: false, english: false };
        }
        
        if (item.language === 'he') {
          sectionCounts[item.section].hebrew = true;
        } else if (item.language === 'en') {
          sectionCounts[item.section].english = true;
        }
      });
      
      results.avodahZarahSections = sectionCounts;
      
      // Check specifically for daf 2a which is mentioned in the issue
      const has2a = sectionCounts['2a'];
      results.has2a = has2a ? {
        hebrew: has2a.hebrew,
        english: has2a.english,
        complete: has2a.hebrew && has2a.english
      } : false;
    }
    
    // If action is 'fix' and Avodah Zarah 2a doesn't exist, add it
    if (action === 'fix' && (!results.has2a || !results.has2a.complete)) {
      const ref = 'Avodah Zarah.2a';
      console.log(`Adding ${ref} to master table...`);
      
      try {
        // Fetch text from Sefaria
        const textData = await fetchText(ref);
        
        if (textData && textData.he && textData.text) {
          // Store Hebrew text if needed
          if (!results.has2a || !results.has2a.hebrew) {
            const { data: heData, error: heError } = await serviceClient
              .from('torah_texts')
              .insert({
                ref,
                book: 'Avodah Zarah',
                content: JSON.stringify(textData.he),
                language: 'he',
                section: '2a'
              })
              .select();
            
            if (heError) {
              console.error(`Error adding Hebrew text for ${ref}:`, heError);
              results.fixHebrewError = heError;
            } else {
              results.fixHebrew = 'success';
            }
          }
          
          // Store English text if needed
          if (!results.has2a || !results.has2a.english) {
            const { data: enData, error: enError } = await serviceClient
              .from('torah_texts')
              .insert({
                ref,
                book: 'Avodah Zarah',
                content: JSON.stringify(textData.text),
                language: 'en',
                section: '2a'
              })
              .select();
            
            if (enError) {
              console.error(`Error adding English text for ${ref}:`, enError);
              results.fixEnglishError = enError;
            } else {
              results.fixEnglish = 'success';
            }
          }
          
          // Also mark it as learned for the user if not already
          const userHasLearned = results.userProgress.some((p: any) => p.ref === ref && p.is_completed);
          
          if (!userHasLearned) {
            const { data: markData, error: markError } = await serviceClient
              .rpc('mark_daf_learned', {
                p_user_id: userId,
                p_ref: ref,
                p_completed_at: new Date().toISOString()
              });
              
            if (markError) {
              console.error(`Error marking ${ref} as learned:`, markError);
              results.markLearnedError = markError;
            } else {
              results.markLearned = 'success';
            }
          } else {
            results.markLearned = 'already marked as learned';
          }
          
          // Check if user collection has the text
          const userHasText = results.userTexts.some((t: any) => t.ref === ref);
          
          if (!userHasText) {
            // Manually copy to user collection if needed
            const { error: copyError } = await serviceClient
              .rpc('copy_user_text_by_ref', {
                p_user_id: userId,
                p_ref: ref
              });
              
            if (copyError) {
              console.error(`Error copying ${ref} to user collection:`, copyError);
              results.copyError = copyError;
            } else {
              results.copyToUser = 'success';
            }
          } else {
            results.copyToUser = 'already in user collection';
          }
        } else {
          results.fetchError = 'No text data returned from Sefaria';
        }
      } catch (error) {
        console.error(`Error in fix process:`, error);
        results.fixError = error;
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Debug endpoint failed' }, { status: 500 });
  }
} 