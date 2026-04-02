import { Link } from 'react-router-dom'

const footerSections = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '#' },
      { label: 'Careers', to: '#' },
      { label: 'Press', to: '#' },
      { label: 'Sustainability', to: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Track Order', to: '/orders' },
      { label: 'Returns & Refunds', to: '/orders' },
      { label: 'Contact Support', to: '#' },
      { label: 'FAQs', to: '#' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { label: 'Privacy Policy', to: '#' },
      { label: 'Terms of Service', to: '#' },
      { label: 'Shipping Policy', to: '#' },
      { label: 'Cookie Policy', to: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 pb-10 pt-14 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 md:grid-cols-4 md:px-6">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Northstar Commerce
          </h3>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Build and scale premium e-commerce with realtime operations, modern design,
            and conversion-focused experiences.
          </p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {section.title}
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link className="text-slate-600 hover:text-brand-600 dark:text-slate-300" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
