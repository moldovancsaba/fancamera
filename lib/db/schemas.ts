/**
 * Database Schemas and TypeScript Types
 * Version: 1.0.0
 * 
 * Defines the structure of all MongoDB collections and their TypeScript interfaces.
 * All dates stored as ISO 8601 strings with milliseconds in UTC: YYYY-MM-DDTHH:MM:SS.sssZ
 * 
 * Collections:
 * - frames: Pre-designed frame templates managed by admin
 * - submissions: User photo submissions with comprehensive metadata
 * - users_cache: Optional cache of SSO user data for performance
 */

import { ObjectId } from 'mongodb';

/**
 * Collection Names
 * Centralized constant to ensure consistency across the application
 */
export const COLLECTIONS = {
  FRAMES: 'frames',
  SUBMISSIONS: 'submissions',
  USERS_CACHE: 'users_cache',
} as const;

// ============================================================================
// FRAMES COLLECTION
// ============================================================================

/**
 * Frame Type
 * Defines the format/technology used for the frame
 */
export enum FrameType {
  PNG = 'png',           // PNG image overlay
  SVG = 'svg',           // SVG vector graphic
  CANVAS = 'canvas',     // HTML Canvas-based frame
}

/**
 * Frame Status
 * Controls whether frame is available for user selection
 */
export enum FrameStatus {
  ACTIVE = 'active',     // Available for selection
  INACTIVE = 'inactive', // Hidden from users
  DRAFT = 'draft',       // Work in progress
}

/**
 * Frame Document Interface
 * Represents a graphical frame template in the database
 */
export interface Frame {
  _id?: ObjectId;                    // MongoDB document ID
  frameId: string;                   // Unique frame identifier (UUID)
  name: string;                      // Human-readable frame name
  description?: string;              // Optional frame description
  type: FrameType;                   // Frame format (png, svg, canvas)
  fileUrl: string;                   // imgbb.com URL for frame asset
  thumbnailUrl: string;              // imgbb.com URL for frame thumbnail
  width: number;                     // Frame width in pixels
  height: number;                    // Frame height in pixels
  metadata: {
    category?: string;               // Frame category (holidays, sports, corporate, etc.)
    tags?: string[];                 // Searchable tags
    aspectRatio?: string;            // e.g., "16:9", "4:3", "1:1"
    canvasConfig?: Record<string, unknown>; // Canvas-specific configuration if type is 'canvas'
  };
  status: FrameStatus;               // Frame availability status
  isActive: boolean;                 // Quick status check
  createdBy: string;                 // Admin user ID from SSO
  createdAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  updatedAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  usageCount?: number;               // Number of times frame has been used
  lastUsedAt?: string;               // ISO 8601 timestamp of last use
}

// ============================================================================
// SUBMISSIONS COLLECTION
// ============================================================================

/**
 * Device Type
 * Identifies the device used for photo capture/upload
 */
export enum DeviceType {
  MOBILE_IOS = 'mobile_ios',
  MOBILE_ANDROID = 'mobile_android',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

/**
 * Submission Method
 * How the photo was provided by the user
 */
export enum SubmissionMethod {
  CAMERA_CAPTURE = 'camera_capture',  // Live camera capture
  FILE_UPLOAD = 'file_upload',        // File uploaded from device
}

/**
 * Submission Status
 * Lifecycle status of the submission
 */
export enum SubmissionStatus {
  PROCESSING = 'processing',    // Image composition in progress
  COMPLETED = 'completed',      // Successfully processed
  FAILED = 'failed',            // Processing failed
  DELETED = 'deleted',          // Soft deleted by user
}

/**
 * Submission Document Interface
 * Represents a user photo submission with complete metadata
 */
export interface Submission {
  _id?: ObjectId;                    // MongoDB document ID
  submissionId: string;              // Unique submission identifier (UUID)
  userId: string;                    // User ID from SSO
  userEmail: string;                 // User email from SSO
  frameId: string;                   // Reference to frame used
  
  // Image URLs (all hosted on imgbb.com)
  originalImageUrl: string;          // User's original photo
  finalImageUrl: string;             // Composed photo with frame
  
  // Submission details
  method: SubmissionMethod;          // Camera capture or file upload
  status: SubmissionStatus;          // Processing status
  
  // Comprehensive metadata for tracking and analytics
  metadata: {
    // Device information
    deviceType: DeviceType;
    deviceInfo?: string;             // User agent string
    browserInfo?: string;            // Browser name and version
    
    // Location data (if available and user consented)
    ipAddress?: string;              // User's IP address
    country?: string;                // Derived from IP
    city?: string;                   // Derived from IP
    geolocation?: {                  // GPS coordinates if available
      latitude: number;
      longitude: number;
      accuracy: number;
    };
    
    // Image technical details
    originalWidth: number;           // Original photo width
    originalHeight: number;          // Original photo height
    originalFileSize: number;        // Original file size in bytes
    originalMimeType: string;        // e.g., "image/jpeg"
    finalWidth: number;              // Final composed image width
    finalHeight: number;             // Final composed image height
    finalFileSize: number;           // Final file size in bytes
    
    // Processing details
    processingTimeMs?: number;       // Time taken to process (milliseconds)
    compositionEngine?: string;      // "canvas-api" or other
    
    // Email delivery
    emailSent: boolean;              // Whether email was sent
    emailSentAt?: string;            // ISO 8601 timestamp
    emailError?: string;             // Error message if email failed
  };
  
  // Sharing and engagement
  shareCount: number;                // Number of times shared
  downloadCount: number;             // Number of times downloaded
  lastSharedAt?: string;             // ISO 8601 timestamp
  
  // Soft delete support
  isDeleted: boolean;                // Soft delete flag
  deletedAt?: string;                // ISO 8601 timestamp
  
  // Timestamps
  createdAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  updatedAt: string;                 // ISO 8601 timestamp with milliseconds UTC
}

// ============================================================================
// USERS CACHE COLLECTION (Optional)
// ============================================================================

/**
 * User Cache Document Interface
 * Optional cache of SSO user data to reduce API calls to SSO service
 * 
 * Why cache:
 * - Reduces load on SSO service
 * - Improves response time for user profile pages
 * - Provides data availability if SSO service is temporarily unavailable
 * 
 * Cache strategy:
 * - TTL: 24 hours (refresh daily)
 * - Update on user login
 * - Fallback to SSO API if cache miss
 */
export interface UserCache {
  _id?: ObjectId;                    // MongoDB document ID
  userId: string;                    // User ID from SSO (unique index)
  email: string;                     // User email
  name?: string;                     // User display name
  role?: string;                     // User role (e.g., "admin", "user")
  
  // SSO session info
  lastLoginAt?: string;              // ISO 8601 timestamp
  
  // Cache metadata
  cachedAt: string;                  // ISO 8601 timestamp when cached
  lastSyncAt: string;                // ISO 8601 timestamp of last SSO sync
  syncCount: number;                 // Number of times synced
}

// ============================================================================
// HELPER TYPES AND UTILITIES
// ============================================================================

/**
 * Omit MongoDB _id for insert operations
 */
export type NewFrame = Omit<Frame, '_id'>;
export type NewSubmission = Omit<Submission, '_id'>;
export type NewUserCache = Omit<UserCache, '_id'>;

/**
 * Generate ISO 8601 timestamp with milliseconds in UTC
 * Format: YYYY-MM-DDTHH:MM:SS.sssZ
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a simple unique ID (UUID v4 alternative)
 * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random string
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
