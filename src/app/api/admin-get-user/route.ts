import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint uses the service role key to bypass RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a service role client
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // Get users from the database
    const { data: userData, error: userError } = await serviceClient
      .from('user_progress')
      .select('user_id')
      .limit(10);
      
    if (userError) {
      console.error('Error fetching users:', userError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
    
    if (!userData || userData.length === 0) {
      return NextResponse.json({ error: 'No users found in the database' }, { status: 404 });
    }
    
    // Get unique user IDs
    const uniqueUserIds = [...new Set(userData.map(item => item.user_id))];
    
    return NextResponse.json({
      userIds: uniqueUserIds,
      note: "This is an admin endpoint to retrieve user IDs directly from the database. You should use this ID with the debug-db and init-talmud endpoints."
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to get user IDs' }, { status: 500 });
  }
} 