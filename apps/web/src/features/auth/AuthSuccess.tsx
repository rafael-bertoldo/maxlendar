import { useState } from 'react';
import { Button } from '../../shared/ui/Button';

type AuthSuccessProps = {
  username: string;
  outcome: 'created' | 'signed-in';
  onSignOut: () => Promise<void>;
};

export function AuthSuccess({ username, outcome, onSignOut }: AuthSuccessProps) {
  const isReturningUser = outcome === 'signed-in';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await onSignOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Não foi possível sair da conta.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <main className="success-layout">
      <div className="auth-card success-card" role="status">
        <div className="success-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">{isReturningUser ? 'Bem-vindo de volta' : 'Tudo pronto'}</p>
        <h1>{isReturningUser ? 'Você entrou na sua agenda.' : 'Sua agenda está pronta.'}</h1>
        <p className="auth-subtitle">
          {isReturningUser ? 'Sessão iniciada como' : 'Conta criada para'}{' '}
          <strong>{username}</strong>. Sua agenda está pronta para uso.
        </p>
        {signOutError ? <p className="form-error" role="alert">{signOutError}</p> : null}
        <Button
          variant="secondary"
          className="signout-button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Saindo…' : 'Sair deste dispositivo'}
        </Button>
      </div>
    </main>
  );
}
