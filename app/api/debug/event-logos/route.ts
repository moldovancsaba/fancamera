import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get('eventId');
  
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }
  
  const db = await connectToDatabase();
  const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
  
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    eventId: event._id.toString(),
    eventName: event.name,
    hasLogosArray: !!event.logos,
    logosCount: event.logos?.length || 0,
    logos: event.logos || [],
  });
}
