import { TicketBatchSummary } from './ticket-batch.model';

export interface Event {
  id: number;
  name: string;
  description: string;
  location: string;
  capacity: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  bannerUrl: string;
  createdAt: string;
  updatedAt: string;
  hasActiveBatch?: boolean;
  activeBatch?: TicketBatchSummary | null;
  nextBatch?: TicketBatchSummary | null;
  nextBatchReleaseDate?: string | null;
}
