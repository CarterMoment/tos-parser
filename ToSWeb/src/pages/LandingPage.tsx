import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconClipboard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
  )
}

function IconSparkles() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  )
}

function IconShieldCheck() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function IconPuzzle() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  )
}

function IconBolt() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  )
}

function IconUserPlus() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
    </svg>
  )
}

function IconCreditCard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 21Z" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'How it Works', href: '#how-it-works', id: 'how-it-works' },
  { label: 'Features',     href: '#features',     id: 'features'     },
  { label: 'Use Cases',    href: '#use-cases',    id: 'use-cases'    },
  { label: 'Pricing',      href: '#pricing',      id: 'pricing'      },
]

const STEPS = [
  {
    n: '01',
    Icon: IconClipboard,
    title: 'Paste or Browse',
    desc: 'Paste any Terms of Service directly into Termshift, or use the Chrome extension to analyze any page while you browse. Works with any public policy document.',
  },
  {
    n: '02',
    Icon: IconSparkles,
    title: 'AI Scans Instantly',
    desc: 'Our model reads every clause and surfaces what actually matters — arbitration traps, data sharing, auto-renewals, and more. Results arrive in seconds, not hours.',
  },
  {
    n: '03',
    Icon: IconShieldCheck,
    title: 'See Your Risks',
    desc: "Get a plain-English breakdown with color-coded severity ratings and precise highlights. Know exactly what you're agreeing to before you click Accept.",
  },
]

const FEATURES = [
  {
    Icon: IconSearch,
    title: 'Clause-Level Risk Detection',
    desc: "Termshift flags specific sentences and phrases, not just overall summaries. Know exactly which line contains the risk and why it matters.",
  },
  {
    Icon: IconWarning,
    title: 'Severity Ratings',
    desc: "Every flag is rated High, Medium, or Low with color coding. Prioritize what needs your attention and skip what doesn't.",
  },
  {
    Icon: IconPuzzle,
    title: 'Chrome Extension',
    desc: "Analyze any Terms of Service or Privacy Policy page with one click, without ever leaving your browser. Works on any site.",
  },
  {
    Icon: IconClock,
    title: 'Scan History',
    desc: "Every analysis is saved to your account automatically. Review past scans and search across everything you've analyzed.",
  },
  {
    Icon: IconChat,
    title: 'Plain English Explanations',
    desc: "No legal jargon. Every flagged clause comes with a plain-English explanation of what it actually means for you.",
  },
  {
    Icon: IconBolt,
    title: 'Real-Time Streaming',
    desc: "Watch the analysis unfold live — results stream in as the AI processes the document, so you see insights within seconds of hitting Analyze.",
  },
]

const USE_CASES = [
  {
    Icon: IconUserPlus,
    title: 'Before Signing Up',
    desc: "Check a new app or service before creating an account. Spot data harvesting, account termination clauses, and legal traps before they can affect you.",
  },
  {
    Icon: IconCreditCard,
    title: 'Before Purchasing',
    desc: "Auto-renewal traps and cancellation nightmares are buried in the fine print. Termshift surfaces them before you enter your credit card number.",
  },
  {
    Icon: IconEye,
    title: 'Privacy Research',
    desc: "Understand exactly what data a company collects, who they share it with, and what rights you're signing away. Essential for privacy-conscious users.",
  },
  {
    Icon: IconGlobe,
    title: 'Chrome Extension Power Users',
    desc: "Analyze ToS pages inline while browsing — no copy-pasting required. Right-click any page and get an instant analysis without leaving your workflow.",
  },
]

const PRICING = [
  {
    tier: 'Free',
    price: '$0',
    per: '/month',
    desc: 'For individuals getting started.',
    features: [
      '5 scans per month',
      'Basic risk summary',
      'Scan history (last 7 days)',
      'Chrome extension',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    tier: 'Pro',
    price: '$9',
    per: '/month',
    desc: 'For power users who need more.',
    features: [
      'Unlimited scans',
      'Full clause-level analysis',
      'Full scan history',
      'Priority processing',
      'Export reports (PDF)',
    ],
    cta: 'Start Pro',
    highlighted: true,
  },
  {
    tier: 'Team',
    price: '$29',
    per: '/month',
    desc: 'For teams staying protected together.',
    features: [
      'Everything in Pro',
      '5 team seats',
      'Shared scan history',
      'API access (coming soon)',
    ],
    cta: 'Start Team',
    highlighted: false,
  },
]

// ─── Nav ──────────────────────────────────────────────────────────────────────

type NavProps = {
  scrolled: boolean
  activeSection: string
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  closeMenu: () => void
}

function Nav({ scrolled, activeSection, menuOpen, setMenuOpen, closeMenu }: NavProps) {
  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-200'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}
          >
            Termshift
          </Link>

          {/* Center nav links — desktop */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <a
                key={link.id}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-150 ${
                  activeSection === link.id
                    ? scrolled ? 'text-blue-600' : 'text-white'
                    : scrolled ? 'text-slate-500 hover:text-slate-900' : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right actions — desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/signin"
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                scrolled
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'border-white/25 text-white hover:bg-white/10'
              }`}
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
            }`}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-6 py-3 space-y-0.5">
            {NAV_LINKS.map(link => (
              <a
                key={link.id}
                href={link.href}
                onClick={closeMenu}
                className="block py-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to="/signin"
              onClick={closeMenu}
              className="w-full text-center py-2.5 text-sm font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={closeMenu}
              className="w-full text-center py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center overflow-hidden"
    >
      {/* Subtle dot-grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Ambient glow */}
      <div aria-hidden className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-indigo-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-24 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">AI-Powered ToS Analysis</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Read the Fine Print.{' '}
              <span className="text-blue-400">Without Reading</span>{' '}
              the Fine Print.
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              Termshift uses AI to scan Terms of Service and Privacy Policies, flag risky
              clauses in seconds, and tell you what you're actually agreeing to.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/signup"
                className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Get Started Free
              </Link>
              <a
                href="#how-it-works"
                className="px-7 py-3.5 border border-white/20 hover:border-white/40 text-white/90 hover:text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                See How It Works
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right — product mockup */}
          <div className="w-full lg:w-[390px] shrink-0">
            <div className="relative">
              <div aria-hidden className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-800/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">

                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4 bg-slate-900/50 border-b border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-semibold text-white">Analysis Complete</span>
                  </div>
                  <span className="text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/20 rounded-full px-2.5 py-1">
                    3 risks found
                  </span>
                </div>

                {/* Text excerpt with highlight */}
                <div className="px-5 py-4 border-b border-slate-700/60">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span>...the Company may at its sole discretion </span>
                    <mark className="bg-yellow-400/25 text-yellow-200 rounded-sm px-0.5 not-italic">
                      share your personal information with third-party advertising partners
                    </mark>
                    <span> without prior notice to you...</span>
                  </p>
                </div>

                {/* Risk flag rows */}
                <div className="divide-y divide-slate-700/50">
                  {[
                    { label: 'Arbitration Clause', sev: 'HIGH',  red: true,  desc: 'Waives your right to a jury trial or class action.' },
                    { label: 'Data Sharing',        sev: 'MED',   red: false, desc: 'Data sold to third-party advertisers.' },
                    { label: 'Auto-Renewal',         sev: 'MED',   red: false, desc: 'Subscription renews unless cancelled 30 days prior.' },
                  ].map(flag => (
                    <div key={flag.label} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`mt-0.5 shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border ${
                        flag.red
                          ? 'bg-red-500/15 text-red-300 border-red-500/20'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                      }`}>
                        {flag.sev}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-white leading-snug">{flag.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{flag.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Social Proof ─────────────────────────────────────────────────────────────

function SocialProof() {
  const stats = [
    { value: '10,000+', label: 'Scans Completed' },
    { value: '500+',    label: 'Active Users' },
    { value: '4.9 ★',  label: 'User Rating' },
    { value: '50+',     label: 'Platforms Analyzed' },
  ]
  return (
    <section className="bg-slate-50 border-y border-slate-200 py-14">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-9">
          Trusted by people who actually read the fine print
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-slate-900 tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            From document to plain-English insights in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(step => (
            <div
              key={step.n}
              className="relative p-8 rounded-2xl border border-slate-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Background step number */}
              <span aria-hidden className="absolute top-5 right-6 text-6xl font-black text-slate-100 leading-none select-none">
                {step.n}
              </span>
              {/* Icon */}
              <div className="relative z-10 w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5">
                <step.Icon />
              </div>
              <h3 className="relative z-10 text-lg font-semibold text-slate-900 mb-2.5">{step.title}</h3>
              <p className="relative z-10 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="bg-slate-50 py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Stay Protected
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Built for people who want clarity, not more complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                <f.Icon />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-[0.95rem]">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Use Cases ────────────────────────────────────────────────────────────────

function UseCases() {
  return (
    <section id="use-cases" className="bg-white py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Who Uses Termshift</h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Whether you're signing up, purchasing, or just protecting your privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {USE_CASES.map(uc => (
            <div
              key={uc.title}
              className="flex gap-5 p-6 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <uc.Icon />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1.5 text-[0.95rem]">{uc.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{uc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simple, Honest Pricing</h2>
          <p className="text-slate-500 text-lg">Start free, upgrade when you need more.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PRICING.map(plan => (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-2xl p-8 transition-shadow ${
                plan.highlighted
                  ? 'bg-white border-2 border-blue-500 shadow-xl shadow-blue-500/10'
                  : 'bg-white border border-slate-200 shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-900 mb-1">{plan.tier}</h3>
                <p className="text-sm text-slate-500 mb-5">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.per}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <IconCheck />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'border border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          No credit card required for free plan.
        </p>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="bg-slate-900 py-28">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
          Stop Agreeing to Things You Haven't Read
        </h2>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Join thousands of users who let Termshift do the reading.
        </p>
        <Link
          to="/signup"
          className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Get Started Free
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-bold text-white mb-3">Termshift</div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[200px]">
              Understand what you're agreeing to.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-3">
              {[
                { label: 'How it Works', href: '#how-it-works' },
                { label: 'Features',     href: '#features' },
                { label: 'Use Cases',    href: '#use-cases' },
                { label: 'Pricing',      href: '#pricing' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Account</h4>
            <ul className="space-y-3">
              <li><Link to="/signin" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link></li>
              <li><Link to="/signup" className="text-sm text-slate-400 hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link to="/app"    className="text-sm text-slate-400 hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          © 2025 Termshift. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [menuOpen, setMenuOpen] = useState(false)

  // Nav background: transparent over hero, white once scrolled
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Active nav link: highlight based on which section is in the viewport center
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]')
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSection(e.target.id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <Nav
        scrolled={scrolled}
        activeSection={activeSection}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        closeMenu={() => setMenuOpen(false)}
      />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <UseCases />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  )
}
