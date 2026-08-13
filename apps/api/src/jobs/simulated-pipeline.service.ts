import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingStatus } from '@meeting-intelligence/database';

@Injectable()
export class SimulatedPipelineService {
  constructor(private readonly config: ConfigService) {}

  async pauseAfter(stage: MeetingStatus): Promise<void> {
    if (this.shouldFailAt(stage)) {
      throw new Error(`Development simulation failed at ${stage}.`);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, this.stageDelayMs));
  }

  private get stageDelayMs(): number {
    const configured = Number(this.config.get<string>('PROCESSING_SIMULATION_DELAY_MS', '1200'));
    return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : 1_200;
  }

  private shouldFailAt(stage: MeetingStatus): boolean {
    if (this.config.get<string>('NODE_ENV') === 'production') return false;
    return this.config.get<string>('SIMULATE_MEETING_PROCESSING_FAILURE_STAGE') === stage;
  }
}
