import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type CalendarEvent,
  type RecurrenceScope,
} from '../../shared/api/events';
import {
  formatEventDateTime,
  formatTime,
  isValidDateInput,
  isValidTimeInput,
  parseLocalDateTime,
  toDateInputValue,
  toTimeInputValue,
} from '../../shared/lib/calendar';
import { Button } from '../../shared/ui/Button';
import { TextField } from '../../shared/ui/TextField';

type EventFormProps = {
  open: boolean;
  initialDate: Date;
  event?: CalendarEvent;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: () => void;
  onConflict: () => void;
  onSessionExpired: () => void;
};

type FieldErrors = {
  title?: string;
  date?: string;
  time?: string;
  recurrence?: string;
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function EventForm({
  open,
  initialDate,
  event,
  onClose,
  onSaved,
  onDeleted,
  onConflict,
  onSessionExpired,
}: EventFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => toDateInputValue(initialDate));
  const [time, setTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [byWeekday, setByWeekday] = useState<number[]>([]);
  const [scope, setScope] = useState<RecurrenceScope>('occurrence');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [timeAdjustment, setTimeAdjustment] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => () => requestRef.current?.abort(), []);

  function closeForm() {
    requestRef.current?.abort();
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const startDate = event ? new Date(event.startsAt) : initialDate;
    setTitle(event?.title ?? '');
    setDate(toDateInputValue(startDate));
    setTime(toTimeInputValue(startDate));
    const recurringDays = event?.recurrence?.byWeekday ?? [];
    setIsRecurring(!event && recurringDays.length > 0 ? true : false);
    setByWeekday(recurringDays.length > 0 ? [recurringDays[0]] : [startDate.getDay()]);
    setScope('occurrence');
    setErrors({});
    setFormError(null);
    setTimeAdjustment(null);
    setNeedsReload(false);
    setIsConfirmingDeletion(false);
  }, [open, initialDate, event]);

  function handleRequestError(error: unknown, fallback: string) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof ApiError && error.status === 401) {
      onSessionExpired();
      return;
    }
    if (error instanceof ApiError && error.status === 409 && error.code === 'VERSION_CONFLICT') {
      setFormError('Este evento foi alterado em outro dispositivo. Recarregue a agenda e tente novamente.');
      setNeedsReload(true);
      return;
    }
    if (error instanceof ApiError) {
      if (error.field === 'title') {
        setErrors({ title: error.message });
      }
      if (error.field === 'startsAt') {
        setFormError('Confira a data e o horário informados.');
        return;
      }
      setFormError(
        error.field === 'timeZone'
          ? 'O fuso horário deste dispositivo não pôde ser enviado. Atualize o navegador e tente novamente.'
          : error.message ?? fallback,
      );
    } else {
      setFormError(error instanceof Error ? error.message : fallback);
    }
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (isSubmitting) return;

    const nextErrors: FieldErrors = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      nextErrors.title = 'Informe um título para o evento.';
    } else if (trimmedTitle.length > 120) {
      nextErrors.title = 'O título deve ter no máximo 120 caracteres.';
    }

    const hasValidDate = isValidDateInput(date);
    const hasValidTime = isValidTimeInput(time);
    const parsed = hasValidDate && hasValidTime ? parseLocalDateTime(date, time) : null;
    if (!hasValidDate) {
      nextErrors.date = 'Escolha uma data válida.';
    }
    if (!hasValidTime) {
      nextErrors.time = 'Informe um horário válido.';
    }
    if (!event && isRecurring && byWeekday.length === 0) {
      nextErrors.recurrence = 'Selecione um dia da semana.';
    }

    setErrors(nextErrors);
    if (!parsed || nextErrors.title || nextErrors.recurrence) return;

    setFormError(null);
    setNeedsReload(false);
    setTimeAdjustment(
      parsed.adjusted
        ? `Este horário foi ajustado para ${formatTime(parsed.date.toISOString())} no fuso do seu dispositivo.`
        : null,
    );
    setIsSubmitting(true);
    const controller = new AbortController();
    requestRef.current = controller;

    const input = {
      title: trimmedTitle,
      startsAt: parsed.date.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const recurrence = !event && isRecurring ? { frequency: 'weekly' as const, byWeekday } : undefined;

    try {
      const savedEvent = event
        ? await updateEvent(
            event.id,
            { ...input, version: event.version, ...(canEditScope ? { scope } : {}) },
            controller.signal,
          )
        : await createEvent({ ...input, ...(recurrence ? { recurrence } : {}) }, controller.signal);
      onSaved(savedEvent);
    } catch (error) {
      handleRequestError(error, event ? 'Não foi possível alterar o evento.' : 'Não foi possível salvar o evento.');
    } finally {
      requestRef.current = null;
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!event || isSubmitting) return;

    setFormError(null);
    setNeedsReload(false);
    setIsSubmitting(true);
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      await deleteEvent(event.id, event.version, controller.signal, canEditScope ? scope : undefined);
      onDeleted();
    } catch (error) {
      handleRequestError(error, 'Não foi possível excluir o evento.');
    } finally {
      requestRef.current = null;
      setIsSubmitting(false);
    }
  }

  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canEditScope = Boolean(event && (event.source === 'recurring' || event.isException));
  const scopeLabel = scope === 'series' ? 'toda a série' : 'apenas esta ocorrência';

  function selectWeekday(day: number) {
    setByWeekday([day]);
    setErrors((current) => ({ ...current, recurrence: undefined }));
  }

  return (
    <dialog
      className="event-dialog"
      ref={dialogRef}
      onCancel={(cancelEvent) => {
        cancelEvent.preventDefault();
        closeForm();
      }}
    >
      <div className="event-dialog-content">
        <button className="dialog-close" type="button" aria-label="Fechar formulário" onClick={closeForm}>
          ×
        </button>

        {isConfirmingDeletion && event ? (
          <>
            <p className="eyebrow">Excluir evento</p>
            <h2>Remover este evento?</h2>
            <p className="event-dialog-subtitle">
              <strong>{event.title}</strong> — {formatEventDateTime(event.startsAt)} no fuso {viewerTimeZone}.
              Esta ação vai excluir {scopeLabel} e não pode ser desfeita.
            </p>
            {canEditScope ? (
              <fieldset className="scope-fieldset">
                <legend>Aplicar exclusão em</legend>
                <label className="scope-option">
                  <input
                    type="radio"
                    name="delete-scope"
                    checked={scope === 'occurrence'}
                    onChange={() => setScope('occurrence')}
                    disabled={isSubmitting}
                  />
                  Apenas esta ocorrência
                </label>
                <label className="scope-option">
                  <input
                    type="radio"
                    name="delete-scope"
                    checked={scope === 'series'}
                    onChange={() => setScope('series')}
                    disabled={isSubmitting}
                  />
                  Toda a série
                </label>
              </fieldset>
            ) : null}
            <div className="delete-actions">
              <Button variant="secondary" onClick={() => setIsConfirmingDeletion(false)} disabled={isSubmitting}>
                Voltar
              </Button>
              <Button variant="danger" onClick={() => void handleDelete()} disabled={isSubmitting}>
                {isSubmitting ? 'Excluindo…' : 'Excluir evento'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">{event ? 'Editar evento' : 'Novo evento'}</p>
            <h2>{event ? 'Ajustar este evento' : 'O que você planejou?'}</h2>
            <p className="event-dialog-subtitle">
              {event
                ? `O evento foi salvo em ${event.timeZone}. Os campos abaixo usam o fuso deste dispositivo; ao salvar, ele passa a ser a referência.`
                : 'Informe a data e a hora no fuso deste dispositivo. O evento será salvo como um horário fixo.'}
            </p>

            {timeAdjustment ? <p className="notice notice-warning" role="status">{timeAdjustment}</p> : null}

            <form className="event-form" onSubmit={(submitEvent) => void handleSubmit(submitEvent)} noValidate>
              <TextField
                id="event-title"
                label="Título"
                name="title"
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setErrors((current) => ({ ...current, title: undefined }));
                }}
                placeholder="Ex.: Dentista"
                error={errors.title}
                required
              />
              <div className="event-form-row">
                <TextField
                  id="event-date"
                  label="Data"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(value) => {
                    setDate(value);
                    setErrors((current) => ({ ...current, date: undefined }));
                  }}
                  error={errors.date}
                  required
                />
                <TextField
                  id="event-time"
                  label="Horário"
                  name="time"
                  type="time"
                  value={time}
                  onChange={(value) => {
                    setTime(value);
                    setErrors((current) => ({ ...current, time: undefined }));
                  }}
                  error={errors.time}
                  required
                />
              </div>
              {!event ? (
                <div className="recurrence-control">
                  <label className="recurrence-toggle">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(changeEvent) => {
                        setIsRecurring(changeEvent.target.checked);
                        setErrors((current) => ({ ...current, recurrence: undefined }));
                      }}
                    />
                    Repetir semanalmente
                  </label>
                  {isRecurring ? (
                    <fieldset className="weekday-fieldset">
                      <legend>Dia da semana</legend>
                      <div className="weekday-options">
                        {WEEKDAY_LABELS.map((label, index) => (
                          <label className="weekday-option" key={label}>
                            <input
                              type="radio"
                              name="recurrence-weekday"
                              checked={byWeekday[0] === index}
                              onChange={() => selectWeekday(index)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      {errors.recurrence ? <span className="field-error">{errors.recurrence}</span> : null}
                    </fieldset>
                  ) : null}
                </div>
              ) : null}
              {canEditScope ? (
                <fieldset className="scope-fieldset">
                  <legend>Aplicar alterações em</legend>
                  <label className="scope-option">
                    <input
                      type="radio"
                      name="edit-scope"
                      checked={scope === 'occurrence'}
                      onChange={() => setScope('occurrence')}
                      disabled={isSubmitting}
                    />
                    Apenas esta ocorrência
                  </label>
                  <label className="scope-option">
                    <input
                      type="radio"
                      name="edit-scope"
                      checked={scope === 'series'}
                      onChange={() => setScope('series')}
                      disabled={isSubmitting}
                    />
                    Toda a série
                  </label>
                </fieldset>
              ) : null}
              <Button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : event ? 'Salvar alterações' : 'Salvar evento'}
              </Button>
            </form>

            {event ? (
              <div className="form-secondary-actions">
                <Button variant="text" onClick={() => setIsConfirmingDeletion(true)} disabled={isSubmitting}>
                  Excluir evento
                </Button>
              </div>
            ) : null}
          </>
        )}

        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        {needsReload ? (
          <Button variant="secondary" onClick={onConflict}>
            Recarregar agenda
          </Button>
        ) : null}
      </div>
    </dialog>
  );
}
