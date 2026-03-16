import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const limit = request.nextUrl.searchParams.get('limit') || '50';
    
    const response = await fetch(`${apiUrl}/api/download/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Backend history error:', response.status);
      return NextResponse.json(
        { data: [] },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Download history error:', error);
    return NextResponse.json(
      { data: [] },
      { status: 200 }
    );
  }
}
