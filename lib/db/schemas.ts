/**
 * Database Schemas and TypeScript Types
 * Version: 1.1.0
 * 
 * Defines the structure of all MongoDB collections and their TypeScript interfaces.
 * All dates stored as ISO 8601 strings with milliseconds in UTC: YYYY-MM-DDTHH:MM:SS.sssZ
 * 
 * Collections:
 * - partners: Organizations/brands that host events
 * - events: Events within partners that use frames
 * - frames: Pre-designed frame templates with three-tier ownership (global/partner/event)
 * - submissions: User photo submissions with comprehensive metadata
 * - users_cache: Optional cache of SSO user data for performance
 * 
 * Frame Visibility Hierarchy:
 * - Global frames: Available to all partners/events, can be deactivated per partner/event
 * - Partner frames: Available only to specific partner's events, can be deactivated per event
 * - Event frames: Available only to specific event
 */

import { ObjectId } from 'mongodb';

/**
 * Collection Names
 * Centralized constant to ensure consistency across the application
 */
export const COLLECTIONS = {
  PARTNERS: 'partners',
  EVENTS: 'events',
  FRAMES: 'frames',
  SUBMISSIONS: 'submissions',
  USERS_CACHE: 'users_cache',
} as const;

// ============================================================================
// PARTNERS COLLECTION
// ============================================================================

/**
 * Partner Document Interface
 * Represents an organization or brand that hosts events
 * 
 * Why partners:
 * - Organizations need to manage their own events and frames
 * - Enables white-label frame collections per partner
 * - Future: partner data will sync via external API
 * 
 * Example: AC Milan, Red Bull, Nike
 */
export interface Partner {
  _id?: ObjectId;                    // MongoDB document ID
  partnerId: string;                 // Unique partner identifier (UUID)
  name: string;                      // Partner name (e.g., "AC Milan")
  description?: string;              // Optional partner description
  isActive: boolean;                 // Whether partner is currently active
  
  // Contact and metadata
  contactEmail?: string;             // Partner contact email
  contactName?: string;              // Partner contact person
  logoUrl?: string;                  // Partner logo URL (imgbb.com)
  
  // Statistics
  eventCount?: number;               // Cached count of partner's events
  frameCount?: number;               // Cached count of partner-specific frames
  
  // Admin tracking
  createdBy: string;                 // Admin user ID from SSO who created this partner
  createdAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  updatedAt: string;                 // ISO 8601 timestamp with milliseconds UTC
}

// ============================================================================
// EVENTS COLLECTION
// ============================================================================

/**
 * Event Document Interface
 * Represents a specific event within a partner that uses frames
 * 
 * Why events:
 * - Events need their own frame collections
 * - Enables per-event customization and activation control
 * - Supports event-specific QR codes and sharing
 * 
 * Example: "Serie A - AC Milan x AS Roma", "Red Bull Racing - Monaco GP 2025"
 */
export interface Event {
  _id?: ObjectId;                    // MongoDB document ID
  eventId: string;                   // Unique event identifier (UUID)
  name: string;                      // Event name (e.g., "Serie A - AC Milan x AS Roma")
  description?: string;              // Optional event description
  
  // Partner relationship
  partnerId: string;                 // Reference to parent partner
  partnerName: string;               // Cached partner name for display and filtering
  
  // Event details
  eventDate?: string;                // Optional event date (ISO 8601 timestamp)
  location?: string;                 // Optional event location
  isActive: boolean;                 // Whether event is currently active
  
  // Frame assignments
  // This array tracks which frames are assigned to this event and their activation status
  // Global and partner frames can be overridden here at event level
  frames: Array<{
    frameId: string;                 // Reference to frame
    isActive: boolean;               // Frame active status at event level (overrides global/partner)
    addedAt: string;                 // ISO 8601 timestamp when frame was added to event
    addedBy?: string;                // Admin user ID who added this frame
  }>;
  
  // Statistics
  submissionCount?: number;          // Cached count of submissions for this event
  
  // Admin tracking
  createdBy: string;                 // Admin user ID from SSO who created this event
  createdAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  updatedAt: string;                 // ISO 8601 timestamp with milliseconds UTC
}

// ============================================================================
// FRAMES COLLECTION
// ============================================================================

/**
 * Frame Ownership Level
 * Determines the scope and visibility of a frame
 * 
 * Why three levels:
 * - Global: Platform-wide frames available to everyone
 * - Partner: Branded frames specific to an organization
 * - Event: Custom frames for a specific event
 * 
 * Visibility cascade:
 * 1. Global frames visible to all, can be deactivated per partner/event
 * 2. Partner frames visible only to that partner's events, can be deactivated per event
 * 3. Event frames visible only to that specific event
 */
export enum FrameOwnershipLevel {
  GLOBAL = 'global',       // Available to all partners and events
  PARTNER = 'partner',     // Available only to specific partner's events
  EVENT = 'event',         // Available only to specific event
}

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
 * 
 * Frame Visibility Rules:
 * 1. Global frames (ownershipLevel: 'global'):
 *    - No partnerId/eventId
 *    - Visible to all by default
 *    - Can be deactivated per partner via partnerActivation map
 *    - Can be deactivated per event via event.frames[].isActive
 * 
 * 2. Partner frames (ownershipLevel: 'partner'):
 *    - Has partnerId, no eventId
 *    - Visible only to that partner's events
 *    - Can be deactivated per event via event.frames[].isActive
 * 
 * 3. Event frames (ownershipLevel: 'event'):
 *    - Has both partnerId and eventId
 *    - Visible only to that specific event
 *    - Controlled by frame.isActive
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
  
  // Hashtags replace the old single category field
  // Multiple hashtags enable better filtering and searchability
  hashtags: string[];                // Searchable hashtags (e.g., ['sports', 'football', 'milan'])
  
  // Ownership and hierarchy
  ownershipLevel: FrameOwnershipLevel; // Global, partner-specific, or event-specific
  partnerId: string | null;          // Partner ID if ownershipLevel is 'partner' or 'event', null for global
  partnerName: string | null;        // Cached partner name for display (null for global frames)
  eventId: string | null;            // Event ID if ownershipLevel is 'event', null otherwise
  eventName: string | null;          // Cached event name for display (null for global/partner frames)
  
  // Partner-level activation overrides for global frames
  // Only applicable when ownershipLevel is 'global'
  // Maps partnerId to activation status
  // If partner is not in map, frame is active for that partner by default
  // If partner is in map with isActive: false, frame is hidden from that partner
  partnerActivation: {
    [partnerId: string]: {
      isActive: boolean;             // Whether frame is active for this partner
      updatedAt: string;             // ISO 8601 timestamp of last activation change
      updatedBy?: string;            // Admin user ID who changed activation
    };
  };
  
  // Metadata
  metadata: {
    tags?: string[];                 // Additional tags for internal organization (deprecated, use hashtags)
    aspectRatio?: string;            // e.g., "16:9", "4:3", "1:1"
    canvasConfig?: Record<string, unknown>; // Canvas-specific configuration if type is 'canvas'
  };
  
  status: FrameStatus;               // Frame availability status (active/inactive/draft)
  isActive: boolean;                 // Global active status (master switch)
  
  // Admin tracking
  createdBy: string;                 // Admin user ID from SSO
  createdAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  updatedAt: string;                 // ISO 8601 timestamp with milliseconds UTC
  
  // Usage statistics
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
  
  // Partner/Event context for gallery organization
  partnerId: string | null;          // Partner ID if submission is from event capture, null for general
  partnerName: string | null;        // Cached partner name for display
  eventId: string | null;            // Event ID if submission is from event capture, null for general
  eventName: string | null;          // Cached event name for display
  
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
export type NewPartner = Omit<Partner, '_id'>;
export type NewEvent = Omit<Event, '_id'>;
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
