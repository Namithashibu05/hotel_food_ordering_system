import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json().catch(() => ({}));
        const { orderId, sessionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

        if ((!orderId && !sessionId) || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
        }

        // Verify HMAC-SHA256 signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            if (orderId) {
                await Order.findByIdAndUpdate(orderId, { paymentStatus: 'Failed' });
            } else if (sessionId) {
                await Order.updateMany({ sessionId, razorpayOrderId }, { paymentStatus: 'Failed' });
            }
            return NextResponse.json({ error: 'Payment verification failed. Invalid signature.' }, { status: 400 });
        }

        // Mark as paid
        if (orderId) {
            await Order.findByIdAndUpdate(
                orderId,
                {
                    paymentStatus: 'Paid',
                    razorpayPaymentId,
                    razorpaySignature,
                    status: 'Confirmed',
                }
            );
        } else if (sessionId) {
            await Order.updateMany(
                { sessionId, razorpayOrderId },
                {
                    paymentStatus: 'Paid',
                    razorpayPaymentId,
                    razorpaySignature,
                    // Note: We don't automatically confirm if they were already preparing/ready
                }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Payment verified and status updated'
        });

    } catch (error: any) {
        console.error('Payment verify error:', error);
        return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 500 });
    }
}
