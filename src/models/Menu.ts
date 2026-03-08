import mongoose, { Schema, Document } from 'mongoose';

export interface IMenu extends Document {
    name: string;
    description: string;
    price: number;
    category: string;
    subCategory?: string;
    image?: string;
    isAvailable: boolean;
    isVeg: boolean;
    spiceLevel?: 'Nil' | 'Mild' | 'Medium' | 'Hot';
    prepTime: number; // in minutes
    createdAt: Date;
    updatedAt: Date;
}

const MenuSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        category: { type: String, required: true }, // e.g., 'Starters', 'Main Course', 'Desserts'
        subCategory: { type: String }, // e.g., 'Soup', 'Curry', 'Rice'
        image: { type: String }, // URL to image
        isAvailable: { type: Boolean, default: true },
        isVeg: { type: Boolean, default: true },
        spiceLevel: { type: String, enum: ['Nil', 'Mild', 'Medium', 'Hot'], default: 'Nil' },
        prepTime: { type: Number, default: 15 }, // Default prep time: 15 mins
    },
    { timestamps: true }
);

// Refresh model if schema changed (important for Next.js hot reloading when adding fields)
if (mongoose.models.Menu) {
    delete mongoose.models.Menu;
}
export default mongoose.model<IMenu>('Menu', MenuSchema);
