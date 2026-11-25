import { useState } from 'react';
import { SignupForm } from '../features/auth/SignupForm';
import { SigninForm } from '../features/auth/SigninForm';
import { AuthSuccess } from '../features/auth/AuthSuccess';

type AuthMode = 'signup' | 'signin';
type AuthOutcome = 'created' | 'signed-in';

export function App() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [authenticatedUsername, setAuthenticatedUsername] = useState<string | null>(null);
  const [authOutcome, setAuthOutcome] = useState<AuthOutcome>('created');
  const [signinUsername, setSigninUsername] = useState('');

  if (authenticatedUsername) {
    return <AuthSuccess username={authenticatedUsername} outcome={authOutcome} />;
  }

  return (
    <main className="auth-layout">
      <section className="auth-aside" aria-label="Sobre o maxlendar">
        <a className="brand" href="/" aria-label="Página inicial do maxlendar">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>maxlendar</span>
        </a>

        <div className="aside-copy">
          <p className="eyebrow">Abra espaço para o que importa</p>
          <h1>Seu tempo,<br />à vista.</h1>
          <p className="aside-description">
            Um lugar simples para os momentos que você não quer perder.
          </p>
        </div>

        <div className="aside-footnote">
          <span className="status-dot" aria-hidden="true" />
          <span>Uma agenda, onde você estiver.</span>
        </div>
        <div className="aside-orb aside-orb-one" aria-hidden="true" />
        <div className="aside-orb aside-orb-two" aria-hidden="true" />
      </section>

      <section className="auth-main" aria-labelledby="auth-title">
        <div className="mobile-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>maxlendar</span>
        </div>

        <div className="auth-card">
          {mode === 'signup' ? (
            <SignupForm
              onCreated={(username) => {
                setAuthOutcome('created');
                setAuthenticatedUsername(username);
              }}
              onSignin={(username) => {
                setSigninUsername(username);
                setMode('signin');
              }}
            />
          ) : (
            <SigninForm
              initialUsername={signinUsername}
              onBack={() => setMode('signup')}
              onSignup={() => setMode('signup')}
              onSignedIn={(username) => {
                setAuthOutcome('signed-in');
                setAuthenticatedUsername(username);
              }}
            />
          )}
        </div>

        <p className="auth-privacy">
          Sua agenda fica sincronizada entre seus dispositivos.
        </p>
      </section>
    </main>
  );
}
