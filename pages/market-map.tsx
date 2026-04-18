import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import MarketMap from '../components/MarketMap'

export default function MarketMapPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Market Map', href: '/market-map' },
    { name: 'Research', href: 'https://research.canhav.com', external: true },
    { name: 'Enterprise Users', href: '/enterprise-users' },
    { name: 'About Us', href: '/about-us' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>The Ethereum Infrastructure Atlas - CanHav Research</title>
        <meta name="description" content="A curated, research-driven map of Ethereum's infrastructure, protocols, and applications" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
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
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-200 relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-200 group-hover:w-full"></span>
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
                    className="block py-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
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

      <main>
        <MarketMap />
      </main>

      {/* Research cross-link band — the market map is the entry point,
          but the research is where most of the depth lives. We surface
          a prominent link at the foot of the map so scroll-to-bottom
          visitors have an obvious next step. */}
      <section className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-y border-blue-100 mt-12">
        <div className="container mx-auto px-6 py-10 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Want the deeper read?
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-xl">
                The Market Map tells you <em>where</em> the ecosystem is.
                Our research tells you <em>why</em> it&apos;s heading there.
                Monthly sector deep-dives, frameworks, and primers.
              </p>
            </div>
            <a
              href="https://research.canhav.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm hover:shadow flex-shrink-0"
            >
              Visit research.canhav.com
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-600">
            <p className="text-sm">&copy; 2024–2026 CanHav Research. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/market-map" className="hover:text-blue-600">Market Map</Link>
              <a href="https://research.canhav.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Research</a>
              <Link href="/about-us" className="hover:text-blue-600">About</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
