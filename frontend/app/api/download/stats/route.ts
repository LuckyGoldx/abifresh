import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    const response = await fetch(`${apiUrl}/api/download/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Backend stats error:', response.status);
      return NextResponse.json(
        { 
          totalDownloads: 0, 
          recentDownloads: 0, 
          todayDownloads: 0, 
          platformBreakdown: {} 
        },
        { status: 200 } // Return empty stats instead of error to prevent breaking UI
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Download stats error:', error);
    return NextResponse.json(
      { 
        totalDownloads: 0, 
        recentDownloads: 0, 
        todayDownloads: 0, 
        platformBreakdown: {} 
      },
      { status: 200 } // Return empty stats instead of error
    );
  }
}
