// src/scoreboard/scoreboard.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { ScoreBoardService } from './scoreboard.service';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // dev 시 임시
    },
  })
  export class ScoreGateway {
    @WebSocketServer()
    server: Server;
  
    constructor(private readonly scoreService: ScoreBoardService) {}
  
    handleConnection(client: Socket) {
      console.log('Client connected:', client.id);
      // 연결 시점에 점수 전송 (optional)
      client.emit('scoreUpdate', this.scoreService.getCurrentScore());
    }
  
    handleDisconnect(client: Socket) {
      console.log('Client disconnected:', client.id);
    }
  
    // 클라이언트가 'requestScore' 이벤트를 보낼 때 처리하는 예시
    @SubscribeMessage('requestScore')
    handleRequestScore(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
      client.emit('scoreUpdate', this.scoreService.getCurrentScore());
    }
  
    // 서비스에서 점수 바뀌면 이 메서드를 호출해주면 된다
    broadcastScoreUpdate() {
      const current = this.scoreService.getCurrentScore();
      this.server.emit('scoreUpdate', current);
    }
  }
  