// src/scoreboard/scoreboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreBoard } from './scoreboard.entity';
import { ScoreBoardService } from './scoreboard.service';
import { ScoreBoardController } from './scoreboard.controller';
import { ScoreGateway } from './scoreboard.gateway';

@Module({
  imports: [
    // TypeOrmModule.forFeature: 이 모듈 안에서 ScoreBoard 엔티티 레포지토리 사용 가능
    TypeOrmModule.forFeature([ScoreBoard]),
  ],
  controllers: [ScoreBoardController],
  providers: [ScoreBoardService, ScoreGateway],
})
export class ScoreBoardModule {}
