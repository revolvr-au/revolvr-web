// app/api/age-verification/route.ts
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { shouldApplyAuAgeGate } from '@/lib/ageGate';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { dateOfBirth, confirmOver16 } = body;

  // basic validation
  if (!dateOfBirth || !confirmOver16) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const dob = new Date(dateOfBirth);
  const today = new Date();
  if (Number.isNaN(dob.getTime()) || dob > today) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  // get profile
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, country')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
  }

  const ipCountry = headers().get('x-vercel-ip-country') || null;

  const applyGate = shouldApplyAuAgeGate({
    country: profile.country,
    ipCountry,
  });

  if (!applyGate) {
    // non-AU: do nothing special, just "succeed"
    return NextResponse.json({ status: 'SKIPPED' });
  }

  // calculate age
  const minAge = Number(process.env.AU_MINIMUM_AGE || 16);
  const age = calculateAge(dob, today);

  if (age < minAge) {
    await supabaseAdmin
      .from('profiles')
      .update({
        date_of_birth: dateOfBirth,
        age_verification_method: 'self_declared',
        age_verification_level: 1,
        age_verified_at: new Date().toISOString(),
        is_age_verified: false,
        underage_locked: true,
      })
      .eq('id', user.id);

    return NextResponse.json({ status: 'UNDERAGE_LOCKED' });
  } else {
    await supabaseAdmin
      .from('profiles')
      .update({
        date_of_birth: dateOfBirth,
        age_verification_method: 'self_declared',
        age_verification_level: 1,
        age_verified_at: new Date().toISOString(),
        is_age_verified: true,
        underage_locked: false,
      })
      .eq('id', user.id);

    return NextResponse.json({ status: 'VERIFIED' });
  }
}

// helper – you can move this into lib if you like
function calculateAge(dob: Date, today: Date) {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
