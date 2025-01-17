// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// 스코어보드 모듈
import { ScoreBoardModule } from './scoreboard/scoreboard.module';

// 엔티티(스코어보드) - 아래 예시에서 필요하다면 import
import { ScoreBoard } from './scoreboard/scoreboard.entity';

@Module({
  imports: [
    // 1) TypeORM MySQL 연결
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',       // DB host
      port: 3306,              // MySQL port
      username: 'scoreadmin_sh',  // 예) 사용자가 만든 계정
      password: 'scps01',      // 계정 비밀번호
      database: 'scoreboard_db', // DB 이름
      entities: [ScoreBoard],  // 엔티티 목록
      synchronize: true,       // dev 시에 테이블 자동 생성
    }),
    // 2) 스코어보드 모듈
    ScoreBoardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
