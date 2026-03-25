import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';


export async function POST(req: Request) {
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    await dbConnect();
    try {
        const body = await req.json();
        const { sessionId, tableNumber } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Fetch all active, unpaid orders for this session
        const orders = await Order.find({
            sessionId,
            paymentStatus: { $ne: 'Paid' },
            status: { $ne: 'Cancelled' }
        });

        if (orders.length === 0) {
            return NextResponse.json({ error: 'No unpaid orders found for this session' }, { status: 404 });
        }

        // Calculate total amount (including tax and service charge logic if needed)
        // For simplicity, we calculate the grand total here consistent with front-end
        const subtotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const tax = subtotal * 0.05;
        const serviceCharge = subtotal * 0.02;
        const grandTotal = subtotal + tax + serviceCharge;

        // Create Razorpay order (amount in paise)
        const amountInPaise = Math.round(grandTotal * 100);
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `session_${sessionId}`,
            notes: {
                sessionId,
                tableNumber,
                orderType: 'session_payment'
            },
        });

        // Store the razorpayOrderId on all involved orders so verify knows what to update
        await Order.updateMany(
            { sessionId, paymentStatus: { $ne: 'Paid' } },
            { razorpayOrderId: razorpayOrder.id }
        );

        return NextResponse.json({
            razorpayOrderId: razorpayOrder.id,
            amount: amountInPaise,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID,
        }, { status: 201 });

    } catch (error) {
        console.error('Create session payment order error:', error);
        return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
    }
}
