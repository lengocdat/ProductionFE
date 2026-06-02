'use client'

import Link from 'next/link'

interface Props {
  username?: string
}

export default function TopHeader({ username }: Props) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-4 py-3">
      <Link href="/feed" className="flex items-center gap-2">
        <span className="text-xl">🏸</span>
        <h1 className="text-lg font-bold text-gray-900">SportMatch</h1>
      </Link>
      {username && (
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 hover:bg-green-200 transition-colors"
          aria-label="Profile"
        >
          {username.charAt(0).toUpperCase()}
        </Link>
      )}
    </header>
  )
}
