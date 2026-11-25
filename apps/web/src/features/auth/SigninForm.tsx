import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/ui/Button';
import { TextField } from '../../shared/ui/TextField';

type SigninFormProps = {
  initialUsername: string;
  onBack: () => void;
  onSignup: () => void;
  onSignedIn: (username: string) => void;
};

export function SigninForm({ initialUsername, onBack, onSignup, onSignedIn }: SigninFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Informe seu nome de usuário e sua senha para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        user?: { id: string; username: string };
        code?: string;
        message?: string;
      };
      if (!response.ok) {
        if (response.status === 401 || body.code === 'INVALID_CREDENTIALS') {
          setError('Nome de usuário ou senha incorretos. Confira os dados e tente novamente.');
        } else {
          setError(body.message ?? 'Não foi possível entrar. Confira seus dados e tente novamente.');
        }
        return;
      }

      onSignedIn(body.user?.username ?? username);
    } catch {
      setError('Não foi possível conectar ao maxlendar. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className="back-link" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Voltar
      </button>
      <div className="auth-heading">
        <p className="eyebrow">Que bom ter você de volta</p>
        <h2 id="auth-title">Entre na sua agenda</h2>
        <p className="auth-subtitle">Seus planos estão onde você os deixou.</p>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <TextField
          id="signin-username"
          label="Nome de usuário"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={setUsername}
          placeholder="Seu nome de usuário"
          required
        />
        <TextField
          id="signin-password"
          label="Senha"
          name="current-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder="Sua senha"
          required
        />
        <Button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
          {!isSubmitting ? <span aria-hidden="true">↗</span> : null}
        </Button>
      </form>

      <p className="auth-switch">
        Ainda não tem uma conta?{' '}
        <button className="link-button" type="button" onClick={onSignup}>
          Criar conta
        </button>
      </p>
    </>
  );
}
