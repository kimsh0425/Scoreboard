// src/scoreboard/scoreboard.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * 탁구 경기 정보를 저장하는 엔티티
 */
@Entity()
export class ScoreBoard {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 단식 or 복식
   * 예: 'singles' | 'doubles'
   */
  @Column({ default: 'singles' })
  mode!: string;

  /**
   * 3, 5, 7 중 하나(3판2선승, 5판3선승, 7판4선승 등)
   */
  @Column({ default: 3 })
  bestOf!: number;

  /**
   * 홈팀 / 어웨이팀(왼/오)
   */
  @Column({ default: '' })
  teamAName!: string;

  @Column({ default: '' })
  teamBName!: string;

  /**
   * 단식이면 1명, 복식이면 2명 이름(쉼표로 연결)
   */
  @Column({ default: '' })
  teamAPlayers!: string;

  @Column({ default: '' })
  teamBPlayers!: string;

  /**
   * 현재 세트 점수(A,B)
   */
  @Column({ default: 0 })
  scoreA!: number;

  @Column({ default: 0 })
  scoreB!: number;

  /**
   * 누적 세트 승수
   */
  @Column({ default: 0 })
  setWinsA!: number;

  @Column({ default: 0 })
  setWinsB!: number;

  /**
   * 현재 몇 세트째인지(1부터 시작)
   */
  @Column({ default: 1 })
  currentSet!: number;

  /**
   * 처음 서브권('A','B','') - 한 번 랜덤 결정 후 고정
   */
  @Column({ default: '' })
  initialServeOwner!: 'A' | 'B' | '';

  /**
   * 현재 서브권('A','B','')
   */
  @Column({ default: '' })
  serveOwner!: 'A' | 'B' | '';

  /**
   * 최종 승자('A','B','')
   */
  @Column({ default: '' })
  finalWinner!: 'A' | 'B' | '';

  /**
   * 점수 히스토리(득점 상황) - JSON string
   */
  @Column({ type: 'text', nullable: true })
  scoreHistory!: string; // ex) [{set:1, log:[...]}, ...]

  /**
   * 세트별 시간 기록 - JSON string
   */
  @Column({ type: 'text', nullable: true })
  timeRecords!: string; // ex) [{set:1, start:"...", end:"..."}]
}
