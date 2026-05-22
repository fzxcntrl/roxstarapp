import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // This would proxy to your backend or implement auth directly
  const body = await request.json();
  
  // For now, proxy to external backend
  const backendUrl = process.env.BACKEND_URL || 'https://your-backend.railway.app';
  
  const response = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}