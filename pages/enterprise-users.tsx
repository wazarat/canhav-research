import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import EnterpriseForm from '../components/EnterpriseForm'

export default function EnterpriseUsersPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'builder' | 'business' | null>(null)

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Market Map', href: '/market-map' },
    { name: 'Research', href: 'https://research.canhav.com', external: true },
    { name: 'Enterprise Users', href: '/enterprise-users' },
    { name: 'About Us', href: '/about-us' },
  ]

  const handleFormOpen = (type: 'builder' | 'business') => {
    setFormType(type)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setFormType(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Enterprise Users - CanHav Research</title>
        <meta name="description" content="Choose the path that fits your business - research-driven insights for builders or business efficiency solutions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              CanHav Research
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) => (
                item.external ? (
                  <a 
                    key={item.name} 
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
                  </a>
                ) : (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`transition-colors duration-200 relative group ${
                      item.name === 'Enterprise Users' 
                        ? 'text-blue-600 font-medium' 
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    {item.name}
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-blue-600 transition-all duration-200 ${
                      item.name === 'Enterprise Users' ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}></span>
                  </Link>
                )
              ))}
              
              {/* Contact Us Button */}
              <Link href="/contact">
                <button className="ml-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all duration-200 shadow-lg hover:shadow-xl">
                  Contact Us
                </button>
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-600 mt-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-gray-600 mt-1 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              {navItems.map((item) => (
                item.external ? (
                  <a 
                    key={item.name} 
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`block py-2 transition-colors duration-200 ${
                      item.name === 'Enterprise Users' 
                        ? 'text-blue-600 font-medium' 
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}
              <Link href="/contact">
                <button 
                  className="mt-4 w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact Us
                </button>
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Choose the Path That Fits Your Business
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Whether you're building in blockchain or simply looking to run your company more efficiently, 
            CanHav guides you with research-grade insights and practical, business-first solutions.
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Card 1: Builders */}
          <div 
            onClick={() => handleFormOpen('builder')}
            className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-2xl hover:scale-105 transition-all duration-500 group flex flex-col cursor-pointer relative overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
            
            <div className="relative z-10">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  For Builders, Analysts, and Crypto-Native Teams
                </h2>
                <h3 className="text-lg font-semibold text-blue-600 mb-3 group-hover:text-blue-700 transition-colors">
                  Build Smarter in Ethereum's Ecosystem
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm mb-4">
                  Research-driven insights, market maps, and sector deep-dives—designed as the crypto builder's 
                  shortcut to understanding infrastructure, DeFi, Layer 2s, derivatives, and enterprise tooling 
                  without spending years navigating fragmentation.
                </p>
              </div>

              <div className="mb-6 flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Curated Ethereum market maps</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Research-grade analysis for founders and operators</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Tools for rapid ecosystem understanding</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">A foundation for product strategy, market entry, and competitive analysis</span>
                  </li>
                </ul>
              </div>

              <div className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 group-hover:shadow-lg mt-auto text-center relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center">
                  Explore Research Portal
                  <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Business */}
          <div 
            onClick={() => handleFormOpen('business')}
            className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-2xl hover:scale-105 transition-all duration-500 group flex flex-col cursor-pointer relative overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
            
            <div className="relative z-10">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  For Small Business Owners and Associations
                </h2>
                <h3 className="text-lg font-semibold text-purple-600 mb-3 group-hover:text-purple-700 transition-colors">
                  Run Your Business Like a Bigger Company Without the Big Company Budget
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm mb-4">
                  A blockchain-enabled coordination model for small businesses operating in silos—helping you 
                  tackle supplier fragmentation, MOQ challenges, and manual reconciliation through shared digital infrastructure.
                </p>
              </div>

              <div className="mb-6 flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Solve MOQ and supplier-access challenges</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Reduce reconciliation overhead</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Enable multi-company coordination without merging systems</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">Understand how blockchain can improve your business without becoming "a crypto company"</span>
                  </li>
                </ul>
              </div>

              <div className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-300 group-hover:shadow-lg mt-auto text-center relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center">
                  Explore Business Solutions
                  <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 CanHav Research. All rights reserved.</p>
            <p className="mt-2 text-sm">Making understanding and building with ethereum easier</p>
          </div>
        </div>
      </footer>

      {/* Enterprise Form Modal */}
      {showForm && formType && (
        <EnterpriseForm
          type={formType}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
