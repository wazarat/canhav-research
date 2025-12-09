'use client'

import { useState, useEffect } from 'react'
import { getSubsectorsBySector } from '../lib/marketMapData'

interface SubmitCompanyFormProps {
  sectors: string[]
  onClose: () => void
}

interface FormData {
  yourEmail: string
  companyName: string
  website: string
  description: string
  sector: string
  subsector: string
  pointOfContact: string
}

export default function SubmitCompanyForm({ sectors, onClose }: SubmitCompanyFormProps) {
  const [formData, setFormData] = useState<FormData>({
    yourEmail: '',
    companyName: '',
    website: '',
    description: '',
    sector: '',
    subsector: '',
    pointOfContact: ''
  })
  
  const [availableSubsectors, setAvailableSubsectors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Update subsectors when sector changes
  useEffect(() => {
    if (formData.sector) {
      const subsectors = getSubsectorsBySector(formData.sector)
      setAvailableSubsectors(subsectors)
      setFormData(prev => ({ ...prev, subsector: '' }))
    }
  }, [formData.sector])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/submit-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        // Reset form
        setFormData({
          yourEmail: '',
          companyName: '',
          website: '',
          description: '',
          sector: '',
          subsector: '',
          pointOfContact: ''
        })
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">Submit a Company</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg">
            <p className="text-green-300">Company submitted successfully! Thank you for your contribution.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">Error submitting company. Please try again.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Your Email */}
          <div>
            <label htmlFor="yourEmail" className="block text-sm font-medium text-gray-300 mb-2">
              Your Email *
            </label>
            <input
              type="email"
              id="yourEmail"
              name="yourEmail"
              value={formData.yourEmail}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="your@email.com"
            />
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="Company Name"
            />
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
              Website *
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="https://company.com"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors resize-vertical"
              placeholder="Brief description of the company and what they do..."
            />
          </div>

          {/* Sector */}
          <div>
            <label htmlFor="sector" className="block text-sm font-medium text-gray-300 mb-2">
              Sector *
            </label>
            <select
              id="sector"
              name="sector"
              value={formData.sector}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors"
            >
              <option value="">Select a sector</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* Subsector */}
          <div>
            <label htmlFor="subsector" className="block text-sm font-medium text-gray-300 mb-2">
              Subsector *
            </label>
            <select
              id="subsector"
              name="subsector"
              value={formData.subsector}
              onChange={handleInputChange}
              required
              disabled={!formData.sector}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-400 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a subsector</option>
              {availableSubsectors.map((subsector) => (
                <option key={subsector} value={subsector}>
                  {subsector}
                </option>
              ))}
              <option value="Other">Other (please specify in description)</option>
            </select>
          </div>

          {/* Point of Contact */}
          <div>
            <label htmlFor="pointOfContact" className="block text-sm font-medium text-gray-300 mb-2">
              Point of Contact *
            </label>
            <input
              type="text"
              id="pointOfContact"
              name="pointOfContact"
              value={formData.pointOfContact}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="Name and role (e.g., John Doe, CEO)"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
