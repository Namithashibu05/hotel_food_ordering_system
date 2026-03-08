import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
    menuItem: mongoose.Types.ObjectId;
    quantity: number;
    name: string; // Store name in case menu item is deleted/changed
    price: number; // Store price at time of order
}

export interface IOrder extends Document {
    tableNumber: string;
    items: IOrderItem[];
    totalAmount: number;
    status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
    paymentStatus: 'Pending' | 'Paid';
    customerNote?: string;
    estimatedPrepTime: number; // in minutes
    isDelayedCompensationApplied?: boolean;
    compensationNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
    {
        tableNumber: { type: String, required: true },
        items: [
            {
                menuItem: { type: Schema.Types.ObjectId, ref: 'Menu', required: true },
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true, min: 1 },
            },
        ],
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
            default: 'Pending',
        },
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Paid'],
            default: 'Pending',
        },
        customerNote: { type: String },
        estimatedPrepTime: { type: Number, default: 15 }, // Store total prep time calculated at order creation
        isDelayedCompensationApplied: { type: Boolean, default: false },
        compensationNote: { type: String },
    },
    { timestamps: true }
);

// Refresh model if schema changed (important for Next.js hot reloading when adding fields)
if (mongoose.models.Order) {
    delete mongoose.models.Order;
}
export default mongoose.model<IOrder>('Order', OrderSchema);
