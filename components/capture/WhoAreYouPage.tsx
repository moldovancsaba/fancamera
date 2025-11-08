/**
 * Who Are You Page Component
 * Version: 2.0.0
 * 
 * Collects user information (name and email) before photo capture
 * Part of the custom event page flow system
 * 
 * Why this component:
 * - GDPR-compliant data collection with user consent
 * - Validates required fields before allowing progression
 * - Stores data in submission for audit trail
 */

'use client';

import { useState } from 'react';

export interface WhoAreYouPageConfig {
  title: string;
  description: string;
  nameLabel: string;
  emailLabel: string;
  buttonText: string;
  namePlaceholder?: string;
  emailPlaceholder?: string;
}

export interface WhoAreYouPageData {
  name: string;
  email: string;
}

export interface WhoAreYouPageProps {
  config: WhoAreYouPageConfig;
  onNext: (data: WhoAreYouPageData) => void;
  onBack?: () => void;
  logoUrl?: string | null;
  brandColor?: string;
  brandBorderColor?: string;
}

/**
 * WhoAreYouPage Component
 * 
 * Renders a form to collect user name and email
 * Both fields are required to proceed
 */
export default function WhoAreYouPage({ config, onNext, onBack, logoUrl, brandColor = '#3B82F6', brandBorderColor = '#3B82F6' }: WhoAreYouPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  /**
   * Validate form fields
   * Returns true if valid, false otherwise and sets error messages
   */
  const validate = (): boolean => {
    const newErrors: { name?: string; email?: string } = {};

    // Validate name (required, min 2 characters)
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Validate email (required, basic format check)
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Validates and calls onNext with collected data
   */
  const handleNext = () => {
    if (validate()) {
      onNext({
        name: name.trim(),
        email: email.trim(),
      });
    }
  };

  /**
   * Handle Enter key press in form fields
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
          {/* Logo */}
          {logoUrl && (
            <div className="flex justify-center mb-6">
              <img
                src={logoUrl}
                alt="Event logo"
                className="max-w-xs max-h-32 object-contain"
              />
            </div>
          )}
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
            {config.title}
          </h1>

          {/* Description */}
          {config.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              {config.description}
            </p>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
              >
                {config.nameLabel}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Clear error when user starts typing
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined });
                  }
                }}
                onKeyPress={handleKeyPress}
                style={{
                  ...(!errors.name && { borderColor: brandBorderColor }),
                }}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent transition-colors ${
                  errors.name 
                    ? 'border-red-500 focus:ring-red-500' 
                    : ''
                }`}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${brandColor}40`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
                placeholder={config.namePlaceholder || 'Enter your name'}
                aria-label={config.nameLabel}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
              >
                {config.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear error when user starts typing
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                onKeyPress={handleKeyPress}
                style={{
                  ...(!errors.email && { borderColor: brandBorderColor }),
                }}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent transition-colors ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : ''
                }`}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${brandColor}40`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
                placeholder={config.emailPlaceholder || 'your.email@example.com'}
                aria-label={config.emailLabel}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Go back to previous page"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                style={{ backgroundColor: brandColor }}
                className={`px-6 py-3 text-white rounded-lg font-semibold transition-all hover:opacity-90 ${
                  onBack ? 'flex-1' : 'w-full'
                }`}
                aria-label={config.buttonText}
              >
                {config.buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
