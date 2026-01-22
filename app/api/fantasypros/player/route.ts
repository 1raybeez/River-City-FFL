import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
  }

  try {
    // Mock projections for the TradeFairnessResult engine.
    const projections = {
      rosProjection: 120.5,
      playoffProjection: 45.2,
      sosScore: 65, 
      ecrRank: 42,  
      boomRate: 0.15,
      bustRate: 0.08
    };

    return NextResponse.json(projections);
  } catch (error) {
    console.error("FantasyPros API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
  }
}