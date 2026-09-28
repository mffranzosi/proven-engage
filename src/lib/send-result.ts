export type SendResult = {
  sent: number;
  noEmail: number;
  failed: number;
  firstError: string | null;
  stoppedEarly: boolean;
} | null;
