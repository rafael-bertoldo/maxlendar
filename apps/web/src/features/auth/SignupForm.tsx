import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/ui/Button';
import { TextField } from '../../shared/ui/TextField';

type SignupFormProps = {
  onCreated: (username: string) => void;
  onSignin: (username: string) => void;
};

export function SignupForm({ onCreated, onSignin }: SignupFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUsernameTaken(false);

    if (!username.trim() || !password) {
      setError('Informe um nome de usuário e uma senha para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/signup', {
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

      if (response.status === 409 && body.code === 'USERNAME_TAKEN') {
        setUsernameTaken(true);
        return;
      }

      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar sua conta. Tente novamente.');
        return;
      }

      onCreated(body.user?.username ?? username);
    } catch {
      setError('Não foi possível conectar ao maxlendar. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-heading">
        <p className="eyebrow">Um novo começo</p>
        <h2 id="auth-title">Crie sua agenda</h2>
        <p className="auth-subtitle">Comece com um nome de usuário. Sem email.</p>
      </div>

      {usernameTaken ? (
        <div className="notice notice-warning" role="alert">
          <span className="notice-icon" aria-hidden="true">!</span>
          <div className="notice-content">
            <strong>Esse nome de usuário já está em uso.</strong>
            <span>Acesse essa agenda ou escolha outro nome de usuário.</span>
            <div className="notice-actions">
              <Button variant="secondary" onClick={() => onSignin(username)}>
                Entrar como {username}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setUsername('');
                  setPassword('');
                  setUsernameTaken(false);
                }}
              >
                Tentar outro nome
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <TextField
          id="signup-username"
          label="Nome de usuário"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(value) => {
            setUsername(value);
            setUsernameTaken(false);
          }}
          placeholder="Escolha um nome de usuário"
          required
        />

        <TextField
          id="signup-password"
          label="Senha"
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          placeholder="Crie uma senha"
          required
          helperText="Escolha uma senha que você consiga lembrar."
        />

        <Button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Criando sua agenda…' : 'Criar conta'}
          {!isSubmitting ? <span aria-hidden="true">↗</span> : null}
        </Button>
      </form>

      <p className="auth-switch">
        Já tem uma agenda?{' '}
        <button className="link-button" type="button" onClick={() => onSignin(username)}>
          Entrar
        </button>
      </p>
    </>
  );
}
