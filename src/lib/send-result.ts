export type TestSendResult = { ok: boolean; message: string } | null;

export type SendResult = {
  sent: number;
  noEmail: number;
  failed: number;
  firstError: string | null;
  stoppedEarly: boolean;
} | null;
