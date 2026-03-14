import { NextResponse } from 'next/server';

const CURRENT_APP_VERSION = '1.0.0';
const MIN_REQUIRED_VERSION = '1.0.0';

// GET /api/app/version
// Returns the current expected app version for auto-update check
export async function GET() {
  return NextResponse.json({
    version: CURRENT_APP_VERSION,
    minRequired: MIN_REQUIRED_VERSION,
    updateRequired: false,
  });
}
