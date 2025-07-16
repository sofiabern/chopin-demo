import { NextResponse } from 'next/server';
import { getAddress } from '@chopinframework/next';

export async function GET() {
  try {
    const address = await getAddress();
    if (address) {
      return NextResponse.json({ address });
    }
    return NextResponse.json({ address: null });
  } catch (error) {
    console.error('Error getting address:', error);
    return NextResponse.json({ address: null }, { status: 500 });
  }
}
