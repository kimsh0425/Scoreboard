// src/scoreboard/scoreboard.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ScoreBoard {
  @PrimaryGeneratedColumn()
  id: number;

  // 단식/복식
  @Column()
  mode: string; // 'singles' | 'doubles'

  // 간단 예시로 팀 이름(또는 선수 목록)을 문자열로 보관
  @Column({ nullable: true })
  teamAPlayers: string; // "홍길동" or "홍길동,김철수"

  @Column({ nullable: true })
  teamBPlayers: string;

  // 점수
  @Column({ default: 0 })
  scoreA: number;

  @Column({ default: 0 })
  scoreB: number;

  // 그 외 서브권, 세트수, 듀스여부 등등 필요하다면 추가
  // ...
}
