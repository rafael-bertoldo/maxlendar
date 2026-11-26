import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../shared/api/client';
import { listEvents, type CalendarEvent } from '../../shared/api/events';
import {
  CALENDAR_VIEWS,
  formatRangeTitle,
  moveAnchor,
  rangeForView,
  type CalendarView,
} from '../../shared/lib/calendar';
import { Button } from '../../shared/ui/Button';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

type CalendarPageProps = {
  username: string;
  notice: string | null;
  onSignOut: () => Promise<void>;
  onSessionExpired: () => void;
};

export function CalendarPage({ username, notice, onSignOut, onSessionExpired }: CalendarPageProps) {
  const [view, setView] = useState<CalendarView>('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    listEvents(range.from, range.to, controller.signal)
      .then((loadedEvents) => {
        if (!controller.signal.aborted) setEvents(loadedEvents);
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
        {notice ? (
          <p className="calendar-notice" role="status">{notice}</p>
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
        ) : events.length === 0 ? (
          <div className="calendar-status" role="status">
            <span className="empty-mark" aria-hidden="true">◇</span>
            <p>Nenhum evento neste período.</p>
          </div>
        ) : view === 'day' ? (
          <DayView days={range.days} events={events} />
        ) : view === 'week' ? (
          <WeekView days={range.days} events={events} />
        ) : (
          <MonthView anchor={anchor} days={range.days} events={events} />
        )}
      </section>
    </main>
  );
}
