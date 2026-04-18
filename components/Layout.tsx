import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Market Map is rendered separately as a pill (see below) so it stands
  // out from the rest of the nav items. The remaining items are plain
  // text links.
  const navItems = [
    { name: 'Research', href: 'https://research.canhav.com', external: true },
    { name: 'Enterprise Users', href: '/enterprise-users' },
    { name: 'About Us', href: '/about-us' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900 text-white">
      <Head>
        <title>CanHav Research - Making Ethereum Easier</title>
        <meta name="description" content="Making understanding and building with ethereum easier for founders, operators, and researchers" />
        
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
        
        {/* JotForm Scripts */}
        <script type="text/javascript" src="https://cdn.jotfor.ms/static/prototype.forms.js?3.3.45397"></script>
        <script type="text/javascript" src="https://cdn.jotfor.ms/static/jotform.forms.js?3.3.45397"></script>
      </Head>

      <header className="relative border-b border-gray-800/50 glass">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold gradient-text hover:scale-105 transition-transform duration-200">
              CanHav Research
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              {/* Market Map pill — visually promoted since it's the primary
                  product entry point. */}
              <Link
                href="/market-map"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 hover:text-white hover:bg-blue-500/20 text-sm font-medium transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Market Map
              </Link>
              {navItems.map((item) => (
                item.external ? (
                  <a 
                    key={item.name} 
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-200 group-hover:w-full"></span>
                  </a>
                ) : (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-200 group-hover:w-full"></span>
                  </Link>
                )
              ))}
              
              {/* Contact Us Button */}
              <Link href="/contact">
                <button className="ml-6 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
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
                <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-white mt-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-white mt-1 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
              </div>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-gray-800/50 pt-4">
              <Link
                href="/market-map"
                className="block py-2 text-blue-300 hover:text-blue-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                · Market Map
              </Link>
              {navItems.map((item) => (
                item.external ? (
                  <a 
                    key={item.name} 
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className="block py-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}
              <Link href="/contact">
                <button 
                  className="mt-4 w-full px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact Us
                </button>
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="relative">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 glass mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-400">
            <p className="text-sm">&copy; 2024–2026 CanHav Research. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/market-map" className="hover:text-blue-300">Market Map</Link>
              <a
                href="https://research.canhav.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-300"
              >
                Research
              </a>
              <Link href="/about-us" className="hover:text-blue-300">About</Link>
              <Link href="/login" className="hover:text-blue-300">Sign in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
