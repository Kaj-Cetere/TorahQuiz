import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response that we can modify
  const res = NextResponse.next();
  
  // Create a Supabase client specifically for use in the middleware
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh the user's session if needed
  // This updates the cookie if the session was expired
  await supabase.auth.getSession();
  
  return res;
}

// Run on all routes - this is important for auth
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 