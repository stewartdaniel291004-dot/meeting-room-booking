import axios, { AxiosError } from 'axios'
import type { ErrorDetail, ErrorResponse } from '../types/api'

/** A failed API call, carrying the backend's error code and human-readable message. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ErrorDetail[]

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  // ?equipment=Projector&equipment=Whiteboard, as ASP.NET binds lists
  paramsSerializer: { indexes: null },
})

function isErrorResponse(data: unknown): data is ErrorResponse {
  return typeof data === 'object' && data !== null && 'code' in data && 'message' in data
}

function toApiError(error: AxiosError): ApiError {
  const { response } = error
  if (!response) {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the booking API. Make sure the backend is running (dotnet run in backend/MeetingRoomBooking.Api).',
    )
  }

  if (isErrorResponse(response.data)) {
    return new ApiError(response.status, response.data.code, response.data.message, response.data.details ?? [])
  }

  return new ApiError(response.status, 'UNEXPECTED_ERROR', `The server responded with status ${response.status}.`)
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(toApiError(error)),
)

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message
  }
  return 'Something went wrong.'
}

/** Drops undefined/empty values so they don't become "?floor=" in the query string. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0),
    ),
  ) as Partial<T>
}
