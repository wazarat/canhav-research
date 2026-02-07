'use client'

import { Company } from '../lib/companiesData'

interface CompanyDetailModalProps {
  company: Company | null
  isOpen: boolean
  onClose: () => void
}

export default function CompanyDetailModal({ company, isOpen, onClose }: CompanyDetailModalProps) {
  if (!isOpen || !company) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 transform transition-all">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                  {company.sector}
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                  {company.subsector}
                </span>
              </div>
            </div>

            {company.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{company.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {company.yearFounded && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Year Founded</h3>
                  <p className="text-gray-900">{company.yearFounded}</p>
                </div>
              )}
              
              {company.fundingStage && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Stage</h3>
                  <p className="text-gray-900">{company.fundingStage}</p>
                </div>
              )}

              {company.teamSize && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Team Size</h3>
                  <p className="text-gray-900">{company.teamSize}</p>
                </div>
              )}

              {company.headquarters && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Headquarters</h3>
                  <p className="text-gray-900">{company.headquarters}</p>
                </div>
              )}
            </div>

            {company.tags && company.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {company.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {company.website && (
              <div className="pt-4 border-t border-gray-200">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Visit Website
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
