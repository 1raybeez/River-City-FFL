import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
  }

  try {
    // For now, we return mock data that matches your engine's expectations.
    // In a future step, we can link this to your Firebase for actual auction prices.
    const playerStats = {
      draftPrice: 25, 
      faabBids: [5, 12],
      keeperEligible: true,
      ppg: 14.5,
      gamesPlayed: 12,
      snapsShare: 0.75,
      targetsPerGame: 8.2,
      carriesPerGame: 0.5,
      redZoneTouchesPerGame: 1.2
    };

    return NextResponse.json(playerStats);
  } catch (error) {
    console.error("Sleeper Player API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch player stats' }, { status: 500 });
  }
}