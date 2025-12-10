import Layout from '../components/Layout';
import { useRouter } from 'next/router';

export default function Contact() {
  const router = useRouter();

  return (
    <Layout>
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>

            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
                Contact Us
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Ready to transform your Ethereum journey? Get in touch with our experts.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="glass rounded-xl p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">Send us a message</h2>
                
                <div className="bg-white rounded-lg overflow-hidden">
                  <iframe
                    id="jotform-contact"
                    src="https://form.jotform.com/253432798519065"
                    frameBorder="0"
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none'
                    }}
                    scrolling="yes"
                    title="Contact CanHav Research"
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    Secure form powered by JotForm
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div className="glass rounded-xl p-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Get in Touch</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        📧
                      </div>
                      <div>
                        <p className="text-gray-300">Email</p>
                        <p className="text-white">waz@canhav.com</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        💬
                      </div>
                      <div>
                        <p className="text-gray-300">Response Time</p>
                        <p className="text-white">Within 24 hours</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-xl p-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Office Hours</h3>
                  <div className="space-y-2 text-gray-300">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                    <p>Saturday: 10:00 AM - 2:00 PM EST</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>

                <div className="glass rounded-xl p-8">
                  <h3 className="text-xl font-semibold text-white mb-4">What to Expect</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Personalized consultation</li>
                    <li>• Expert guidance on Ethereum solutions</li>
                    <li>• Custom research proposals</li>
                    <li>• Enterprise partnership opportunities</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
