import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Rating from '@/models/Rating';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        
        const { rating, comment, customerName, tableNumber, sessionId } = body;

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Valid rating (1-5) is required' }, { status: 400 });
        }

        const newRating = await Rating.create({
            rating,
            comment,
            customerName,
            tableNumber,
            sessionId,
        });

        return NextResponse.json({ success: true, rating: newRating }, { status: 201 });
    } catch (error: any) {
        console.error('Rating submission error:', error);
        return NextResponse.json({ error: error.message || 'Failed to submit rating' }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const ratings = await Rating.find().sort({ createdAt: -1 });
        return NextResponse.json(ratings);
    } catch (error: any) {
        console.error('Fetch ratings error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch ratings' }, { status: 500 });
    }
}
