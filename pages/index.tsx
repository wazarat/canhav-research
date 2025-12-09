import Layout from '../components/Layout';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Layout>
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <div className="relative pt-20 pb-20 sm:pt-32 sm:pb-40">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              {/* Main Heading */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                <span className="gradient-text">Making understanding</span>
                <br />
                <span className="gradient-text">and building with</span>
                <br />
                <span className="text-white">ethereum easier</span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
                For founders, operators, and researchers
              </p>
              
              {/* Description */}
              <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                Empowering the next generation of blockchain innovators with cutting-edge research, 
                comprehensive market insights, and enterprise-grade solutions.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a 
                  href="https://www.research.canhav.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 w-full sm:w-auto text-center"
                >
                  Explore Research
                </a>
                <button className="px-8 py-4 border-2 border-gray-700 hover:border-blue-400 text-gray-300 hover:text-blue-400 rounded-lg text-lg font-medium transition-all duration-300 hover:bg-blue-400/10 w-full sm:w-auto">
                  View Market Map
                </button>
              </div>
            </div>
          </div>
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 -right-40 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-800/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 -z-20 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-gray-900/50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
                Why Choose CanHav Research?
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                We provide comprehensive insights and tools to navigate the Ethereum ecosystem
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: "Market Intelligence",
                  description: "Deep market analysis and trend identification",
                  icon: "📊"
                },
                {
                  title: "Research Excellence", 
                  description: "Cutting-edge blockchain research and insights",
                  icon: "🔬"
                },
                {
                  title: "Enterprise Solutions",
                  description: "Tailored solutions for enterprise adoption",
                  icon: "🏢"
                },
                {
                  title: "Expert Support",
                  description: "Direct access to blockchain experts",
                  icon: "👥"
                }
              ].map((feature, index) => (
                <div key={index} className="glass rounded-xl p-6 hover:bg-blue-900/20 transition-all duration-300 group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-20">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              {[
                { number: "500+", label: "Research Reports" },
                { number: "50+", label: "Enterprise Clients" },
                { number: "1M+", label: "Data Points Analyzed" }
              ].map((stat, index) => (
                <div key={index} className="glass rounded-xl p-8">
                  <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-400 text-lg">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
