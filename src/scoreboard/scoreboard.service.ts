// src/scoreboard/scoreboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreBoard } from './scoreboard.entity';
import { ScoreGateway } from './scoreboard.gateway';

@Injectable()
export class ScoreBoardService {
  constructor(
    @InjectRepository(ScoreBoard)
    private readonly scoreboardRepo: Repository<ScoreBoard>,
    private readonly gateway: ScoreGateway,
  ) {}

  private currentId = 1; 
  // 한 번에 한 경기를 진행한다고 가정하고, scoreboard 테이블에 1행만 업데이트한다는 예시

  // ========== 초기화 or 새 경기 설정 ==========
  async setGame(mode: '단식'|'복식', teamA: string, teamB: string) {
    // 여기선 한행만 쓴다고 가정, 실제론 create()
    let sb = await this.scoreboardRepo.findOne({ where: { id: this.currentId } });
    if (!sb) {
      sb = this.scoreboardRepo.create({ id: this.currentId });
    }
    sb.mode = mode;
    sb.teamAPlayers = teamA;
    sb.teamBPlayers = teamB;
    sb.scoreA = 0;
    sb.scoreB = 0;
    await this.scoreboardRepo.save(sb);

    this.gateway.broadcastScoreUpdate(); // 실시간 알림
    return sb;
  }

  // ========== 점수 업데이트 ==========
  async updateScore(team: 'A'|'B', delta: number) {
    const sb = await this.scoreboardRepo.findOne({ where: { id: this.currentId } });
    if (!sb) throw new Error('ScoreBoard not found');

    if (team === 'A') {
      sb.scoreA += delta;
      if (sb.scoreA < 0) sb.scoreA = 0;
    } else {
      sb.scoreB += delta;
      if (sb.scoreB < 0) sb.scoreB = 0;
    }
    // 듀스/세트/승리 등 로직은 여기서...
    await this.scoreboardRepo.save(sb);

    this.gateway.broadcastScoreUpdate(); 
    return sb;
  }

  // ========== 점수판 리셋 ==========
  async resetGame() {
    // scoreA, scoreB = 0
    // mode = 'singles' or etc
    let sb = await this.scoreboardRepo.findOne({ where: { id: this.currentId } });
    if (!sb) {
      sb = this.scoreboardRepo.create({ id: this.currentId });
    }
    sb.mode = 'singles';
    sb.teamAPlayers = '';
    sb.teamBPlayers = '';
    sb.scoreA = 0;
    sb.scoreB = 0;
    await this.scoreboardRepo.save(sb);

    this.gateway.broadcastScoreUpdate();
    return sb;
  }

  // ========== 현재 상태 조회 ==========
  async getCurrentScore() {
    const sb = await this.scoreboardRepo.findOne({ where: { id: this.currentId } });
    if (!sb) {
      // 존재 안하면 기본값
      return {
        id: this.currentId,
        mode: 'singles',
        teamAPlayers: '',
        teamBPlayers: '',
        scoreA: 0,
        scoreB: 0,
      };
    }
    return sb;
  }
}
