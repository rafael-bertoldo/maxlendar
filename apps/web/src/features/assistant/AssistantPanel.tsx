import { useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import {
  interpretRequest,
  type AssistantResult,
} from '../../shared/api/assistant';
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type CalendarEvent,
  type RecurrenceScope,
} from '../../shared/api/events';
import { Button } from '../../shared/ui/Button';

type AssistantPanelProps = {
  timeZone: string;
  onApplied: (event: CalendarEvent) => void;
  onDeleted: () => void;
  onSessionExpired: () => void;
  onReload: () => void;
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function formatRecurrence(byWeekday: number[] | undefined): string | null {
  if (!byWeekday || byWeekday.length === 0) return null;
  const labels = [...byWeekday].sort((a, b) => a - b).map((day) => WEEKDAY_LABELS[day] ?? String(day));
  return `Recorrência: toda ${labels[0]}`;
}

function needsScope(result: AssistantResult | null): result is Extract<AssistantResult, { kind: 'edit' | 'delete' }> {
  if (!result || (result.kind !== 'edit' && result.kind !== 'delete')) return false;
  return result.target.source === 'recurring' || Boolean(result.target.isException);
}

function describeResult(result: AssistantResult, timeZone: string) {
  if (result.kind === 'create') {
    const details = [`${result.draft.title} — ${formatWhen(result.draft.startsAt, timeZone)}`];
    const recurrence = formatRecurrence(result.draft.recurrence?.byWeekday);
    if (recurrence) details.push(recurrence);
    return {
      title: 'Rascunho de evento',
      details,
      confirmLabel: 'Confirmar criação',
      confirmable: true,
    };
  }
  if (result.kind === 'answer') {
    return {
      title: 'Resposta da agenda',
      details: [result.answer, `Baseado em ${result.evidence.length} evento(s) salvo(s).`],
      confirmLabel: '',
      confirmable: false,
    };
  }
  if (result.kind === 'edit') {
    const details = [`Alvo: ${result.target.title} — ${formatWhen(result.target.startsAt, timeZone)}`];
    const recurrence = formatRecurrence(result.target.recurrence?.byWeekday);
    if (recurrence) details.push(recurrence);
    if (result.changes.title) details.push(`Novo título: ${result.changes.title}`);
    if (result.changes.startsAt) details.push(`Novo horário: ${formatWhen(result.changes.startsAt, timeZone)}`);
    if (result.changes.recurrence?.byWeekday) {
      const nextRecurrence = formatRecurrence(result.changes.recurrence.byWeekday);
      if (nextRecurrence) details.push(`Nova ${nextRecurrence.toLowerCase()}`);
    }
    return {
      title: 'Proposta de alteração',
      details,
      confirmLabel: 'Confirmar alteração',
      confirmable: true,
    };
  }
  if (result.kind === 'delete') {
    const details = [`Alvo: ${result.target.title} — ${formatWhen(result.target.startsAt, timeZone)}`];
    const recurrence = formatRecurrence(result.target.recurrence?.byWeekday);
    if (recurrence) details.push(recurrence);
    return {
      title: 'Proposta de exclusão',
      details,
      confirmLabel: 'Confirmar exclusão',
      confirmable: true,
    };
  }
  return {
    title: 'Preciso de mais detalhes',
    details: [result.message],
    confirmLabel: '',
    confirmable: false,
  };
}

export function AssistantPanel({ timeZone, onApplied, onDeleted, onSessionExpired, onReload }: AssistantPanelProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [scope, setScope] = useState<RecurrenceScope>('occurrence');
  const [error, setError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  async function handleInterpret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || isInterpreting) return;
    setIsInterpreting(true);
    setError(null);
    setHasConflict(false);
    setNotice(null);
    setResult(null);
    setScope('occurrence');
    try {
      setResult(await interpretRequest(text, timeZone));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        onSessionExpired();
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Não foi possível interpretar o pedido.');
    } finally {
      setIsInterpreting(false);
    }
  }

  async function handleConfirm() {
    if (!result || isApplying) return;
    if (result.kind === 'answer' || result.kind === 'clarification') return;

    setIsApplying(true);
    setError(null);
    setHasConflict(false);
    try {
      if (result.kind === 'create') {
        onApplied(await createEvent(result.draft));
      } else if (result.kind === 'edit') {
        onApplied(await updateEvent(result.target.id, {
          title: result.changes.title ?? result.target.title,
          startsAt: result.changes.startsAt ?? result.target.startsAt,
          timeZone: result.changes.timeZone ?? result.target.timeZone,
          version: result.target.version,
          ...(needsScope(result) ? { scope } : {}),
        }));
      } else {
        await deleteEvent(result.target.id, result.target.version, undefined, needsScope(result) ? scope : undefined);
        onDeleted();
      }
      setResult(null);
      setText('');
      setScope('occurrence');
      setNotice('Alteração aplicada à sua agenda.');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        onSessionExpired();
        return;
      }
      if (caught instanceof ApiError && caught.code === 'VERSION_CONFLICT') {
        setError('Outro dispositivo alterou este evento. Recarregue a agenda e tente novamente.');
        setHasConflict(true);
      } else {
        setError(caught instanceof Error ? caught.message : 'Não foi possível aplicar a alteração.');
      }
    } finally {
      setIsApplying(false);
    }
  }

  function handleReject() {
    setResult(null);
    setScope('occurrence');
    setNotice('Proposta rejeitada. Nada foi alterado.');
  }

  const view = result ? describeResult(result, timeZone) : null;

  return (
    <section className="assistant-panel" aria-labelledby="assistant-title">
      <div className="assistant-heading">
        <span className="assistant-mark" aria-hidden="true">IA</span>
        <div>
          <h2 id="assistant-title">Assistente da agenda</h2>
          <p>Descreva o que você quer em linguagem natural. Você revisa antes de qualquer mudança.</p>
        </div>
      </div>

      <form className="assistant-form" onSubmit={(event) => void handleInterpret(event)}>
        <label htmlFor="assistant-input">Pedido para o assistente</label>
        <textarea
          id="assistant-input"
          value={text}
          maxLength={500}
          rows={2}
          placeholder="Ex.: Buscar o Thor toda quinta às 10"
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" disabled={!text.trim() || isInterpreting}>
          {isInterpreting ? 'Interpretando…' : 'Interpretar'}
        </Button>
      </form>

      {error ? (
        <div className="assistant-error">
          <p className="form-error" role="alert">{error}</p>
          {hasConflict ? (
            <Button variant="secondary" onClick={onReload}>
              Recarregar agenda
            </Button>
          ) : null}
        </div>
      ) : null}
      {notice ? <p className="calendar-notice" role="status">{notice}</p> : null}

      {view ? (
        <div className={`assistant-result assistant-result-${result?.kind}`}>
          <h3>{view.title}</h3>
          {view.details.map((detail) => <p key={detail}>{detail}</p>)}
          {needsScope(result) ? (
            <fieldset className="scope-fieldset assistant-scope">
              <legend>Aplicar em</legend>
              <label className="scope-option">
                <input
                  type="radio"
                  name="assistant-scope"
                  checked={scope === 'occurrence'}
                  onChange={() => setScope('occurrence')}
                  disabled={isApplying}
                />
                Apenas esta ocorrência
              </label>
              <label className="scope-option">
                <input
                  type="radio"
                  name="assistant-scope"
                  checked={scope === 'series'}
                  onChange={() => setScope('series')}
                  disabled={isApplying}
                />
                Toda a série
              </label>
            </fieldset>
          ) : null}
          {view.confirmable ? (
            <div className="assistant-actions">
              <Button onClick={() => void handleConfirm()} disabled={isApplying}>
                {isApplying ? 'Aplicando…' : view.confirmLabel}
              </Button>
              <Button variant="secondary" onClick={handleReject} disabled={isApplying}>
                Rejeitar
              </Button>
            </div>
          ) : (
            <div className="assistant-actions">
              <Button variant="secondary" onClick={() => { setResult(null); setScope('occurrence'); }}>
                Limpar
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <p className="assistant-limits">
        O assistente entende frases simples em português e nunca salva, altera ou exclui sem sua confirmação.
        Se algo ficar ambíguo, ele pede mais detalhes.
      </p>
    </section>
  );
}
