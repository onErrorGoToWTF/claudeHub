import { useRef, useState } from 'react'
import { ArrowLeft, Mail, ShieldCheck, Copy, KeyRound } from 'lucide-react'
import { Button } from '../ui'
import s from './SignIn.module.css'

/** Design-preview for the authentication flow.
 *
 *  Routed at `/signin` but NOT linked from anywhere in the app — reachable
 *  by direct URL only. Real functionality lands with the DB migration; the
 *  bottom of the page has a small state-picker so every layout can be
 *  previewed without pretending to sign anyone in. */

type View =
  | 'signin'          // email entry (magic link)
  | 'signup'          // same shape, allowlist note
  | 'sent'            // post-submit "check your inbox"
  | 'totp_enroll'     // first-time MFA — QR + verify
  | 'totp_verify'     // ongoing sign-in second factor
  | 'recovery_list'   // one-time display of recovery codes
  | 'recovery_entry'  // enter a recovery code instead of TOTP

const VIEWS: { id: View; label: string }[] = [
  { id: 'signin',         label: 'Sign in' },
  { id: 'signup',         label: 'Sign up' },
  { id: 'sent',           label: 'Email sent' },
  { id: 'totp_enroll',    label: 'TOTP setup' },
  { id: 'totp_verify',    label: 'TOTP verify' },
  { id: 'recovery_list',  label: 'Recovery codes' },
  { id: 'recovery_entry', label: 'Recovery entry' },
]

export function SignIn() {
  const [view, setView] = useState<View>('signin')

  return (
    <div className={s.page}>
      <div className={s.banner}>
        <span className={s.bannerDot} />
        <span>
          <strong>Preview —</strong> real authentication lands with the DB migration.
          Buttons don't do anything yet.
        </span>
      </div>

      <div className={s.brand}>
        <span className={s.brandMark} />
        aiUniversity
      </div>

      {view === 'signin' && (
        <SignInForm onSwap={() => setView('signup')} onSent={() => setView('sent')} />
      )}
      {view === 'signup' && (
        <SignUpForm onSwap={() => setView('signin')} onSent={() => setView('sent')} />
      )}
      {view === 'sent' && (
        <SentCard onBack={() => setView('signin')} />
      )}
      {view === 'totp_enroll' && (
        <TotpEnroll onDone={() => setView('recovery_list')} />
      )}
      {view === 'totp_verify' && (
        <TotpVerify onRecovery={() => setView('recovery_entry')} />
      )}
      {view === 'recovery_list' && (
        <RecoveryList />
      )}
      {view === 'recovery_entry' && (
        <RecoveryEntry onBack={() => setView('totp_verify')} />
      )}

      {/* Preview-only state picker. Remove when auth ships. */}
      <div className={s.picker}>
        <span className={s.pickerLabel}>Preview</span>
        {VIEWS.map(v => (
          <button
            key={v.id}
            type="button"
            className={`${s.pickerChip} ${view === v.id ? s.pickerChipOn : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------
function SignInForm({ onSwap, onSent }: { onSwap: () => void; onSent: () => void }) {
  const [email, setEmail] = useState('')
  return (
    <form
      className={s.card}
      onSubmit={(e) => { e.preventDefault(); onSent() }}
    >
      <div className={s.title}>Welcome back</div>
      <div className={s.sub}>
        Enter your email — we'll send a magic link to sign you in. If
        you've set up two-factor auth, you'll be asked for your 6-digit
        code on the next step.
      </div>

      <div className={s.field}>
        <label htmlFor="signin-email" className={s.label}>Email</label>
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          className={s.input}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Button variant="primary" type="submit" className={s.primaryBtn}>
        <Mail size={15} strokeWidth={1.75} /> Send magic link
      </Button>

      <div className={s.swap}>
        New here?
        <button type="button" onClick={onSwap}>Sign up</button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------
function SignUpForm({ onSwap, onSent }: { onSwap: () => void; onSent: () => void }) {
  const [email, setEmail] = useState('')
  return (
    <form
      className={s.card}
      onSubmit={(e) => { e.preventDefault(); onSent() }}
    >
      <div className={s.title}>Create account</div>
      <div className={s.sub}>
        Enter your email. We'll send a link to confirm. Two-factor setup
        happens right after you click the link.
      </div>

      <div className={s.field}>
        <label htmlFor="signup-email" className={s.label}>Email</label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          className={s.input}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Button variant="primary" type="submit" className={s.primaryBtn}>
        <Mail size={15} strokeWidth={1.75} /> Send confirmation link
      </Button>

      <div className={s.note}>
        Account creation is currently invite-only. If your email isn't
        on the allowlist, the confirmation link won't work — ping the
        owner to get added.
      </div>

      <div className={s.swap}>
        Already have an account?
        <button type="button" onClick={onSwap}>Sign in</button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------
// Sent
// ---------------------------------------------------------------
function SentCard({ onBack }: { onBack: () => void }) {
  return (
    <div className={s.card}>
      <div className={s.title}>Check your inbox</div>
      <div className={s.sub}>
        We sent a link to your email. Click it to continue. You can close
        this tab — the link will open the app fresh.
      </div>
      <div className={s.note}>
        Didn't get it? Check spam, and give it a minute. If it still
        doesn't arrive after five, try again.
      </div>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft size={14} strokeWidth={1.75} /> Back
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------
// TOTP enroll (first-time setup)
// ---------------------------------------------------------------
function TotpEnroll({ onDone }: { onDone: () => void }) {
  return (
    <form className={s.card} onSubmit={(e) => { e.preventDefault(); onDone() }}>
      <div className={s.title}>Set up two-factor</div>
      <div className={s.sub}>
        Scan this QR code with an authenticator app — 1Password, Authy,
        Google Authenticator, etc. — then enter the 6-digit code to
        confirm.
      </div>

      <div className={s.qrFrame}><QrPlaceholder /></div>

      <div className={s.secretRow}>
        <span>JBSWY3DPEHPK3PXP</span>
        <button type="button" className={s.copyBtn}>
          <Copy size={11} strokeWidth={1.75} /> Copy
        </button>
      </div>
      <div className={s.note}>
        Can't scan? Paste that secret into your authenticator instead.
      </div>

      <CodeInput />

      <Button variant="primary" type="submit" className={s.primaryBtn}>
        <ShieldCheck size={15} strokeWidth={1.75} /> Confirm & continue
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------
// TOTP verify (every sign-in after enrollment)
// ---------------------------------------------------------------
function TotpVerify({ onRecovery }: { onRecovery: () => void }) {
  return (
    <form className={s.card} onSubmit={(e) => { e.preventDefault() }}>
      <div className={s.title}>Two-factor code</div>
      <div className={s.sub}>
        Enter the 6-digit code from your authenticator app.
      </div>

      <CodeInput />

      <Button variant="primary" type="submit" className={s.primaryBtn}>
        <ShieldCheck size={15} strokeWidth={1.75} /> Verify
      </Button>

      <div className={s.swap}>
        Lost your device?
        <button type="button" onClick={onRecovery}>Use a recovery code</button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------
// Recovery codes (shown once at enrollment)
// ---------------------------------------------------------------
function RecoveryList() {
  const codes = [
    '4rk2-8wqc', 'vt3s-b1pn', '9hex-ga7m', '5zbu-lckd',
    'qm6y-ir20', 'nw8t-ocjh', 'fe5k-s3yv', 'ju1p-x4gb',
  ]
  return (
    <div className={s.card}>
      <div className={s.title}>Save these recovery codes</div>
      <div className={s.sub}>
        Store these somewhere safe. If you lose your authenticator, one
        of these codes is how you get back in. Each code works exactly
        once.
      </div>

      <div className={s.recoveryList}>
        {codes.map(c => <div key={c} className={s.recoveryCode}>{c}</div>)}
      </div>

      <div className={s.warning}>
        You won't see these again. Copy them, download them, screenshot
        them — whichever works — before continuing.
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" style={{ flex: 1 }}>
          <Copy size={14} strokeWidth={1.75} /> Copy
        </Button>
        <Button variant="primary" style={{ flex: 1 }}>
          I've saved them
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Recovery code entry
// ---------------------------------------------------------------
function RecoveryEntry({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState('')
  return (
    <form className={s.card} onSubmit={(e) => { e.preventDefault() }}>
      <div className={s.title}>Enter a recovery code</div>
      <div className={s.sub}>
        One of the codes you saved when you set up two-factor. Each code
        works once and can't be reused.
      </div>

      <div className={s.field}>
        <label htmlFor="recovery" className={s.label}>Recovery code</label>
        <input
          id="recovery"
          type="text"
          autoComplete="one-time-code"
          spellCheck={false}
          className={s.input}
          placeholder="xxxx-xxxx"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>

      <Button variant="primary" type="submit" className={s.primaryBtn}>
        <KeyRound size={15} strokeWidth={1.75} /> Use code
      </Button>

      <div className={s.swap}>
        <button type="button" onClick={onBack}>Back to 6-digit code</button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------
function CodeInput() {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  return (
    <div className={s.codeRow}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          className={s.codeInput}
          inputMode="numeric"
          maxLength={1}
          pattern="[0-9]"
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            // Auto-advance on entry; backspace moves left.
            if (e.target.value && i < 5) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
              refs.current[i - 1]?.focus()
            }
          }}
        />
      ))}
    </div>
  )
}

/** Decorative placeholder that reads as a QR code without being one.
 *  Real QR payload is generated server-side at enrollment time.
 *  Pattern is fully deterministic (no Math.random) so the render stays pure. */
function QrPlaceholder() {
  const cells: boolean[] = []
  for (let i = 0; i < 144; i++) {
    const row = Math.floor(i / 12), col = i % 12
    const inCorner =
      (row < 3 && col < 3) ||
      (row < 3 && col > 8) ||
      (row > 8 && col < 3)
    // Deterministic pseudo-noise — ~45% fill, looks QR-ish without being one.
    const noise = ((row * 31 + col * 17) ^ (row << 2) ^ (col << 3)) & 7
    cells.push(inCorner ? (row + col) % 2 === 0 : noise > 3)
  }
  return (
    <div className={s.qrGrid} aria-hidden>
      {cells.map((on, i) => on ? <span key={i} className={s.qrCell} /> : <span key={i} />)}
    </div>
  )
}
