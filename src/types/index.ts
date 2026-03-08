
export interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    subCategory?: string;
    image?: string;
    isAvailable: boolean;
    isVeg: boolean;
    spiceLevel?: 'Nil' | 'Mild' | 'Medium' | 'Hot';
    prepTime?: number; // Estimated preparation time in minutes
}
