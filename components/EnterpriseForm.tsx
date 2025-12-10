'use client'

import { useState } from 'react'
import emailjs from '@emailjs/browser'

interface EnterpriseFormProps {
  type: 'builder' | 'business'
  onClose: () => void
}

interface FormData {
  name: string
  email: string
  organization: string
  primaryInterest: string
  trackSpecific: string | string[]
  scope: string
  timeline: string
  context: string
}

export default function EnterpriseForm({ type, onClose }: EnterpriseFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    organization: '',
    primaryInterest: '',
    trackSpecific: type === 'business' ? [] : '',
    scope: '',
    timeline: '',
    context: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const primaryInterestOptions = [
    'Researching the Ethereum / blockchain ecosystem',
    'Evaluating blockchain for business operations',
    'Supplier, MOQ, or coordination challenges',
    'Reducing reconciliation or payment friction',
    'General discussion'
  ]

  const builderFamiliarityOptions = [
    'New to the ecosystem',
    'Some experience',
    'Actively building / researching'
  ]

  const businessChallengesOptions = [
    'Siloed suppliers or buyers',
    'Unable to meet MOQs',
    'Manual reconciliation across partners',
    'Exploring shared infrastructure models'
  ]

  const scopeOptions = [
    'One business',
    'Multiple businesses',
    'An association / consortium',
    'Personal research'
  ]

  const timelineOptions = [
    'Just exploring',
    'Researching options',
    'Actively evaluating',
    'Looking to pilot soon'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target
    setFormData(prev => ({
      ...prev,
      trackSpecific: checked
        ? [...(prev.trackSpecific as string[]), value]
        : (prev.trackSpecific as string[]).filter(item => item !== value)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Format track-specific data for email
      const trackSpecificText = Array.isArray(formData.trackSpecific) 
        ? formData.trackSpecific.join(', ')
        : formData.trackSpecific

      // Prepare email template parameters
      const templateParams = {
        to_email: 'waz@canhav.com',
        from_name: formData.name,
        from_email: formData.email,
        organization: formData.organization || 'Not provided',
        track_type: type === 'builder' ? 'Research Track (Crypto Native Teams)' : 'Business Efficiency Track (Small Businesses)',
        primary_interest: formData.primaryInterest,
        track_specific: trackSpecificText,
        scope: formData.scope,
        timeline: formData.timeline,
        context: formData.context || 'Not provided',
        submitted_at: new Date().toLocaleString(),
      }

      // Send email using EmailJS
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID',
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY'
      )

      setSubmitStatus('success')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const themeColor = type === 'builder' ? 'blue' : 'purple'
  const bgColor = type === 'builder' ? 'bg-blue-600' : 'bg-purple-600'
  const hoverBgColor = type === 'builder' ? 'hover:bg-blue-700' : 'hover:bg-purple-700'
  const borderColor = type === 'builder' ? 'border-blue-200' : 'border-purple-200'
  const textColor = type === 'builder' ? 'text-blue-800' : 'text-purple-800'
  const focusBorderColor = type === 'builder' ? 'focus:border-blue-500' : 'focus:border-purple-500'
  const focusRingColor = type === 'builder' ? 'focus:ring-blue-200' : 'focus:ring-purple-200'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${textColor}`}>
            {type === 'builder' ? 'Research Track' : 'Business Efficiency Track'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitStatus === 'success' && (
          <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-lg`}>
            <p className="text-green-800">Form submitted successfully! We'll be in touch soon.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Error submitting form. Please try again.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
              placeholder="Your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
              placeholder="your@email.com"
            />
          </div>

          {/* Organization */}
          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
              Organization (optional)
            </label>
            <input
              type="text"
              id="organization"
              name="organization"
              value={formData.organization}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
              placeholder="Company or organization name"
            />
          </div>

          {/* Primary Interest */}
          <div>
            <label htmlFor="primaryInterest" className="block text-sm font-medium text-gray-700 mb-2">
              Why are you reaching out? *
            </label>
            <select
              id="primaryInterest"
              name="primaryInterest"
              value={formData.primaryInterest}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
            >
              <option value="">Select your primary interest</option>
              {primaryInterestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Track-Specific Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'builder' ? 'Your current familiarity with Ethereum:' : 'Which challenges apply? (select all that apply)'}
            </label>
            
            {type === 'builder' ? (
              <select
                name="trackSpecific"
                value={formData.trackSpecific as string}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
              >
                <option value="">Select your familiarity level</option>
                {builderFamiliarityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                {businessChallengesOptions.map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      value={option}
                      checked={(formData.trackSpecific as string[]).includes(option)}
                      onChange={handleCheckboxChange}
                      className={`mr-3 h-4 w-4 ${textColor} ${focusBorderColor} rounded`}
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Scope */}
          <div>
            <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-2">
              Is this for: *
            </label>
            <select
              id="scope"
              name="scope"
              value={formData.scope}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
            >
              <option value="">Select scope</option>
              {scopeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Timeline */}
          <div>
            <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
              Your current stage: *
            </label>
            <select
              id="timeline"
              name="timeline"
              value={formData.timeline}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors`}
            >
              <option value="">Select your current stage</option>
              {timelineOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Context */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
              One-Line Context (Optional)
            </label>
            <textarea
              id="context"
              name="context"
              value={formData.context}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 ${focusBorderColor} focus:ring-2 ${focusRingColor} focus:outline-none transition-colors resize-vertical`}
              placeholder="Anything helpful to know before a conversation? (1-2 sentences)"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-6 py-3 ${bgColor} ${hoverBgColor} text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
