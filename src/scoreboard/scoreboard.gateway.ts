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
      origin: '*', // 개발 시 편의를 위해 전체 허용
    },
  })
  export class ScoreGateway {
    @WebSocketServer()
    server: Server;
  
    constructor(private readonly sbService: ScoreBoardService) {}
  
    // 클라이언트가 연결될 때
    handleConnection(client: Socket) {
      console.log('Client connected:', client.id);
      // 연결 시점에 현재 점수를 보낼 수도 있음
      // client.emit('scoreUpdate', ...);
    }
  
    // 연결 끊길 때
    handleDisconnect(client: Socket) {
      console.log('Client disconnected:', client.id);
    }
  
    // 클라이언트가 'requestScore' 이벤트를 보낼 때
    @SubscribeMessage('requestScore')
    handleRequestScore(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
      // 현재 점수 요청 → scoreUpdate 이벤트로 보냄
      // ex) const scoreboard = await this.sbService.getCurrentScore();
      // client.emit('scoreUpdate', scoreboard);
    }
  
    /**
     * 점수/세트 등이 변경된 후 이 메서드를 호출하면,
     * 모든 클라이언트에게 'scoreUpdate' 이벤트로 sb 데이터를 broadcast
     */
    broadcastScoreUpdate(updatedData: any) {
      this.server.emit('scoreUpdate', updatedData);
    }
  
    /**
     * 세트 종료 시 "setWin" 이벤트
     */
    broadcastSetWinner(winner: 'A'|'B') {
      this.server.emit('setWin', { winner });
    }
  
    /**
     * 최종 승리 "finalWin" 이벤트
     */
    broadcastFinalWinner(winner: 'A'|'B') {
      this.server.emit('finalWin', { winner });
    }
  
    /**
     * 서브권 이동시 "serveOwner" 이벤트
     */
    broadcastServeOwner(serveOwner: 'A'|'B'|'') {
      this.server.emit('serveOwner', { serveOwner });
    }
  }
  