import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Menu from '@/models/Menu';


export async function POST(req: Request) {
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    await dbConnect();
    try {
        const body = await req.json();

        if (!body.items || body.items.length === 0) {
            return NextResponse.json({ error: 'Order must contain items' }, { status: 400 });
        }

        // Calculate prep time
        const itemIds = body.items.map((i: any) => i.menuItem);
        const menuItems = await Menu.find({ _id: { $in: itemIds } });
        let maxPrepTime = 15;
        if (menuItems.length > 0) {
            maxPrepTime = Math.max(...menuItems.map((item: any) => item.prepTime || 15));
        }

        // Create Razorpay order (amount in paise)
        const amountInPaise = Math.round(body.totalAmount * 100);
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                tableNumber: body.tableNumber,
                customerName: body.customerName || 'Guest',
            },
        });

        // Create the order in DB with payment pending
        const order = await Order.create({
            tableNumber: body.tableNumber,
            items: body.items,
            totalAmount: body.totalAmount,
            estimatedPrepTime: maxPrepTime,
            paymentStatus: 'Pending',
            paymentMethod: 'razorpay',
            razorpayOrderId: razorpayOrder.id,
            customerNote: body.notes || '',
            sessionId: body.sessionId || '',
        }) as any;

        return NextResponse.json({
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: amountInPaise,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID,
        }, { status: 201 });

    } catch (error) {
        console.error('Create payment order error:', error);
        return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
    }
}
