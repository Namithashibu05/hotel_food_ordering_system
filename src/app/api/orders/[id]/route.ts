
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    try {
        const { id } = await params;
        const body = await request.json();

        // 1. Fetch current order to check for delay if status is changing to Ready/Delivered
        const currentOrder = await Order.findById(id);
        if (!currentOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        let updateData = { ...body };

        // 2. Check for delay compensation
        const isMarkingReadyOrDelivered = ['Ready', 'Delivered'].includes(body.status);
        if (isMarkingReadyOrDelivered && !currentOrder.isDelayedCompensationApplied) {
            const now = new Date().getTime();
            const createdAt = new Date(currentOrder.createdAt).getTime();
            const prepTimeMinutes = currentOrder.estimatedPrepTime || 15;
            const expectedReadyTime = createdAt + (prepTimeMinutes * 60000);

            if (now > expectedReadyTime) {
                // Order is delayed! Add Chicken Soup as compensation
                console.log('AUTO-ADDING COMPENSATION FOR ORDER:', id);
                
                const compensationItem = {
                    menuItem: '699ebebb301289289e11af80', // Chicken Soup ID
                    name: 'Chicken Soup (Delay Compensation)',
                    quantity: 1,
                    price: 0 // Free
                };

                updateData.items = [...currentOrder.items, compensationItem];
                updateData.isDelayedCompensationApplied = true;
                updateData.compensationNote = 'Your order was delayed. Please enjoy a complimentary Chicken Soup on us!';
                
                // If updating status, ensure we don't overwrite if not in body
                if (!updateData.status) updateData.status = body.status;
            }
        }

        const order = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        return NextResponse.json(order);
    } catch (error) {
        console.error('Update order error:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
