import { NextResponse } from 'next/server';

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    version: process.env.APP_VERSION || 'unknown',
    deployedAt: new Date().toISOString(),
  });
}
