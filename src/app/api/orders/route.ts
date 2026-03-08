export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Menu from '@/models/Menu';

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();

        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ error: 'Order must contain items' }, { status: 400 });
        }

        // Fetch prep times for items to calculate total estimated prep time
        const itemIds = body.items.map((i: any) => i.menuItem);
        const menuItems = await Menu.find({ _id: { $in: itemIds } });
        
        let maxPrepTime = 15; // default 15 mins
        if (menuItems.length > 0) {
            maxPrepTime = Math.max(...menuItems.map(item => item.prepTime || 15));
        }

        const order = await Order.create({
            ...body,
            estimatedPrepTime: maxPrepTime
        });
        
        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Order error:', error);
        return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const tableNumber = searchParams.get('tableNumber');
        const filter = tableNumber ? { tableNumber } : {};

        const orders = await Order.find(filter).sort({ createdAt: -1 });
        // Map to ensure estimatedPrepTime exists (for older records in DB)
        const updatedOrders = orders.map(order => {
            const obj = order.toObject();
            if (obj.estimatedPrepTime === undefined || obj.estimatedPrepTime === null) {
                obj.estimatedPrepTime = 15; // default fallback
            }
            return obj;
        });
        return NextResponse.json(updatedOrders);
    } catch (error) {
        console.error('Fetch orders error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
