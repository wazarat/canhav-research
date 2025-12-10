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
        <div className="bg-white">
          <div className="container mx-auto px-6 py-16">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
              <div className="lg:w-2/3">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  About CanHav
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Bridging research, enterprise reality, and digital asset infrastructure through 
                  practical blockchain solutions for the modern economy.
                </p>
              </div>
              
              {/* Action Buttons - Top Right */}
              <div className="lg:w-1/3 flex flex-col gap-3">
                <a 
                  href="https://research.canhav.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 text-center"
                >
                  Access CanHav Research →
                </a>
                <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-300">
                  Contact Us — Builders →
                </button>
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-300">
                  Contact Us — Businesses →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          
          {/* Section 1: Bridging Research */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Bridging Research, Enterprise Reality, and Digital Asset Infrastructure
            </h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed space-y-4">
              <p>
                CanHav was founded in January 2025 by a Web3 and blockchain native, Wazarat Hussain, 
                with hands-on experience across startups, enterprise initiatives, and consulting 
                engagements in the digital asset ecosystem.
              </p>
              <p>
                From inception, CanHav has focused on one core problem: making complex blockchain 
                infrastructure understandable, usable, and practical for founders, operators, 
                enterprises, and institutions navigating a rapidly evolving landscape.
              </p>
              <p>
                Rather than approaching blockchain as speculation or hype, CanHav is built on 
                research-grade analysis, real-world implementation experience, and ecosystem-level thinking.
              </p>
            </div>
          </section>

          {/* Section 2: Research to Real-World Impact */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              From Research to Real-World Impact
            </h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed space-y-4">
              <p>
                CanHav was incubated at the Dunin-Deshpande Queen's Innovation Centre, where it 
                emerged alongside a network of venture-backed startups and founders at Queen's 
                University, Canada.
              </p>
              <p>
                This environment reinforced CanHav's emphasis on applied research, practical 
                experimentation, and building solutions that matter beyond theory.
              </p>
              <p>
                In March 2025, CanHav was invited by the Mayor of Kingston, Bryan Paterson, to 
                participate in the Mayor's Innovation Challenge, further validating its role in 
                applying emerging technologies to real economic and institutional problems.
              </p>
            </div>
          </section>

          {/* Section 3: Recognition */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Recognition Within the Global Crypto Ecosystem
            </h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed space-y-4">
              <p>
                CanHav's work has also gained recognition within the broader digital asset and 
                crypto ecosystem.
              </p>
              <p>
                The company was featured as a Top 40 startup at the Coin Pitchfest Semi-Finals, 
                highlighting its research-driven approach and enterprise-relevant positioning 
                within a crowded and often fragmented market.
              </p>
            </div>
          </section>

          {/* Section 4: Regulatory Engagement */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Regulatory & Institutional Engagement
            </h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed space-y-4">
              <p>
                Beyond startups and enterprise users, CanHav actively works at the intersection 
                of technology and regulation.
              </p>
              <p>
                The team is currently engaged with the Pakistan Virtual Asset Regulatory Authority 
                (PVARA), supporting efforts to design licensing frameworks and internal regulatory 
                processes for one of the world's largest emerging digital asset markets impacting 
                regulatory infrastructure for a population of over 250 million people.
              </p>
              <p>
                This work reflects CanHav's belief that credible blockchain adoption requires 
                thoughtful regulation, institutional alignment, and operational clarity.
              </p>
            </div>
          </section>

          {/* Section 5: What CanHav Does Today */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              What CanHav Does Today
            </h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed space-y-6">
              <p className="text-lg font-medium">
                CanHav operates across three focused engagement tracks—each designed for a 
                distinct type of organization interacting with blockchain and digital asset infrastructure.
              </p>

              {/* Track 1: Research Access */}
              <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-blue-900 mb-3">
                  Research Access & Market Intelligence
                </h3>
                <p className="text-blue-800 font-medium mb-3">
                  For teams that need clarity before committing capital or resources
                </p>
                <p className="text-gray-700 mb-4">
                  CanHav provides structured research and curated market maps that help users 
                  understand Ethereum, digital assets, and adjacent infrastructure without 
                  navigating fragmented sources.
                </p>
                <p className="text-gray-700 font-medium mb-2">This track is designed for individuals and teams seeking:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Clear ecosystem overviews</li>
                  <li>Sector-level analysis</li>
                  <li>Research-driven context for strategic decision-making</li>
                </ul>
              </div>

              {/* Track 2: Builders */}
              <div className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-500">
                <h3 className="text-xl font-bold text-purple-900 mb-3">
                  Ethereum & Blockchain Builders
                </h3>
                <p className="text-purple-800 font-medium mb-3">
                  For teams actively building, scaling, or deploying capital
                </p>
                <p className="text-gray-700 mb-4">
                  This track supports founders, operators, and teams going beyond research—those 
                  building products, protocols, or enterprise integrations within the Ethereum 
                  and broader blockchain ecosystem.
                </p>
                <p className="text-gray-700 font-medium mb-2">Engagements focus on:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Ecosystem navigation and technical context</li>
                  <li>Infrastructure and protocol positioning</li>
                  <li>Go-to-market and architectural considerations</li>
                  <li>Applied research aligned with real deployment decisions</li>
                </ul>
              </div>

              {/* Track 3: Small Businesses */}
              <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-green-900 mb-3">
                  Small Businesses & Industry Associations
                </h3>
                <p className="text-green-800 font-medium mb-3">
                  For organizations exploring coordination, efficiency, and shared infrastructure
                </p>
                <p className="text-gray-700 mb-4">
                  CanHav works with small businesses and associations facing structural disadvantages 
                  when operating in isolation—particularly around supplier access, minimum order 
                  quantities (MOQs), and multi-party reconciliation.
                </p>
                <p className="text-gray-700 font-medium mb-2">This track explores how blockchain-enabled coordination models can support:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Shared purchasing and supplier access</li>
                  <li>Reduced operational friction</li>
                  <li>Improved reconciliation and visibility across partners</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Work With CanHav Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Work With CanHav
            </h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed space-y-4">
              <p>
                CanHav engages selectively and purposefully, focusing on conversations where 
                research, implementation, or institutional alignment is genuinely relevant.
              </p>
              <p>
                If there is alignment with one of the tracks below, we invite you to reach out.
              </p>
            </div>
          </section>

          {/* Choose Your Path Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Choose Your Path
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Research Access Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-blue-600 mb-3">
                  Access CanHav Research
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Market maps, ecosystem analysis, and research insights
                </p>
                <a 
                  href="https://research.canhav.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 text-sm"
                >
                  👉 Explore Research
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Builders Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-purple-600 mb-3">
                  Ethereum & Blockchain Builders
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Product teams, founders, and operators building in Web3
                </p>
                <button className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-300 text-sm">
                  👉 Contact Us — Builders
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Businesses Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-bold text-green-600 mb-3">
                  Small Businesses & Associations
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Coordination, efficiency, and shared infrastructure exploration
                </p>
                <button className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-300 text-sm">
                  👉 Contact Us — Businesses
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  )
}
