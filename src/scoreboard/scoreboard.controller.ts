// src/scoreboard/scoreboard.controller.ts

import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ScoreBoardService } from './scoreboard.service';

@Controller('scoreboard')
export class ScoreBoardController {
  constructor(private readonly sbService: ScoreBoardService) {}

  /**
   * 현재 점수/상태 조회
   * ex) GET /scoreboard
   */
  @Get()
  async getScore() {
    return this.sbService.getCurrentScore();
  }

  /**
   * 새 경기 설정 (단식/복식, 세트수, 팀명/선수이름 등)
   * ex) POST /scoreboard/create
   * body: {
   *   mode: 'singles' | 'doubles',
   *   bestOf: number,
   *   teamAName: string,
   *   teamBName: string,
   *   teamAPlayers: string[],
   *   teamBPlayers: string[],
   * }
   */
  @Post('create')
  async createGame(@Body() body: {
    mode: 'singles'|'doubles';
    bestOf: number;
    teamAName: string;
    teamBName: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
  }) {
    return this.sbService.createOrResetGame(body);
  }

  /**
   * 한 세트 시작 (게임 시간 시작)
   * ex) POST /scoreboard/start-set
   */
  @Post('start-set')
  async startSet() {
    return this.sbService.startCurrentSet();
  }

  /**
   * 득점 +1
   * ex) PATCH /scoreboard/add-point/A  or  /scoreboard/add-point/B
   */
  @Patch('add-point/:team')
  async addPoint(@Param('team') team: 'A'|'B') {
    return this.sbService.addPoint(team);
  }

  /**
   * 득점 -1 (오류 수정용)
   * ex) PATCH /scoreboard/remove-point/A  or  /scoreboard/remove-point/B
   */
  @Patch('remove-point/:team')
  async removePoint(@Param('team') team: 'A'|'B') {
    return this.sbService.removePoint(team);
  }

  /**
   * 서브권 랜덤 결정 (처음 한 번만)
   * ex) POST /scoreboard/random-serve
   */
  @Post('random-serve')
  async randomServe() {
    return this.sbService.randomServeOwner();
  }

  /**
   * 최종 게임 종료(모든 정보 초기화)
   * ex) POST /scoreboard/finish-game
   */
  @Post('finish-game')
  async finishGame() {
    return this.sbService.finishGame();
  }
}
