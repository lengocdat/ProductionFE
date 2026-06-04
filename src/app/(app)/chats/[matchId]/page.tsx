'use client'

import { useParams, redirect } from 'next/navigation'

// Redirect old chat URLs to the new match detail page with chat tab
export default function OldChatRedirect() {
  const params = useParams()
  redirect(`/matches/${params.matchId}?tab=chat`)
}
