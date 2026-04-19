import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import NewsletterBanner from './NewsletterBanner';

interface LayoutProps {
  children: React.ReactNode;
}

interface ViewerSession {
  user: { id: string; email: string | null };
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewer, setViewer] = useState<ViewerSession | null>(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);

  const navItems = [
    { name: 'Market Map', href: '/market-map', external: false },
    { name: 'Research', href: '/research', external: false },
    { name: 'Enterprise Users', href: '/enterprise-users', external: false },
    { name: 'About Us', href: '/about-us', external: false },
  ];

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const res = await fetch('/api/viewer/session', { credentials: 'include' });
        if (!cancelled) {
          if (res.ok) {
            const json = await res.json();
            setViewer(json?.user ? { user: json.user } : null);
          } else {
            setViewer(null);
          }
          setViewerLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setViewer(null);
          setViewerLoaded(true);
        }
      }
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    try {
      await fetch('/api/viewer/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // no-op
    }
    setViewer(null);
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900 text-white">
      <Head>
        <title>CanHav Research - Making Ethereum Easier</title>
        <meta name="description" content="Making understanding and building with ethereum easier for founders, operators, and researchers" />

        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />

        <script type="text/javascript" src="https://cdn.jotfor.ms/static/prototype.forms.js?3.3.45397"></script>
        <script type="text/javascript" src="https://cdn.jotfor.ms/static/jotform.forms.js?3.3.45397"></script>
      </Head>

      <header className="relative border-b border-gray-800/50 glass">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold gradient-text hover:scale-105 transition-transform duration-200">
              CanHav Research
            </Link>

            <nav className="hidden lg:flex items-center space-x-6">
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

              {viewerLoaded && (
                viewer ? (
                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-sm text-gray-400 hidden xl:inline" title={viewer.user.email ?? ''}>
                      {viewer.user.email ?? 'Signed in'}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="text-sm text-gray-300 hover:text-blue-400 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Sign in
                  </Link>
                )
              )}

              <Link href="/contact">
                <button className="ml-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
                  Contact Us
                </button>
              </Link>
            </nav>

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

          {isMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-gray-800/50 pt-4">
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

              {viewerLoaded && (
                viewer ? (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleSignOut();
                    }}
                    className="block py-2 text-gray-300 hover:text-blue-400 transition-colors duration-200 text-left w-full"
                  >
                    Sign out ({viewer.user.email ?? 'signed in'})
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block py-2 text-gray-300 hover:text-blue-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                )
              )}

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

      <NewsletterBanner source="footer" variant="footer" />

      <footer className="border-t border-gray-800/50 glass">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-400">
            <p className="text-sm">&copy; 2024–2026 CanHav Research. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/market-map" className="hover:text-blue-300">Market Map</Link>
              <Link href="/research" className="hover:text-blue-300">Research</Link>
              <Link href="/about-us" className="hover:text-blue-300">About</Link>
              {viewer ? (
                <button onClick={handleSignOut} className="hover:text-blue-300">
                  Sign out
                </button>
              ) : (
                <Link href="/login" className="hover:text-blue-300">Sign in</Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
