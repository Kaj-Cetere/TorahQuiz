import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Supabase URL and anon key from env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create clients for both server and cookie-based auth
export async function GET(request: Request) {
  try {
    // Get cookie store
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    // Create a client using the cookies
    const supabaseWithCookies = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true
        }
      }
    );
    
    // Create a client using the Authorization header (if any)
    const headers = new Headers(request.headers);
    const authHeader = headers.get('Authorization');
    
    const supabaseWithAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            Authorization: authHeader || ''
          }
        }
      }
    );
    
    // Create a standard client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Check for session using different methods
    const { data: { session: cookieSession }, error: cookieError } = 
      await supabaseWithCookies.auth.getSession();
    
    const { data: { session: authSession }, error: authError } = 
      await supabaseWithAuth.auth.getSession();
    
    const { data: { session: standardSession }, error: standardError } = 
      await supabase.auth.getSession();
    
    // Get debug info about cookies
    const cookieInfo = allCookies.map(cookie => ({
      name: cookie.name,
      // Don't show values for security
      hasValue: !!cookie.value
    }));
    
    // Check specifically for Supabase auth cookies
    const supabaseCookies = cookieInfo.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.toLowerCase().includes('auth')
    );
    
    return NextResponse.json({
      sessionState: {
        hasCookieSession: !!cookieSession,
        hasAuthSession: !!authSession,
        hasStandardSession: !!standardSession,
        cookieSessionError: cookieError,
        authSessionError: authError,
        standardSessionError: standardError
      },
      cookieInfo: {
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies,
        allCookies: cookieInfo
      },
      authHeader: !!authHeader,
      userId: cookieSession?.user?.id || authSession?.user?.id || standardSession?.user?.id || null,
      email: cookieSession?.user?.email || authSession?.user?.email || standardSession?.user?.email || null,
      sessionMethod: cookieSession ? 'cookie' : (authSession ? 'auth header' : (standardSession ? 'standard' : 'none')),
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json({ error: 'Error debugging session' }, { status: 500 });
  }
} 