import { AIGenerationRequest } from '../types/aiItinerary';

/**
 * Generate unique IDs for AI generation requests
 */
export function generateUniqueId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate trip duration in days
 */
export function calculateTripDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): { isValid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (isNaN(start.getTime())) {
    return { isValid: false, error: 'Invalid start date' };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid end date' };
  }

  if (start >= end) {
    return { isValid: false, error: 'End date must be after start date' };
  }

  if (start < now) {
    return { isValid: false, error: 'Trip cannot start in the past' };
  }

  const duration = calculateTripDuration(startDate, endDate);
  if (duration > 30) {
    return { isValid: false, error: 'Trip duration cannot exceed 30 days' };
  }

  return { isValid: true };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Convert time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[{}]/g, '') // Remove potential JSON injection
    .trim();
}

/**
 * Log AI generation metrics
 */
export function logGenerationMetrics(data: {
  userId: string;
  generationId: string;
  destination: string;
  duration: number;
  processingTime: number;
  success: boolean;
  error?: string;
}): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'AI_GENERATION',
    ...data
  };
}

/**
 * Check if user has premium subscription
 */
export function hasPremiumSubscription(userData: any): boolean {
  if (!userData) return false;
  
  // Check subscription type
  if (userData.subscriptionType !== 'premium') return false;
  
  // Check if cancelled
  if (userData.subscriptionCancelled) return false;
  
  // Check if expired
  if (userData.subscriptionEndDate) {
    const endDate = userData.subscriptionEndDate.toDate ? 
      userData.subscriptionEndDate.toDate() : 
      new Date(userData.subscriptionEndDate);
    
    if (endDate < new Date()) return false;
  }
  
  return true;
}
