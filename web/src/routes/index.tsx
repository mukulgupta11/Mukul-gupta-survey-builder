import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef } from 'react'
import { BrandMark } from '../components/app-shell'
import { Icon } from '../components/icons'
import { easeOut, fadeUp, hoverLift, stagger, tapPress } from '../components/motion'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user } = useAuth()
  const heroRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 })
  const productY = useSpring(useTransform(heroProgress, [0, 1], [0, 120]), {
    stiffness: 110,
    damping: 28,
  })
  const productRotate = useSpring(useTransform(heroProgress, [0, 1], [1.2, -2.4]), {
    stiffness: 110,
    damping: 28,
  })

  return (
    <motion.main className="marketing-page" initial="hidden" animate="visible" variants={stagger}>
      <motion.div
        className="marketing-scroll-progress"
        style={{ scaleX: smoothProgress }}
        aria-hidden="true"
      />
      <motion.nav
        className="marketing-nav"
        variants={fadeUp}
        transition={{ duration: 0.55, ease: easeOut }}
      >
        <BrandMark />
        <div className="marketing-nav-links">
          <a href="#experience">Experience</a>
          <a href="#features">Features</a>
          <a href="#principles">Principles</a>
        </div>
        <Link to={user ? '/app' : '/login'} className="button button-dark">
          {user ? 'Open workspace' : 'Log in'}
          <Icon name="arrow-right" size={16} />
        </Link>
      </motion.nav>

      <section className="marketing-hero" ref={heroRef}>
        <motion.div className="hero-copy" variants={stagger}>
          <motion.p className="landing-kicker" variants={fadeUp}>
            <span />
            Surveys, with a point of view
          </motion.p>
          <motion.h1 variants={fadeUp}>
            <motion.span className="hero-line" variants={fadeUp}>
              Ask beautifully.
            </motion.span>
            <motion.em className="hero-line" variants={fadeUp}>
              Learn honestly.
            </motion.em>
          </motion.h1>
          <motion.p variants={fadeUp}>
            Luma helps thoughtful teams create branded surveys that feel like a conversation, then
            turns every response into something the team can act on.
          </motion.p>
          <motion.div className="hero-actions" variants={fadeUp}>
            <Link to={user ? '/app' : '/login'} className="button button-dark hero-primary">
              {user ? 'Go to dashboard' : 'Build your first survey'}
              <Icon name="arrow-right" size={18} />
            </Link>
            <a href="#experience" className="button button-ghost">
              See the experience
            </a>
          </motion.div>
          <motion.div className="hero-proof" variants={fadeUp}>
            <div className="avatar-stack" aria-hidden="true">
              {['AR', 'JM', 'SK'].map((initials, index) => (
                <motion.span
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.08, ease: easeOut }}
                  key={initials}
                >
                  {initials}
                </motion.span>
              ))}
            </div>
            <p>
              <strong>12,400+</strong>
              thoughtful responses collected
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-product"
          role="img"
          aria-label="Luma product preview"
          initial={{ opacity: 0, x: 70, rotate: 4, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, rotate: 1.2, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.24, ease: easeOut }}
          style={reducedMotion ? undefined : { y: productY, rotate: productRotate }}
          whileHover={reducedMotion ? undefined : { scale: 1.012 }}
        >
          <div className="hero-product-bar">
            <span className="mini-brand">
              <BrandMark compact />
            </span>
            <span>Candidate experience pulse</span>
            <i>Published</i>
          </div>
          <div className="hero-product-body">
            <aside>
              <small>QUESTIONS</small>
              {['Your name', 'Process clarity', 'Strong moments', 'Recommendation', 'Feedback'].map(
                (label, index) => (
                  <motion.span
                    className={index === 1 ? 'active' : ''}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.62 + index * 0.07, ease: easeOut }}
                    key={label}
                  >
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    {label}
                  </motion.span>
                ),
              )}
            </aside>
            <motion.div
              className="hero-survey-card"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.58, duration: 0.65, ease: easeOut }}
            >
              <motion.span
                className="hero-survey-logo"
                animate={reducedMotion ? undefined : { rotate: [0, -5, 5, 0] }}
                transition={{ delay: 1.2, duration: 0.7 }}
              >
                L
              </motion.span>
              <p className="eyebrow">Question 02</p>
              <h2>How clear was the interview process?</h2>
              <p>Choose the closest answer.</p>
              {['Crystal clear', 'Mostly clear', 'A little confusing'].map((option, index) => (
                <motion.span
                  className={`hero-option ${index === 0 ? 'selected' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.08, ease: easeOut }}
                  whileHover={{ x: 4 }}
                  key={option}
                >
                  <b>{String.fromCharCode(65 + index)}</b>
                  {option}
                  {index === 0 && <Icon name="check" size={15} />}
                </motion.span>
              ))}
              <motion.button type="button" whileHover={{ y: -2 }} whileTap={tapPress}>
                Continue
                <Icon name="arrow-right" size={15} />
              </motion.button>
            </motion.div>
          </div>
          <motion.div
            className="floating-note marketing-note"
            initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
            animate={
              reducedMotion
                ? { opacity: 1, scale: 1, rotate: -4 }
                : { opacity: 1, scale: 1, rotate: [-4, -2, -4], y: [0, -8, 0] }
            }
            transition={{
              opacity: { delay: 1.15, duration: 0.35 },
              scale: { delay: 1.15, type: 'spring', stiffness: 280, damping: 18 },
              rotate: { delay: 1.4, duration: 4, repeat: Number.POSITIVE_INFINITY },
              y: { delay: 1.4, duration: 4, repeat: Number.POSITIVE_INFINITY },
            }}
          >
            <span>Completion rate</span>
            <strong>87%</strong>
            <i>+14% this week</i>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="logo-cloud"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7 }}
      >
        <motion.p initial={{ y: 10 }} whileInView={{ y: 0 }} viewport={{ once: true }}>
          Built for teams who care how they ask
        </motion.p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
        >
          {['NORTHSTAR', 'ATLAS', 'CEDAR', 'ORBIT', 'STUDIO/18'].map((name) => (
            <motion.span variants={fadeUp} whileHover={{ y: -3, color: '#1e1e1c' }} key={name}>
              {name}
            </motion.span>
          ))}
        </motion.div>
      </motion.section>

      <section className="experience-section" id="experience">
        <motion.div
          className="section-kicker"
          initial={{ opacity: 0, x: -18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          THE FULL CONVERSATION
        </motion.div>
        <motion.div
          className="experience-heading"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
        >
          <motion.h2 variants={fadeUp}>From a blank page to a useful decision.</motion.h2>
          <motion.p variants={fadeUp}>
            The builder, respondent flow, and analytics share one calm visual language, so every
            part of the product feels intentional.
          </motion.p>
        </motion.div>
        <motion.div
          className="experience-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.article
            className="experience-card builder-feature"
            variants={fadeUp}
            whileHover={hoverLift}
          >
            <div className="feature-number">01</div>
            <div>
              <p className="eyebrow">Build with focus</p>
              <h3>A live canvas, not a settings maze.</h3>
              <p>Reorder, configure, brand, and preview without losing sight of the survey.</p>
            </div>
            <div className="feature-visual feature-builder-visual">
              {[0, 1, 2].map((item) => (
                <motion.span
                  className={item === 1 ? 'active' : ''}
                  initial={{ scaleX: 0.65, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: item * 0.08, duration: 0.45, ease: easeOut }}
                  key={item}
                />
              ))}
              <motion.i
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5, ease: easeOut }}
              />
            </div>
          </motion.article>
          <motion.article
            className="experience-card response-feature"
            variants={fadeUp}
            whileHover={hoverLift}
          >
            <div className="feature-number">02</div>
            <div>
              <p className="eyebrow">Respect the respondent</p>
              <h3>One thoughtful question at a time.</h3>
              <p>A branded, distraction-free experience that works beautifully on every screen.</p>
            </div>
            <div className="feature-visual feature-response-visual">
              <small>03 / 06</small>
              <strong>What would you improve?</strong>
              <motion.span
                initial={{ width: '30%' }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ delay: 0.25, duration: 0.8, ease: easeOut }}
              >
                Take your time…
              </motion.span>
            </div>
          </motion.article>
          <motion.article
            className="experience-card insight-feature"
            variants={fadeUp}
            whileHover={hoverLift}
          >
            <div className="feature-number">03</div>
            <div>
              <p className="eyebrow">See the signal</p>
              <h3>Patterns you can read in seconds.</h3>
              <p>Choice breakdowns, rating averages, raw responses, and CSV export.</p>
            </div>
            <div className="feature-visual feature-chart-visual">
              {[72, 48, 84, 61, 92].map((height, index) => (
                <motion.span
                  initial={{ height: 0 }}
                  whileInView={{ height: `${height}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07, duration: 0.65, ease: easeOut }}
                  key={height}
                >
                  <i>{index + 1}</i>
                </motion.span>
              ))}
            </div>
          </motion.article>
        </motion.div>
      </section>

      <motion.section
        className="feature-band"
        id="features"
        initial={{ opacity: 0.7 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <motion.div
          initial={{ opacity: 0, x: -34 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <p className="section-kicker">EVERYTHING YOU NEED</p>
          <h2>Small surface. Serious capability.</h2>
        </motion.div>
        <motion.div
          className="feature-list"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          {[
            ['type', 'Six question types', 'Text, choices, ratings, and dates.'],
            ['palette', 'Per-survey branding', 'Color and logo controls with live preview.'],
            ['link', 'Public share links', 'No account required for respondents.'],
            ['bar-chart', 'Response analytics', 'Breakdowns, averages, and individual answers.'],
            ['download', 'CSV export', 'Take the raw signal wherever it needs to go.'],
            ['settings', 'Atomic saves', 'Ordered questions update together, never halfway.'],
          ].map(([icon, title, description]) => (
            <motion.article
              variants={fadeUp}
              whileHover={{ backgroundColor: '#302f2d' }}
              key={title}
            >
              <motion.span whileHover={{ rotate: -6, scale: 1.08 }}>
                <Icon name={icon as Parameters<typeof Icon>[0]['name']} size={18} />
              </motion.span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </motion.section>

      <section className="principles-section" id="principles">
        <motion.div
          className="principle-quote"
          initial={{ opacity: 0, rotate: -2, scale: 0.96 }}
          whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75, ease: easeOut }}
        >
          <motion.span
            animate={reducedMotion ? undefined : { rotate: [0, 12, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1 }}
          >
            <Icon name="sparkle" size={22} />
          </motion.span>
          <blockquote>
            “The best survey is not the one with the most questions. It is the one people trust
            enough to answer honestly.”
          </blockquote>
          <p>Luma product principle</p>
        </motion.div>
        <motion.div
          className="principle-copy"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
        >
          <p className="section-kicker">BUILT WITH INTENT</p>
          <motion.h2 variants={fadeUp}>Calm software for consequential questions.</motion.h2>
          <motion.p variants={fadeUp}>
            Warm surfaces, clear hierarchy, accessible controls, and purposeful motion make the
            interface feel considered without asking users to learn a new design language.
          </motion.p>
          <motion.div variants={fadeUp} whileHover={{ x: 3 }}>
            <Link to={user ? '/app' : '/login'} className="button button-dark">
              Explore the demo workspace
              <Icon name="arrow-right" size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="marketing-cta"
        initial={{ opacity: 0, y: 36, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.75, ease: easeOut }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.55, ease: easeOut }}
        >
          <p className="eyebrow">Your next good question starts here</p>
          <h2>Make something worth answering.</h2>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={tapPress}>
          <Link to={user ? '/app' : '/login'} className="button cta-button">
            {user ? 'Open workspace' : 'Log in to Luma'}
            <Icon name="arrow-right" size={18} />
          </Link>
        </motion.div>
      </motion.section>

      <motion.footer
        className="marketing-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <BrandMark />
        <p>Branded surveys, beautifully simple.</p>
        <span>Built with React, Hono, and Cloudflare.</span>
      </motion.footer>
    </motion.main>
  )
}
