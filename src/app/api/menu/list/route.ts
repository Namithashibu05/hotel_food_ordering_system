
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Menu from '@/models/Menu';

export async function GET(request: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const category = searchParams.get('category') || 'All';
        const vegFilter = searchParams.get('veg') || 'all';
        const search = searchParams.get('search') || '';

        const query: any = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (category !== 'All') {
            query.category = category;
        }

        if (vegFilter === 'veg') {
            query.isVeg = true;
        } else if (vegFilter === 'non-veg') {
            query.isVeg = false;
        }

        const skip = (page - 1) * limit;

        const items = await Menu.find(query)
            .sort({ category: 1, name: 1 })
            .skip(skip)
            .limit(limit + 1); // Fetch one extra to check if there are more

        const hasMore = items.length > limit;
        const resultItems = hasMore ? items.slice(0, limit) : items;

        return NextResponse.json({
            items: resultItems,
            hasMore
        });
    } catch (error) {
        console.error('Fetch menu items error:', error);
        return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
    }
}
