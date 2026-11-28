import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../shared/api/client';
import { listEvents, type CalendarEvent } from '../../shared/api/events';
import {
  blockedPushStatus,
  enablePush,
  pushIsSupported,
  readPushStatus,
  unsupportedPushStatus,
  type PushStatus,
} from '../../shared/api/push';
import { EventForm } from '../events/EventForm';
import {
  CALENDAR_VIEWS,
  formatRangeTitle,
  moveAnchor,
  rangeForView,
  type CalendarView,
} from '../../shared/lib/calendar';
import { Button } from '../../shared/ui/Button';
import { DayView } from './DayView';
import { EmptyCalendarState } from './EmptyCalendarState';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

type CalendarPageProps = {
  username: string;
  notice: string | null;
  onSignOut: () => Promise<void>;
  onSessionExpired: () => void;
};

export function CalendarPage({ username, notice, onSignOut, onSessionExpired }: CalendarPageProps) {
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [view, setView] = useState<CalendarView>('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const lastSyncRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading((current) => current || !hasLoadedRef.current);
    setLoadError(null);

    listEvents(range.from, range.to, controller.signal)
      .then((loadedEvents) => {
        if (!controller.signal.aborted) {
          hasLoadedRef.current = true;
          setEvents(loadedEvents);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired();
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar seus eventos.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [range.from, range.to, reloadCount, onSessionExpired]);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    let active = true;

    function applyStatus(status: PushStatus) {
      if (active) setPushStatus(status);
    }

    void readPushStatus().then(applyStatus).catch(() => {
      applyStatus({
        kind: 'inactive',
        message: 'Não foi possível consultar o estado dos lembretes neste dispositivo.',
      });
    });

    function checkPermission() {
      if (!pushIsSupported()) {
        applyStatus(unsupportedPushStatus());
        return;
      }
      if (Notification.permission === 'denied') {
        applyStatus(blockedPushStatus());
        return;
      }
      void readPushStatus().then(applyStatus).catch(() => undefined);
    }

    window.addEventListener('focus', checkPermission);
    document.addEventListener('visibilitychange', checkPermission);
    return () => {
      active = false;
      window.removeEventListener('focus', checkPermission);
      document.removeEventListener('visibilitychange', checkPermission);
    };
  }, []);

  useEffect(() => {
    function syncOnFocus() {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastSyncRef.current < 1000) return;
      lastSyncRef.current = now;
      setReloadCount((count) => count + 1);
    }

    window.addEventListener('focus', syncOnFocus);
    document.addEventListener('visibilitychange', syncOnFocus);
    return () => {
      window.removeEventListener('focus', syncOnFocus);
      document.removeEventListener('visibilitychange', syncOnFocus);
    };
  }, []);

  function openCreateForm() {
    setEditingEvent(null);
    setIsEventFormOpen(true);
  }

  function openEditForm(event: CalendarEvent) {
    setEditingEvent(event);
    setIsEventFormOpen(true);
  }

  function handleEventSaved(event: CalendarEvent) {
    const wasEditing = editingEvent !== null;
    setIsEventFormOpen(false);
    setEditingEvent(null);
    setSavedNotice(wasEditing ? 'Alterações salvas na sua agenda.' : 'Evento salvo na sua agenda.');
    if (!wasEditing) setView('day');
    setAnchor(new Date(event.startsAt));
    setReloadCount((count) => count + 1);
  }

  function handleEventDeleted() {
    setIsEventFormOpen(false);
    setEditingEvent(null);
    setSavedNotice('Evento excluído da sua agenda.');
    setReloadCount((count) => count + 1);
  }

  function handleVersionConflict() {
    setIsEventFormOpen(false);
    setEditingEvent(null);
    setSavedNotice('Agenda recarregada. Confira a versão mais recente do evento.');
    setReloadCount((count) => count + 1);
  }

  async function handleEnablePush() {
    setIsEnablingPush(true);
    setPushError(null);
    try {
      const status = await enablePush();
      setPushStatus(status);
      if (status.kind === 'unavailable' || status.kind === 'blocked' || status.kind === 'unsupported') {
        setPushError(status.message);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }
      setPushError(error instanceof Error ? error.message : 'Não foi possível ativar os lembretes.');
    } finally {
      setIsEnablingPush(false);
    }
  }

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
    <main className="calendar-layout">
      <header className="calendar-topbar">
        <div className="calendar-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>maxlendar</span>
        </div>
        <div className="calendar-account">
          <span className="account-avatar" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
          <span className="account-name">{username}</span>
          <Button variant="secondary" onClick={() => void handleSignOut()} disabled={isSigningOut}>
            {isSigningOut ? 'Saindo…' : 'Sair'}
          </Button>
        </div>
      </header>

      <section className="calendar-intro">
        <p className="eyebrow">Sua agenda</p>
        <h1>O que está previsto?</h1>
        {notice || savedNotice ? (
          <p className="calendar-notice" role="status">{savedNotice ?? notice}</p>
        ) : null}
        {signOutError ? <p className="form-error" role="alert">{signOutError}</p> : null}
      </section>

      <section className="calendar-panel" aria-label="Calendário">
        <div className="calendar-toolbar">
          <div className="view-switcher" role="group" aria-label="Visualização do calendário">
            {CALENDAR_VIEWS.map((option) => (
              <button
                className={view === option.id ? 'view-button is-active' : 'view-button'}
                type="button"
                key={option.id}
                aria-pressed={view === option.id}
                onClick={() => setView(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="range-navigation">
            <button
              className="range-arrow"
              type="button"
              aria-label="Período anterior"
              onClick={() => setAnchor(moveAnchor(view, anchor, -1))}
            >
              ‹
            </button>
            <h2 aria-live="polite">{formatRangeTitle(view, anchor, range.days)}</h2>
            <button
              className="range-arrow"
              type="button"
              aria-label="Próximo período"
              onClick={() => setAnchor(moveAnchor(view, anchor, 1))}
            >
              ›
            </button>
            <Button variant="secondary" onClick={() => setAnchor(new Date())}>
              Hoje
            </Button>
          </div>

          <Button className="new-event-button" onClick={openCreateForm}>
            Novo evento
          </Button>
        </div>

        <p className="calendar-timezone">
          Horários exibidos no fuso deste dispositivo: <strong>{viewerTimeZone}</strong>.
          <span className="calendar-sync-note">
            {' '}A agenda atualiza ao abrir ou voltar a esta aba; abas em segundo plano podem ficar desatualizadas.
          </span>
        </p>

        <div className="push-row">
          <Button
            variant="secondary"
            onClick={() => void handleEnablePush()}
            disabled={
              isEnablingPush ||
              pushStatus?.kind === 'active' ||
              pushStatus?.kind === 'unsupported' ||
              pushStatus?.kind === 'blocked'
            }
          >
            {isEnablingPush
              ? 'Ativando…'
              : pushStatus?.kind === 'active'
                ? 'Lembretes ativos'
                : 'Ativar lembretes'}
          </Button>
          <p
            className={pushError || pushStatus?.kind === 'blocked' ? 'push-status is-warning' : 'push-status'}
            role={pushError || pushStatus?.kind === 'blocked' ? 'alert' : 'status'}
          >
            {pushError ?? pushStatus?.message ?? 'Consultando disponibilidade dos lembretes…'}
          </p>
        </div>

        {loadError ? (
          <div className="calendar-status" role="alert">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={() => setReloadCount((count) => count + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : isLoading ? (
          <div className="calendar-status" aria-busy="true" aria-live="polite">
            <span className="loading-indicator" aria-hidden="true" />
            <p>Carregando seus eventos…</p>
          </div>
        ) : (
          <>
            {events.length === 0 ? (
              <EmptyCalendarState onCreate={openCreateForm} />
            ) : null}
            {view === 'day' ? (
              <DayView days={range.days} events={events} onEdit={openEditForm} />
            ) : view === 'week' ? (
              <WeekView days={range.days} events={events} onEdit={openEditForm} />
            ) : (
              <MonthView anchor={anchor} days={range.days} events={events} onEdit={openEditForm} />
            )}
          </>
        )}
      </section>

      <EventForm
        open={isEventFormOpen}
        initialDate={anchor}
        event={editingEvent ?? undefined}
        onClose={() => {
          setIsEventFormOpen(false);
          setEditingEvent(null);
        }}
        onSaved={handleEventSaved}
        onDeleted={handleEventDeleted}
        onConflict={handleVersionConflict}
        onSessionExpired={onSessionExpired}
      />
    </main>
  );
}
