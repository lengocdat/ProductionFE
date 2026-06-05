'use client'

import { apiFetch } from './api'

// --- Types ---

export interface Court {
  id: number
  owner_id: number
  name: string
  description: string
  sport_type: string
  address: string
  latitude: number
  longitude: number
  google_maps_url?: string
  phone_number?: string
  price_per_hour: number
  amenities: string[]
  images: string[]
  operating_hours_start: string
  operating_hours_end: string
  total_courts: number
  is_active: boolean
  rating_avg: number
  rating_count: number
}

export interface TimeSlot {
  time: string
  available: boolean
  court_number: number
}

export interface CourtAvailability {
  court: Court
  date: string
  slots: TimeSlot[]
  total_courts: number
}

export interface CourtBooking {
  id: number
  court_id: number
  booker_id: number
  booking_date: string
  start_time: string
  end_time: string
  court_number: number
  total_price: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  note?: string
  created_at: string
  booker_name: string
  court_name?: string
  court_address?: string
}

// --- B2C API ---

export function getCourts(sport?: string) {
  const params = sport ? `?sport=${sport}` : ''
  return apiFetch<{ courts: Court[] }>(`/courts${params}`)
}

export function getCourtByID(id: number) {
  return apiFetch<{ court: Court }>(`/courts/${id}`)
}

export function getCourtAvailability(courtId: number, date: string) {
  return apiFetch<CourtAvailability>(`/courts/${courtId}/availability?date=${date}`)
}

export function getMyBookings() {
  return apiFetch<{ bookings: CourtBooking[] }>('/courts/bookings/my')
}

export function createBooking(courtId: number, payload: {
  booking_date: string
  start_time: string
  end_time: string
  court_number: number
  note?: string
}) {
  return apiFetch<{ booking: CourtBooking }>(`/courts/${courtId}/bookings`, {
    method: 'POST',
    json: payload,
  })
}

// --- B2B API (Dashboard) ---

export function getOwnerCourts() {
  return apiFetch<{ courts: Court[] }>('/dashboard/courts')
}

export function getCourtSchedule(courtId: number, date: string) {
  return apiFetch<{ bookings: CourtBooking[] }>(`/dashboard/courts/${courtId}/bookings?date=${date}`)
}

export function updateBookingStatus(bookingId: number, status: 'CONFIRMED' | 'CANCELLED') {
  return apiFetch<{ message: string }>(`/dashboard/bookings/${bookingId}/status`, {
    method: 'PATCH',
    json: { status },
  })
}

export function blockTimeSlot(courtId: number, payload: {
  booking_date: string
  start_time: string
  end_time: string
  court_number: number
  reason?: string
}) {
  return apiFetch<{ booking: CourtBooking }>(`/dashboard/courts/${courtId}/block`, {
    method: 'POST',
    json: payload,
  })
}
