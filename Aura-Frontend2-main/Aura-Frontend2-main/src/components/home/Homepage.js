// Aura Voice AI - Homepage Component
// =================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Homepage Component
 * 
 * Professional landing page designed for Silicon Valley executives
 * Showcases Aura's voice AI capabilities with clean, minimalistic design
 */
const Homepage = () => {
  const { isAuthenticated, user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animations
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className={`hero-content ${isVisible ? 'animate-in' : ''}`}>
            <div className="hero-badge">
              <span className="badge-text">Next-Generation Voice AI</span>
            </div>
            
            <h1 className="hero-title">
              Create Your Own
              <span className="gradient-text"> Voice AI Assistant</span>
            </h1>
            
            <p className="hero-description">
              Build intelligent, personalized voice chatbots that understand your business, 
              your customers, and speak exactly like you want them to. 
              Perfect for executives who demand excellence.
            </p>
            
            <div className="hero-actions">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="btn btn-primary btn-lg">
                    Go to Dashboard
                  </Link>
                  <Link to="/explore" className="btn btn-secondary btn-lg">
                    Explore Chatbots
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    Start Building
                  </Link>
                  <Link to="/explore" className="btn btn-secondary btn-lg">
                    See Demo
                  </Link>
                </>
              )}
            </div>
            
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Voice Interactions</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{'< 2s'}</div>
                <div className="stat-label">Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose Aura?</h2>
            <p className="section-description">
              Built for professionals who demand the highest quality voice AI solutions
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <span className="icon">🎯</span>
              </div>
              <h3 className="feature-title">Precision Training</h3>
              <p className="feature-description">
                Train your AI with documents, conversations, and voice samples. 
                Get responses that match your exact tone and expertise.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="icon">⚡</span>
              </div>
              <h3 className="feature-title">Enterprise-Grade Performance</h3>
              <p className="feature-description">
                Sub-2-second response times, 99.9% uptime, and enterprise security. 
                Built for businesses that can't afford downtime.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="icon">🔐</span>
              </div>
              <h3 className="feature-title">Bank-Level Security</h3>
              <p className="feature-description">
                Multi-tenant architecture, end-to-end encryption, and compliance-ready. 
                Your data stays private and secure.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="icon">🌐</span>
              </div>
              <h3 className="feature-title">Easy Integration</h3>
              <p className="feature-description">
                Drop-in widgets for your website, robust APIs, and comprehensive documentation. 
                Deploy in minutes, not months.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="icon">📊</span>
              </div>
              <h3 className="feature-title">Advanced Analytics</h3>
              <p className="feature-description">
                Real-time insights into conversations, user engagement, and performance metrics. 
                Data-driven optimization for better results.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <span className="icon">🎨</span>
              </div>
              <h3 className="feature-title">Custom Personalities</h3>
              <p className="feature-description">
                Create unique AI personalities that reflect your brand voice. 
                From professional to casual, match your exact communication style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-description">
              From idea to deployment in three simple steps
            </p>
          </div>
          
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Train Your AI</h3>
                <p className="step-description">
                  Upload documents, add conversation examples, or record voice samples. 
                  Our AI learns your unique style and expertise.
                </p>
              </div>
            </div>
            
            <div className="step-connector"></div>
            
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">Customize & Test</h3>
                <p className="step-description">
                  Fine-tune personality, response style, and conversation flows. 
                  Test with real voice interactions before going live.
                </p>
              </div>
            </div>
            
            <div className="step-connector"></div>
            
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Deploy & Scale</h3>
                <p className="step-description">
                  Get your embed code and integrate anywhere. 
                  Monitor performance and optimize based on real usage data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="social-proof-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Trusted by Industry Leaders</h2>
            <p className="section-description">
              Join innovative companies already using Aura Voice AI
            </p>
          </div>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p className="testimonial-text">
                  "Aura has transformed how we handle customer inquiries. 
                  The voice AI is incredibly natural and saves us hours every day."
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">JS</div>
                <div className="author-info">
                  <div className="author-name">John Smith</div>
                  <div className="author-role">CEO, TechCorp</div>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p className="testimonial-text">
                  "The customization level is impressive. Our AI sounds exactly like 
                  our brand voice and handles complex technical questions flawlessly."
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">MJ</div>
                <div className="author-info">
                  <div className="author-name">Maria Johnson</div>
                  <div className="author-role">CTO, InnovateAI</div>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p className="testimonial-text">
                  "Implementation was seamless, and the results were immediate. 
                  Our customer satisfaction scores increased by 40%."
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">DR</div>
                <div className="author-info">
                  <div className="author-name">David Rodriguez</div>
                  <div className="author-role">VP Operations, ScaleUp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to Build Your Voice AI?
            </h2>
            <p className="cta-description">
              Join hundreds of companies using Aura to create intelligent voice experiences
            </p>
            <div className="cta-actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-xl">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-xl">
                    Start Free Trial
                  </Link>
                  <Link to="/explore" className="btn btn-secondary btn-xl">
                    Watch Demo
                  </Link>
                </>
              )}
            </div>
            
            <div className="cta-note">
              <p>No credit card required • 14-day free trial • Setup in minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Styles */}
      <style jsx>{`
        .homepage {
          overflow-x: hidden;
        }

        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--white) 100%);
          padding: var(--space-20) 0 var(--space-24);
          position: relative;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-content {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }

        .hero-content.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--primary-100);
          color: var(--primary-600);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: var(--font-weight-medium);
          margin-bottom: var(--space-6);
          border: 1px solid var(--primary-200);
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: var(--font-weight-bold);
          line-height: 1.1;
          margin-bottom: var(--space-6);
          color: var(--gray-900);
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: var(--text-xl);
          color: var(--gray-600);
          line-height: 1.6;
          margin-bottom: var(--space-10);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          margin-bottom: var(--space-16);
          flex-wrap: wrap;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-8);
          max-width: 500px;
          margin: 0 auto;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--primary-600);
          margin-bottom: var(--space-1);
        }

        .stat-label {
          font-size: var(--text-sm);
          color: var(--gray-500);
          font-weight: var(--font-weight-medium);
        }

        /* Features Section */
        .features-section {
          padding: var(--space-20) 0;
          background: var(--white);
        }

        .section-header {
          text-align: center;
          margin-bottom: var(--space-16);
        }

        .section-title {
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-4);
        }

        .section-description {
          font-size: var(--text-lg);
          color: var(--gray-600);
          max-width: 600px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: var(--space-8);
        }

        .feature-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          text-align: center;
          transition: all var(--transition-normal);
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
          border-color: var(--primary-200);
        }

        .feature-icon {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%);
          margin: 0 auto var(--space-6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon {
          font-size: 2rem;
        }

        .feature-title {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-3);
        }

        .feature-description {
          color: var(--gray-600);
          line-height: 1.6;
        }

        /* How It Works Section */
        .how-it-works-section {
          padding: var(--space-20) 0;
          background: var(--gray-50);
        }

        .steps-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-8);
          max-width: 900px;
          margin: 0 auto;
        }

        .step-item {
          flex: 1;
          text-align: center;
          position: relative;
        }

        .step-number {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
          color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          margin: 0 auto var(--space-4);
          box-shadow: var(--shadow-lg);
        }

        .step-title {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-3);
        }

        .step-description {
          color: var(--gray-600);
          line-height: 1.6;
          font-size: var(--text-base);
        }

        .step-connector {
          width: 60px;
          height: 2px;
          background: var(--gray-300);
          flex-shrink: 0;
        }

        /* Social Proof Section */
        .social-proof-section {
          padding: var(--space-20) 0;
          background: var(--white);
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-8);
        }

        .testimonial-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          transition: all var(--transition-normal);
        }

        .testimonial-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
        }

        .testimonial-text {
          font-size: var(--text-lg);
          color: var(--gray-700);
          line-height: 1.6;
          margin-bottom: var(--space-6);
          font-style: italic;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .author-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
          font-weight: var(--font-weight-semibold);
          flex-shrink: 0;
        }

        .author-name {
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .author-role {
          font-size: var(--text-sm);
          color: var(--gray-500);
        }

        /* CTA Section */
        .cta-section {
          padding: var(--space-20) 0;
          background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
          color: var(--white);
          text-align: center;
        }

        .cta-title {
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--space-4);
        }

        .cta-description {
          font-size: var(--text-xl);
          margin-bottom: var(--space-8);
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          margin-bottom: var(--space-6);
          flex-wrap: wrap;
        }

        .cta-note p {
          font-size: var(--text-sm);
          opacity: 0.8;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .hero-section {
            padding: var(--space-16) 0 var(--space-20);
          }

          .hero-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-4);
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .steps-container {
            flex-direction: column;
            gap: var(--space-6);
          }

          .step-connector {
            width: 2px;
            height: 40px;
          }

          .hero-actions,
          .cta-actions {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Homepage;