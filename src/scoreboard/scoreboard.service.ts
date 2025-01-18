import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreBoard } from './scoreboard.entity';
import { ScoreGateway } from './scoreboard.gateway';

/**
 * 탁구 경기 로직: 단식/복식 모드, 세트수, 듀스, 서브권, 시간 기록, 히스토리 관리
 * - "서브권 이동"은 "처음 서브권"의 반대편으로 고정.
 */
@Injectable()
export class ScoreBoardService {
  private MATCH_ID = 1; // 하나의 경기만 관리한다고 가정

  constructor(
    @InjectRepository(ScoreBoard)
    private readonly sbRepo: Repository<ScoreBoard>,
    private readonly gateway: ScoreGateway,
  ) {}

  /**
   * 새 경기 설정 / 초기화
   *  - 모드(단식, 복식)
   *  - bestOf(3,5,7)
   *  - 팀명, 선수명
   *  - 서브권: 아직 결정 안 했으면 '', 나중에 randomServeOwner()로 설정
   */
  async createOrResetGame(params: {
    mode: 'singles'|'doubles';
    bestOf: number;
    teamAName: string;
    teamBName: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
  }) {
    let sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) {
      sb = this.sbRepo.create({ id: this.MATCH_ID });
    }

    sb.mode = params.mode;
    sb.bestOf = params.bestOf;
    sb.teamAName = params.teamAName;
    sb.teamBName = params.teamBName;
    sb.teamAPlayers = params.teamAPlayers.join(',');
    sb.teamBPlayers = params.teamBPlayers.join(',');

    // 점수/세트 승수 초기화
    sb.scoreA = 0;
    sb.scoreB = 0;
    sb.setWinsA = 0;
    sb.setWinsB = 0;
    sb.currentSet = 1;

    // 처음 서브권 (initialServeOwner)는 ''(아직 안 정함)
    sb.initialServeOwner = '';
    sb.serveOwner = '';  // 현재 서브권
    sb.finalWinner = '';

    // 히스토리, 시간 기록 초기화
    sb.scoreHistory = JSON.stringify([]);
    sb.timeRecords = JSON.stringify([]);

    await this.sbRepo.save(sb);
    this.broadcastUpdate(sb);
    return sb;
  }

  /**
   * "세트 시작" → 현 세트 startTime 기록
   */
  async startCurrentSet() {
    const sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) throw new Error('No scoreboard found');

    let records = sb.timeRecords ? JSON.parse(sb.timeRecords) : [];
    const setNum = sb.currentSet;

    // startTime 갱신
    let existing = records.find((r) => r.set === setNum);
    if (!existing) {
      existing = { set: setNum, start: new Date().toISOString() };
      records.push(existing);
    } else {
      existing.start = new Date().toISOString();
      delete existing.end; 
    }
    sb.timeRecords = JSON.stringify(records);

    await this.sbRepo.save(sb);
    this.broadcastUpdate(sb);
    return sb;
  }

  /**
   * 득점 +1
   */
  async addPoint(team: 'A'|'B') {
    const sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) throw new Error('No scoreboard found');

    if (team === 'A') sb.scoreA++;
    else sb.scoreB++;

    // 득점 히스토리
    let history = sb.scoreHistory ? JSON.parse(sb.scoreHistory) : [];
    const setNum = sb.currentSet;
    let setLog = history.find((x) => x.set === setNum);
    if (!setLog) {
      setLog = { set: setNum, log: [] };
      history.push(setLog);
    }
    setLog.log.push({
      team,
      scoreA: sb.scoreA,
      scoreB: sb.scoreB,
      timestamp: new Date().toISOString(),
    });
    sb.scoreHistory = JSON.stringify(history);

    // 듀스/세트 완료 체크
    await this.checkSetFinish(sb);

    await this.sbRepo.save(sb);
    this.broadcastUpdate(sb);
    return sb;
  }

  /**
   * 득점 -1 (오류 수정용)
   */
  async removePoint(team: 'A'|'B') {
    const sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) throw new Error('No scoreboard found');

    if (team === 'A' && sb.scoreA > 0) sb.scoreA--;
    if (team === 'B' && sb.scoreB > 0) sb.scoreB--;

    // 히스토리에서도 마지막 로그 pop
    let history = sb.scoreHistory ? JSON.parse(sb.scoreHistory) : [];
    const setNum = sb.currentSet;
    let setLog = history.find((x) => x.set === setNum);
    if (setLog && setLog.log.length > 0) {
      setLog.log.pop();
    }
    sb.scoreHistory = JSON.stringify(history);

    await this.sbRepo.save(sb);
    this.broadcastUpdate(sb);
    return sb;
  }

  /**
   * 서브권 랜덤 (처음 한번만 정한다고 가정)
   * - initialServeOwner = '' 인 경우에만 랜덤 설정
   * - serveOwner도 똑같이 설정
   */
  async randomServeOwner() {
    const sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) throw new Error('No scoreboard found');

    // 처음 서브권이 이미 있으면, 다시 바꾸지 않는다고 가정(원하면 덮어써도 됨)
    if (!sb.initialServeOwner) {
      const random = Math.random() < 0.5 ? 'A' : 'B';
      sb.initialServeOwner = random;
      sb.serveOwner = random;
    } else {
      // 이미 initialServeOwner가 있으면.. (원하면 무시)
    }

    await this.sbRepo.save(sb);
    // 게이트웨이 알림
    this.gateway.broadcastServeOwner(sb.serveOwner);
    this.broadcastUpdate(sb);
    return sb;
  }

  /**
   * 듀스/11점 규칙 / 세트 종료 판단
   */
  private async checkSetFinish(sb: ScoreBoard) {
    const a = sb.scoreA;
    const b = sb.scoreB;

    // 점수 중 하나가 11 이상 & 점수차 >=2 & 둘 다 최소 10점
    if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2 && (a >= 10 || b >= 10)) {
      // 세트 승자
      const winner = (a > b) ? 'A' : 'B';
      if (winner === 'A') sb.setWinsA++;
      else sb.setWinsB++;

      this.gateway.broadcastSetWinner(winner);

      await this.endCurrentSet(sb, winner);
    }
  }

  /**
   * 세트 종료:
   * - 시간 기록 end
   * - 최종 승리 여부
   * - 아니면 다음 세트 준비
   */
  private async endCurrentSet(sb: ScoreBoard, setWinner: 'A'|'B') {
    // endTime 기록
    let records = sb.timeRecords ? JSON.parse(sb.timeRecords) : [];
    const setNum = sb.currentSet;
    const rec = records.find((r) => r.set === setNum);
    if (rec && !rec.end) {
      rec.end = new Date().toISOString();
    }
    sb.timeRecords = JSON.stringify(records);

    // bestOf -> neededWins
    const neededWins = Math.ceil(sb.bestOf / 2);
    if (sb.setWinsA >= neededWins) {
      // A팀 최종 승
      sb.finalWinner = 'A';
      this.gateway.broadcastFinalWinner('A');
    } else if (sb.setWinsB >= neededWins) {
      // B팀 최종 승
      sb.finalWinner = 'B';
      this.gateway.broadcastFinalWinner('B');
    } else {
      // 아직 경기 진행
      sb.currentSet++;
      sb.scoreA = 0;
      sb.scoreB = 0;

      // 자리 교체(좌우 교대)
      this.swapSides(sb);

      // 서브권: 처음 서브권의 반대편
      if (sb.initialServeOwner === 'A') {
        sb.serveOwner = 'B';
      } else if (sb.initialServeOwner === 'B') {
        sb.serveOwner = 'A';
      }
      // 브로드캐스트
      this.gateway.broadcastServeOwner(sb.serveOwner);
    }

    await this.sbRepo.save(sb);
    this.broadcastUpdate(sb);
  }

  /**
   * 자리 교체 - 왼/오 교대
   */
  private swapSides(sb: ScoreBoard) {
    // 팀명
    const oldAName = sb.teamAName;
    sb.teamAName = sb.teamBName;
    sb.teamBName = oldAName;

    // 선수
    const oldAPlayers = sb.teamAPlayers;
    sb.teamAPlayers = sb.teamBPlayers;
    sb.teamBPlayers = oldAPlayers;
  }

  /**
   * 최종 게임 종료 -> 완전 초기화
   */
  async finishGame() {
    let sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) {
      sb = this.sbRepo.create({ id: this.MATCH_ID });
    }
    // 전체 필드 초기화
    sb.mode = 'singles';
    sb.bestOf = 3;
    sb.teamAName = '';
    sb.teamBName = '';
    sb.teamAPlayers = '';
    sb.teamBPlayers = '';
    sb.scoreA = 0;
    sb.scoreB = 0;
    sb.setWinsA = 0;
    sb.setWinsB = 0;
    sb.currentSet = 1;
    sb.initialServeOwner = '';
    sb.serveOwner = '';
    sb.finalWinner = '';
    sb.scoreHistory = JSON.stringify([]);
    sb.timeRecords = JSON.stringify([]);

    await this.sbRepo.save(sb);
    this.broadcastUpdate(sb);
    return { message: 'Game finished and reset' };
  }

  /**
   * 갱신 후 실시간 전송
   */
  private broadcastUpdate(sb: ScoreBoard) {
    this.gateway.broadcastScoreUpdate(sb);
  }

  /**
   * 현재 상태 조회
   * 읽기 전용 점수판이 필요한 정보(팀명, 선수들, 점수, 세트승, serveOwner, 히스토리, timeRecords, finalWinner 등)를
   * 그대로 반환
   */
  async getCurrentScore() {
    let sb = await this.sbRepo.findOne({ where: { id: this.MATCH_ID } });
    if (!sb) {
      sb = this.sbRepo.create({ id: this.MATCH_ID });
      await this.sbRepo.save(sb);
    }

    // 반환 전에 timeRecords, scoreHistory를 parse해서 함께 전달할 수도 있음
    const raw = {
      ...sb,
      // history: JSON.parse(sb.scoreHistory || '[]'),
      // times: JSON.parse(sb.timeRecords || '[]'),
    };
    return raw;
  }
}