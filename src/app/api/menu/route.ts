export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Menu from '@/models/Menu';

// GET - Fetch all menu items
export async function GET() {
    await dbConnect();
    try {
        const items = await Menu.find({}).sort({ category: 1, name: 1 });
        return NextResponse.json(items);
    } catch (error) {
        console.error('Fetch menu error:', error);
        return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
    }
}

// POST - Create a new menu item
export async function POST(request: NextRequest) {
    await dbConnect();
    try {
        const body = await request.json();

        if (!body.image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const newItem = await Menu.create(body);
        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error('Create menu item error:', error);
        return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
    }
}

// PUT - Update a menu item
export async function PUT(request: NextRequest) {
    await dbConnect();
    try {
        const body = await request.json();
        console.log('UPDATING MENU ITEM:', body);
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        if (!updateData.image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const updatedItem = await Menu.findByIdAndUpdate(_id, updateData, { new: true });

        if (!updatedItem) {
            return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
        }

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Update menu item error:', error);
        return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
    }
}

// DELETE - Delete a menu item
export async function DELETE(request: NextRequest) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        const deletedItem = await Menu.findByIdAndDelete(id);

        if (!deletedItem) {
            return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
    }
}
