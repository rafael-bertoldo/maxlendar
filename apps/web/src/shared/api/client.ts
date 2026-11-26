export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    readonly field?: string,
    message?: string,
  ) {
    super(message ?? 'Não foi possível concluir a solicitação.');
    this.name = 'ApiError';
  }
}

export async function readApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as {
    code?: string;
    field?: string;
    message?: string;
  };

  return new ApiError(
    response.status,
    body.code,
    body.field,
    body.message,
  );
}
