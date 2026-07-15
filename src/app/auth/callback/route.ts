import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'magiclink' | 'email' | 'recovery' | null;
  const next = searchParams.get('next') ?? '/';

  const supabase = await createClient();

  // PKCE flow: authorization code exchange (email/password signup confirmation)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectTo(origin, next, request);
    }
  }

  // Magic link / OTP flow: token_hash + type exchange
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return redirectTo(origin, next, request);
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

function redirectTo(origin: string, next: string, request: Request): NextResponse {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  }
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}