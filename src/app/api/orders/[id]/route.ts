
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

        // NEW: Set preparation start time when status changes to Preparing
        if (body.status === 'Preparing' && !currentOrder.preparationStartedAt) {
            updateData.preparationStartedAt = new Date();
        }

        // 2. Check for delay compensation
        const isMarkingReadyOrDelivered = ['Ready', 'Delivered'].includes(body.status);
        if (isMarkingReadyOrDelivered && !currentOrder.isDelayedCompensationApplied) {
            const now = new Date().getTime();
            // Use preparationStartedAt if available for more accurate delay tracking, otherwise createdAt
            const timerBasis = currentOrder.preparationStartedAt || currentOrder.createdAt;
            const startBasis = new Date(timerBasis).getTime();
            const prepTimeMinutes = currentOrder.estimatedPrepTime || 15;
            const expectedReadyTime = startBasis + (prepTimeMinutes * 60000);

            if (now > expectedReadyTime) {
                // Order is delayed! Add Walnut Brownie as compensation
                console.log('AUTO-ADDING COMPENSATION FOR ORDER:', id);
                
                const compensationItem = {
                    menuItem: '65f1c7e9a2b5e00123456789', // Walnut Brownie ID
                    name: 'Walnut Brownie (Delay Compensation)',
                    quantity: 1,
                    price: 0 // Free
                };

                updateData.items = [...currentOrder.items, compensationItem];
                updateData.isDelayedCompensationApplied = true;
                updateData.compensationNote = 'Your order was delayed. Please enjoy a complimentary Walnut Brownie on us!';
                
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
