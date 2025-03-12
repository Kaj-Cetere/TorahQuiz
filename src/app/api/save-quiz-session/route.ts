import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();
    const { sessionId, userId, questions, userAnswers, score, settings, completed } = body;
    
    if (!sessionId || !userId || !questions || !settings) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      );
    }
    
    // Authenticate the request using the server component client
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in save-quiz-session API:', authError);
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // Verify that the authenticated user matches the requested user ID
    if (user.id !== userId) {
      console.error('User ID mismatch in save-quiz-session:', {
        requestUserId: userId,
        authUserId: user.id
      });
      
      return NextResponse.json(
        { error: 'User ID mismatch' }, 
        { status: 403 }
      );
    }
    
    // Create a service role client that can bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' }, 
        { status: 500 }
      );
    }
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Insert the quiz session using the service role (bypassing RLS)
    const { data, error } = await serviceClient
      .from('quiz_sessions')
      .upsert({
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        questions: questions,
        user_answers: userAnswers || {},
        score: score,
        difficulty: settings.difficulty,
        completed: completed || false
      });
      
    if (error) {
      console.error('Error saving quiz session with service role:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` }, 
        { status: 500 }
      );
    }
    
    console.log('Quiz session saved successfully with service role');
    return NextResponse.json({ success: true, data: { id: sessionId } });
    
  } catch (error: any) {
    console.error('Error in save-quiz-session API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save quiz session' }, 
      { status: 500 }
    );
  }
} 