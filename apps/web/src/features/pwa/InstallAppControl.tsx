import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/ui/Button';

type InstallChoice = 'accepted' | 'dismissed';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallChoice; platform: string }>;
};

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function installInstructions(): string[] {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return ['Toque em Compartilhar no Safari.', 'Escolha “Adicionar à Tela de Início”.'];
  }
  if (/Android/i.test(userAgent)) {
    return ['Abra o menu do navegador.', 'Escolha “Instalar app” ou “Adicionar à tela inicial”.'];
  }
  return ['Abra o menu do navegador ou o ícone de instalação na barra de endereço.', 'Escolha “Instalar maxlendar” ou “Adicionar à tela inicial”.'];
}

export function InstallAppControl() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setIsInstalled(isStandalone());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallMessage('maxlendar foi instalado neste dispositivo.');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isInstructionsOpen && !dialog.open) dialog.showModal();
    if (!isInstructionsOpen && dialog.open) dialog.close();
  }, [isInstructionsOpen]);

  if (isInstalled) return null;

  async function handleInstall() {
    setInstallMessage(null);
    if (!deferredPrompt) {
      setIsInstructionsOpen(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') {
      setInstallMessage('Confirme a instalação na janela do navegador.');
    }
  }

  return (
    <>
      <div className="install-control">
        <Button variant="text" onClick={() => void handleInstall()}>
          <span aria-hidden="true">↓</span> Instalar app
        </Button>
        {installMessage ? <span className="install-message" role="status">{installMessage}</span> : null}
      </div>

      <dialog
        className="install-dialog"
        ref={dialogRef}
        aria-labelledby="install-dialog-title"
        onClose={() => setIsInstructionsOpen(false)}
      >
        <div className="install-dialog-content">
          <button
            className="dialog-close"
            type="button"
            aria-label="Fechar instruções de instalação"
            onClick={() => setIsInstructionsOpen(false)}
          >
            ×
          </button>
          <p className="eyebrow">Leve sua agenda com você</p>
          <h2 id="install-dialog-title">Instale o maxlendar</h2>
          <p>A instalação depende do navegador e do dispositivo. Se a opção estiver disponível:</p>
          <ol>
            {installInstructions().map((instruction) => <li key={instruction}>{instruction}</li>)}
          </ol>
          <p className="install-dialog-note">Alguns navegadores podem abrir o site sem oferecer instalação como app.</p>
        </div>
      </dialog>
    </>
  );
}
