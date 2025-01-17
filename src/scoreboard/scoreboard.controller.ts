// src/scoreboard/scoreboard.controller.ts
import { Controller, Get, Post, Patch, Body } from '@nestjs/common';
import { ScoreBoardService } from './scoreboard.service';

@Controller('scoreboard')
export class ScoreBoardController {
  constructor(private readonly sbService: ScoreBoardService) {}

  // GET /scoreboard -> 현재 상태
  @Get()
  async getScore() {
    return this.sbService.getCurrentScore();
  }

  // POST /scoreboard/set-game
  @Post('set-game')
  async setGame(@Body() body: {
    mode: '단식'|'복식',
    teamAPlayers: string,
    teamBPlayers: string
  }) {
    return this.sbService.setGame(body.mode, body.teamAPlayers, body.teamBPlayers);
  }

  // PATCH /scoreboard/update-score
  @Patch('update-score')
  async updateScore(@Body() body: {team: 'A'|'B'; delta: number}) {
    return this.sbService.updateScore(body.team, body.delta);
  }

  // POST /scoreboard/reset
  @Post('reset')
  async resetScore() {
    return this.sbService.resetGame();
  }
}
