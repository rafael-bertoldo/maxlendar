type AuthSuccessProps = {
  username: string;
};

export function AuthSuccess({ username }: AuthSuccessProps) {
  return (
    <main className="success-layout">
      <div className="auth-card success-card" role="status">
        <div className="success-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">Tudo pronto</p>
        <h1>Sua agenda está pronta.</h1>
        <p className="auth-subtitle">
          Você entrou como <strong>{username}</strong>. Sua agenda já pode ser usada.
        </p>
      </div>
    </main>
  );
}
