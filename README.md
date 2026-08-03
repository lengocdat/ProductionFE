# Chunk English — Frontend

Next.js (app router) frontend for **Chunk English**, live at
[coduyen.net](https://coduyen.net). Backend lives in the sibling `CoDuyen/` repo.

Package name (`chunkenglish-fe`) reflects the product; the repo/directory name
`CoDuyenFE` is left over from the pre-pivot sports-matchmaking app this codebase
was built on top of.

## Stack

Next.js 14 (standalone output), Tailwind, lucide, sonner, PWA install prompt +
Web Push for daily study reminders.

## Local development

```bash
# create .env.local with at least:
#   NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
npm install
npm run dev
```

## Key paths

- Screens: `src/app/(app)/{home,lesson,review,me}`
- Lesson sub-flow: `src/app/(app)/lesson/[slug]/{chunks,dialogue,speak}`
- API client: `src/lib/api.ts`
