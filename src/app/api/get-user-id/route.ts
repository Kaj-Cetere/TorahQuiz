import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create a Supabase client using the auth-helpers-nextjs package
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the user's session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
    }
    
    if (!session) {
      // Fallback to service role client to get a user ID for testing
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Query users table to get at least one user ID
      const { data: userData, error: userError } = await serviceClient
        .from('user_progress')
        .select('user_id')
        .limit(1);
        
      if (userError || !userData || userData.length === 0) {
        return NextResponse.json({ 
          error: 'Not logged in', 
          message: 'Please visit /api/admin-get-user to get a user ID for testing' 
        }, { status: 401 });
      }
      
      // Return the first user ID we find (emergency fallback)
      return NextResponse.json({
        userId: userData[0].user_id,
        message: 'Using admin access to get a user ID for testing purposes.',
        note: 'To fix authentication, please make sure you are logged in through the web UI.'
      });
    }
    
    return NextResponse.json({
      userId: session.user.id,
      email: session.user.email
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user ID',
      message: 'Please try the /api/admin-get-user endpoint instead'
    }, { status: 500 });
  }
} 