import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../shared/api/client';
import { createEvent, type CalendarEvent } from '../../shared/api/events';
import {
  formatTime,
  isValidDateInput,
  isValidTimeInput,
  parseLocalDateTime,
  toDateInputValue,
} from '../../shared/lib/calendar';
import { Button } from '../../shared/ui/Button';
import { TextField } from '../../shared/ui/TextField';

type EventFormProps = {
  open: boolean;
  initialDate: Date;
  onClose: () => void;
  onCreated: (event: CalendarEvent) => void;
  onSessionExpired: () => void;
};

type FieldErrors = {
  title?: string;
  date?: string;
  time?: string;
};

export function EventForm({ open, initialDate, onClose, onCreated, onSessionExpired }: EventFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => toDateInputValue(initialDate));
  const [time, setTime] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [timeAdjustment, setTimeAdjustment] = useState<string | null>(null);
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
    setTitle('');
    setDate(toDateInputValue(initialDate));
    setTime('');
    setErrors({});
    setFormError(null);
    setTimeAdjustment(null);
  }, [open, initialDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    setErrors(nextErrors);
    if (!parsed || nextErrors.title) return;

    setFormError(null);
    setTimeAdjustment(
      parsed.adjusted
        ? `Este horário foi ajustado para ${formatTime(parsed.date.toISOString())} no fuso do seu dispositivo.`
        : null,
    );
    setIsSubmitting(true);
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const savedEvent = await createEvent(
        {
          title: trimmedTitle,
          startsAt: parsed.date.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        controller.signal,
      );
      onCreated(savedEvent);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }
      if (error instanceof ApiError) {
        if (error.field === 'title') {
          setErrors({ title: error.message });
        }
        if (error.field === 'startsAt') {
          setErrors({ date: 'Confira a data informada.', time: 'Confira o horário informado.' });
        }
        setFormError(
          error.field === 'timeZone'
            ? 'O fuso horário deste dispositivo não pôde ser enviado. Atualize o navegador e tente novamente.'
            : error.message ?? 'Não foi possível salvar o evento.',
        );
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o evento.');
      }
    } finally {
      requestRef.current = null;
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      className="event-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        closeForm();
      }}
    >
      <div className="event-dialog-content">
        <button className="dialog-close" type="button" aria-label="Fechar formulário" onClick={closeForm}>
          ×
        </button>
        <p className="eyebrow">Novo evento</p>
        <h2>O que você planejou?</h2>
        <p className="event-dialog-subtitle">
          Informe a data e a hora no fuso deste dispositivo. O evento será salvo como um horário fixo.
        </p>

        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        {timeAdjustment ? <p className="notice notice-warning" role="status">{timeAdjustment}</p> : null}

        <form className="event-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
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
          <Button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar evento'}
          </Button>
        </form>
      </div>
    </dialog>
  );
}
