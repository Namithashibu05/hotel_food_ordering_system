import mongoose, { Schema, Document } from 'mongoose';

export interface IRating extends Document {
    rating: number;
    comment?: string;
    customerName?: string;
    tableNumber?: string;
    sessionId?: string;
    createdAt: Date;
}

const RatingSchema: Schema = new Schema(
    {
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String },
        customerName: { type: String },
        tableNumber: { type: String },
        sessionId: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Rating || mongoose.model<IRating>('Rating', RatingSchema);
