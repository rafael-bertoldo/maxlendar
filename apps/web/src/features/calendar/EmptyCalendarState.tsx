import { Button } from '../../shared/ui/Button';

type EmptyCalendarStateProps = {
  onCreate: () => void;
};

export function EmptyCalendarState({ onCreate }: EmptyCalendarStateProps) {
  return (
    <div className="calendar-empty-state" role="status">
      <span className="empty-mark" aria-hidden="true">◇</span>
      <div className="calendar-empty-copy">
        <strong>Nenhum evento neste período.</strong>
        <span>Os eventos aparecem aqui com título, data e horário.</span>
      </div>
      <Button variant="secondary" onClick={onCreate}>
        Criar evento
      </Button>
    </div>
  );
}
