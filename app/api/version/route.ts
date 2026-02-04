import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'No commit message',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
    deployedAt: new Date().toISOString(),
  });
}
