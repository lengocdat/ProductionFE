'use client'

// A tiny client-side "cart" of module ids the learner is assembling into a
// deck, persisted in localStorage so it survives navigating between a
// module's detail page and the deck builder. Cleared once the deck is saved.
const DRAFT_KEY = 'presentation_draft_deck'

export function getDraftModuleIds(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return []
    const ids = JSON.parse(raw)
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'number') : []
  } catch {
    return []
  }
}

function setDraftModuleIds(ids: number[]) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(ids))
}

export function addToDraft(moduleId: number): number[] {
  const ids = getDraftModuleIds()
  if (!ids.includes(moduleId)) ids.push(moduleId)
  setDraftModuleIds(ids)
  return ids
}

export function removeFromDraft(moduleId: number): number[] {
  const ids = getDraftModuleIds().filter((id) => id !== moduleId)
  setDraftModuleIds(ids)
  return ids
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}
