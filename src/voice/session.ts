export interface VoiceTurn {
  turnId: number;
  timestamp: number;
  speaker: "user" | "agent";
  transcript: string;
  intent?: string;
  report?: any;
  audioPath?: string;
}

export class VoiceSession {
  public readonly sessionId: string;
  public activePersona = "alexa";
  public isMuted = false;
  private turns: VoiceTurn[] = [];
  private lastReportData: any = null;
  private lastSpokenPhrase = "";
  private turnCounter = 0;

  constructor(sessionId?: string, defaultPersona = "alexa") {
    this.sessionId = sessionId ?? `session-${Date.now()}`;
    this.activePersona = defaultPersona;
  }

  public addTurn(speaker: "user" | "agent", transcript: string, extra: Partial<VoiceTurn> = {}): VoiceTurn {
    this.turnCounter += 1;
    const turn: VoiceTurn = {
      turnId: this.turnCounter,
      timestamp: Date.now(),
      speaker,
      transcript,
      ...extra,
    };
    this.turns.push(turn);

    if (extra.report) {
      this.lastReportData = extra.report;
    }
    if (speaker === "agent" && transcript) {
      this.lastSpokenPhrase = transcript;
    }

    return turn;
  }

  public getTurns(): VoiceTurn[] {
    return [...this.turns];
  }

  public getLastTurn(): VoiceTurn | undefined {
    return this.turns[this.turns.length - 1];
  }

  public getLastReport(): any {
    return this.lastReportData;
  }

  public setLastReport(report: any): void {
    this.lastReportData = report;
  }

  public getLastSpokenText(): string {
    return this.lastSpokenPhrase;
  }

  public switchPersona(personaId: string): void {
    this.activePersona = personaId;
  }

  public clear(): void {
    this.turns = [];
    this.lastReportData = null;
    this.lastSpokenPhrase = "";
    this.turnCounter = 0;
  }
}
