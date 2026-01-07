export interface TicketBatchSummary {
  id: number;
  name?: string | null;
  description?: string | null;
  type: string;
  price: string;
  releaseDate: string;
  closingDate: string;
}
