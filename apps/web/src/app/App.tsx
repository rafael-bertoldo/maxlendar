import { useCallback, useEffect, useState } from 'react';
import { SignupForm } from '../features/auth/SignupForm';
import { SigninForm } from '../features/auth/SigninForm';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { InstallAppControl } from '../features/pwa/InstallAppControl';

type AuthMode = 'signup' | 'signin';
type AuthOutcome = 'created' | 'signed-in';

export function App() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [authenticatedUsername, setAuthenticatedUsername] = useState<string | null>(null);
  const [signinUsername, setSigninUsername] = useState('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionCheckError, setSessionCheckError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (response.ok) {
          const body = (await response.json()) as { user?: { username: string } };
          if (body.user?.username) {
            setAuthenticatedUsername(body.user.username);
            setAuthNotice('Você entrou na sua agenda.');
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setSessionCheckError('Não foi possível verificar sua sessão. Entre novamente para continuar.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingSession(false);
        }
      }
    }

    void restoreSession();
    return () => controller.abort();
  }, []);

  function handleAuthenticated(username: string, outcome: AuthOutcome) {
    setAuthenticatedUsername(username);
    setAuthNotice(outcome === 'created' ? 'Conta criada. Sua agenda está pronta.' : 'Você entrou na sua agenda.');
    setSessionCheckError(null);
    setIsCheckingSession(false);
  }

  const handleSessionExpired = useCallback(() => {
    setSigninUsername(authenticatedUsername ?? '');
    setAuthenticatedUsername(null);
    setAuthNotice(null);
    setSessionCheckError('Sua sessão foi encerrada. Entre novamente para continuar.');
    setMode('signin');
  }, [authenticatedUsername]);

  async function handleSignOut() {
    if (!authenticatedUsername) return;

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Sign out failed');
      }

      setSigninUsername(authenticatedUsername);
      setMode('signin');
      setAuthenticatedUsername(null);
      setAuthNotice(null);
    } catch {
      throw new Error('Não foi possível sair da conta. Tente novamente.');
    }
  }

  if (isCheckingSession) {
    return (
      <main className="success-layout" aria-busy="true" aria-live="polite">
        <div className="auth-card success-card session-loading">
          <div className="loading-indicator" aria-hidden="true" />
          <p className="auth-subtitle">Verificando sua sessão…</p>
        </div>
        <InstallAppControl />
      </main>
    );
  }

  if (authenticatedUsername) {
    return (
      <>
        <CalendarPage
          username={authenticatedUsername}
          notice={authNotice}
          onSignOut={handleSignOut}
          onSessionExpired={handleSessionExpired}
        />
        <InstallAppControl />
      </>
    );
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
          {sessionCheckError ? <p className="form-error" role="alert">{sessionCheckError}</p> : null}
          {mode === 'signup' ? (
            <SignupForm
              onCreated={(username) => handleAuthenticated(username, 'created')}
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
              onSignedIn={(username) => handleAuthenticated(username, 'signed-in')}
            />
          )}
        </div>

        <p className="auth-privacy">
          Sua agenda fica sincronizada entre seus dispositivos.
        </p>
        <InstallAppControl />
      </section>
    </main>
  );
}
