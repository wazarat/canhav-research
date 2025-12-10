import Head from 'next/head'
import Layout from '../components/Layout'

export default function AboutUsPage() {
  return (
    <Layout>
      <Head>
        <title>About Us - CanHav Research</title>
        <meta name="description" content="Learn about CanHav Research - bridging research, enterprise reality, and digital asset infrastructure through practical blockchain solutions." />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto px-6 py-20">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
              <div className="lg:w-2/3">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                  About CanHav
                </h1>
                <p className="text-2xl text-gray-600 leading-relaxed font-light">
                  Bridging research, enterprise reality, and digital asset infrastructure through 
                  practical blockchain solutions for the modern economy.
                </p>
              </div>
              
              {/* Action Buttons - Top Right */}
              <div className="lg:w-1/3 flex flex-col gap-4">
                <a 
                  href="https://research.canhav.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 text-center shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Access CanHav Research →
                </a>
                <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                  Contact Us: Crypto Native Teams →
                </button>
                <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                  Contact Us: Small Businesses & Associations →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Recognition Strip */}
        <div className="bg-white border-y border-gray-200">
          <div className="container mx-auto px-6 py-12">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Trusted & Engaged within and beyond the Ecosystem
              </h2>
              <p className="text-gray-600">
                Recognized by leading institutions, accelerators, and regulatory bodies
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-90 hover:opacity-100 transition-opacity duration-300">
              {/* DDQIC */}
              <div className="flex flex-col items-center group">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 border border-gray-100 p-2">
                  <img 
                    src="/images/logos/ddqic-logo.png" 
                    alt="Dunin-Deshpande Queen's Innovation Centre"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-600 mt-3 font-medium">Innovation Centre</span>
              </div>
              
              {/* City of Kingston */}
              <div className="flex flex-col items-center group">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 border border-gray-100 p-2">
                  <img 
                    src="/images/logos/kingston-logo.png" 
                    alt="City of Kingston"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-600 mt-3 font-medium">City Partnership</span>
              </div>
              
              {/* MIC */}
              <div className="flex flex-col items-center group">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 border border-gray-100 p-2">
                  <img 
                    src="/images/logos/mic-logo.png" 
                    alt="Mayor's Innovation Challenge"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-600 mt-3 font-medium">Innovation Challenge</span>
              </div>
              
              {/* CoinDesk */}
              <div className="flex flex-col items-center group">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 border border-gray-100 p-2">
                  <img 
                    src="/images/logos/coindesk-logo.png" 
                    alt="CoinDesk"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-600 mt-3 font-medium">Media Coverage</span>
              </div>
              
              {/* PVARA */}
              <div className="flex flex-col items-center group">
                <div className="w-32 h-20 bg-white rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-300 border border-gray-100 p-2">
                  <img 
                    src="/images/logos/pvara-logo .png" 
                    alt="Pakistan Virtual Asset Regulatory Authority"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-600 mt-3 font-medium">Regulatory Authority</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white">
          <div className="container mx-auto px-6 py-20 max-w-6xl">
            
            {/* Section 1: Bridging Research */}
            <section className="mb-24">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-8">
                  Bridging Research, Enterprise Reality, and Digital Asset Infrastructure
                </h2>
                <div className="prose prose-xl text-gray-700 leading-relaxed space-y-6 max-w-none">
                  <p className="text-lg">
                    CanHav was founded in January 2025 by a Web3 and blockchain native, <span className="font-semibold text-blue-700">Wazarat Hussain</span>, 
                    with hands-on experience across startups, enterprise initiatives, and consulting 
                    engagements in the digital asset ecosystem.
                  </p>
                  <p className="text-lg">
                    From inception, CanHav has focused on one core problem: making complex blockchain 
                    infrastructure understandable, usable, and practical for founders, operators, 
                    enterprises, and institutions navigating a rapidly evolving landscape.
                  </p>
                  <p className="text-lg">
                    Rather than approaching blockchain as speculation or hype, CanHav is built on 
                    <span className="font-semibold text-blue-700"> research-grade analysis, real-world implementation experience, and ecosystem-level thinking</span>.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Research to Real-World Impact */}
            <section className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-8">
                    From Research to Real-World Impact
                  </h2>
                  <div className="prose prose-xl text-gray-700 leading-relaxed space-y-6">
                    <p className="text-lg">
                      CanHav was incubated at the <span className="font-semibold text-purple-700">Dunin-Deshpande Queen's Innovation Centre</span>, where it 
                      emerged alongside a network of venture-backed startups and founders at Queen's 
                      University, Canada.
                    </p>
                    <p className="text-lg">
                      This environment reinforced CanHav's emphasis on applied research, practical 
                      experimentation, and building solutions that matter beyond theory.
                    </p>
                    <p className="text-lg">
                      In March 2025, CanHav was invited by the <span className="font-semibold text-purple-700">Mayor of Kingston, Bryan Paterson</span>, to 
                      participate in the Mayor's Innovation Challenge, further validating its role in 
                      applying emerging technologies to real economic and institutional problems.
                    </p>
                  </div>
                </div>
                
                {/* Research Impact Image */}
                <div className="lg:order-last">
                  <div className="relative rounded-2xl overflow-hidden shadow-lg h-80">
                    <img 
                      src="/images/sections/research-impact.jpg" 
                      alt="Research Impact - Queen's Innovation Centre"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl p-8 h-80 flex items-center justify-center">
                              <div class="text-center">
                                <div class="w-20 h-20 bg-purple-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                  <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h4M7 7h10M7 11h10M7 15h10" />
                                  </svg>
                                </div>
                                <p class="text-purple-700 font-medium">Research Impact Image</p>
                                <p class="text-sm text-purple-600">Add research-impact.jpg to /public/images/sections/</p>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20"></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Recognition */}
            <section className="mb-24">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Recognition Image */}
                <div>
                  <div className="relative rounded-2xl overflow-hidden shadow-lg h-80">
                    <img 
                      src="/images/sections/recognition.jpg" 
                      alt="Recognition - Coin Pitchfest Achievement"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image doesn't exist
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-8 h-80 flex items-center justify-center">
                              <div class="text-center">
                                <div class="w-20 h-20 bg-orange-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                  <svg class="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                  </svg>
                                </div>
                                <p class="text-orange-700 font-medium">Recognition Image</p>
                                <p class="text-sm text-orange-600">Add recognition.jpg to /public/images/sections/</p>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20"></div>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-8">
                    Recognition Within the Global Crypto Ecosystem
                  </h2>
                  <div className="prose prose-xl text-gray-700 leading-relaxed space-y-6">
                    <p className="text-lg">
                      CanHav's work has also gained recognition within the broader digital asset and 
                      crypto ecosystem.
                    </p>
                    <p className="text-lg">
                      The company was featured as a <span className="font-semibold text-orange-700">Top 40 startup at the Coin Pitchfest Semi-Finals</span>, 
                      highlighting its research-driven approach and enterprise-relevant positioning 
                      within a crowded and often fragmented market.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Regulatory Engagement */}
            <section className="mb-24">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 md:p-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-8">
                  Regulatory & Institutional Engagement
                </h2>
                <div className="prose prose-xl text-gray-700 leading-relaxed space-y-6 max-w-none">
                  <p className="text-lg">
                    Beyond startups and enterprise users, CanHav actively works at the intersection 
                    of technology and regulation.
                  </p>
                  <p className="text-lg">
                    The team is currently engaged with the <span className="font-semibold text-green-700">Pakistan Virtual Asset Regulatory Authority 
                    (PVARA)</span>, supporting efforts to design licensing frameworks and internal regulatory 
                    processes for one of the world's largest emerging digital asset markets impacting 
                    regulatory infrastructure for a <span className="font-semibold text-green-700">population of over 250 million people</span>.
                  </p>
                  <p className="text-lg">
                    This work reflects CanHav's belief that credible blockchain adoption requires 
                    thoughtful regulation, institutional alignment, and operational clarity.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: What CanHav Does Today */}
            <section className="mb-24">
              <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
                What CanHav Does Today
              </h2>
              <div className="text-center mb-16">
                <p className="text-xl text-gray-600 max-w-4xl mx-auto">
                  CanHav operates across three focused engagement tracks—each designed for a 
                  distinct type of organization interacting with blockchain and digital asset infrastructure.
                </p>
              </div>

              {/* Track Cards */}
              <div className="space-y-8">
                {/* Track 1: Research Access */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 border-l-4 border-blue-500 shadow-lg">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4">
                    Research Access & Market Intelligence
                  </h3>
                  <p className="text-blue-800 font-semibold mb-4 text-lg">
                    For teams that need clarity before committing capital or resources
                  </p>
                  <p className="text-gray-700 mb-6 text-lg">
                    CanHav provides structured research and curated market maps that help users 
                    understand Ethereum, digital assets, and adjacent infrastructure without 
                    navigating fragmented sources.
                  </p>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-700 font-semibold mb-3">This track is designed for individuals and teams seeking:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Clear ecosystem overviews</li>
                      <li>Sector-level analysis</li>
                      <li>Research-driven context for strategic decision-making</li>
                    </ul>
                  </div>
                </div>

                {/* Track 2: Builders */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-8 border-l-4 border-purple-500 shadow-lg">
                  <h3 className="text-2xl font-bold text-purple-900 mb-4">
                    Ethereum & Blockchain Builders
                  </h3>
                  <p className="text-purple-800 font-semibold mb-4 text-lg">
                    For teams actively building, scaling, or deploying capital
                  </p>
                  <p className="text-gray-700 mb-6 text-lg">
                    This track supports founders, operators, and teams going beyond research—those 
                    building products, protocols, or enterprise integrations within the Ethereum 
                    and broader blockchain ecosystem.
                  </p>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-700 font-semibold mb-3">Engagements focus on:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Ecosystem navigation and technical context</li>
                      <li>Infrastructure and protocol positioning</li>
                      <li>Go-to-market and architectural considerations</li>
                      <li>Applied research aligned with real deployment decisions</li>
                    </ul>
                  </div>
                </div>

                {/* Track 3: Small Businesses */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 border-l-4 border-green-500 shadow-lg">
                  <h3 className="text-2xl font-bold text-green-900 mb-4">
                    Small Businesses & Industry Associations
                  </h3>
                  <p className="text-green-800 font-semibold mb-4 text-lg">
                    For organizations exploring coordination, efficiency, and shared infrastructure
                  </p>
                  <p className="text-gray-700 mb-6 text-lg">
                    CanHav works with small businesses and associations facing structural disadvantages 
                    when operating in isolation—particularly around supplier access, minimum order 
                    quantities (MOQs), and multi-party reconciliation.
                  </p>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-gray-700 font-semibold mb-3">This track explores how blockchain-enabled coordination models can support:</p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Shared purchasing and supplier access</li>
                      <li>Reduced operational friction</li>
                      <li>Improved reconciliation and visibility across partners</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Work With CanHav Section */}
            <section className="mb-24">
              <div className="text-center bg-gray-50 rounded-2xl p-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-8">
                  Work With CanHav
                </h2>
                <div className="max-w-3xl mx-auto space-y-6">
                  <p className="text-xl text-gray-700">
                    CanHav engages selectively and purposefully, focusing on conversations where 
                    research, implementation, or institutional alignment is genuinely relevant.
                  </p>
                  <p className="text-xl text-gray-700">
                    If there is alignment with one of the tracks below, we invite you to reach out.
                  </p>
                </div>
              </div>
            </section>

            {/* Choose Your Path Section */}
            <section className="mb-24">
              <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
                Choose Your Path
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                {/* Research Access Card */}
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col"
                     style={{background: 'linear-gradient(to bottom right, #dbeafe, #e9d5ff)'}}>
                  <h3 className="text-xl font-bold text-blue-700 mb-4 text-center">
                    Access CanHav Research
                  </h3>
                  <p className="text-blue-700 mb-6 flex-grow text-center">
                    Market maps, ecosystem analysis, and research insights
                  </p>
                  <a 
                    href="https://research.canhav.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-300 w-full justify-center min-h-[52px]"
                  >
                    Explore Research →
                  </a>
                </div>

                {/* Builders Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col"
                     style={{background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)'}}>
                  <h3 className="text-xl font-bold text-blue-700 mb-4 text-center">
                    Crypto Native Teams
                  </h3>
                  <p className="text-blue-700 mb-6 flex-grow text-center">
                    Product teams, founders, and operators building in Web3
                  </p>
                  <button className="inline-flex items-center px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300 w-full justify-center min-h-[52px]">
                    Contact Us
                  </button>
                </div>

                {/* Businesses Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 shadow-lg border border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col"
                     style={{background: 'linear-gradient(to bottom right, #faf5ff, #e9d5ff)'}}>
                  <h3 className="text-xl font-bold text-purple-700 mb-4 text-center">
                    Small Businesses & Associations
                  </h3>
                  <p className="text-purple-700 mb-6 flex-grow text-center">
                    Coordination, efficiency, and shared infrastructure exploration
                  </p>
                  <button className="inline-flex items-center px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all duration-300 w-full justify-center min-h-[52px]">
                    Contact Us
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </Layout>
  )
}
