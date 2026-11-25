type AuthSuccessProps = {
  username: string;
  outcome: 'created' | 'signed-in';
};

export function AuthSuccess({ username, outcome }: AuthSuccessProps) {
  const isReturningUser = outcome === 'signed-in';

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
      </div>
    </main>
  );
}
