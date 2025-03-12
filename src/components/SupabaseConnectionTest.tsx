'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SupabaseConnectionTest() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to connect to Supabase with a simpler query that doesn't use aggregates
        const { data, error } = await supabase
          .from('torah_texts')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        
        // If we got here, connection is successful
        setStatus('connected');
        setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'URL not available');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'Unknown error');
        console.error('Supabase connection error:', error);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg max-w-md mx-auto mt-4">
      <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
      
      {status === 'loading' && (
        <div className="text-gray-600">Testing connection to Supabase...</div>
      )}
      
      {status === 'connected' && (
        <div className="text-green-600">
          <p className="mb-2">✅ Connected to Supabase successfully!</p>
          <p className="text-sm text-gray-600">URL: {supabaseUrl}</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-red-600">
          <p className="mb-2">❌ Error connecting to Supabase</p>
          <p className="text-sm">{errorMessage}</p>
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
            <p className="font-semibold">Checklist:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Verify your Supabase URL and anon key in .env.local</li>
              <li>Check if the schema.sql was executed successfully</li>
              <li>Make sure Supabase is running and accessible</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 