import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { BoardController } from './controllers/board.controller';
import { PostController } from './controllers/post.controller';
import { CommentController } from './controllers/comment.controller';
import { BoardService } from './services/board.service';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { BoardPermissionService } from './services/board-permission.service';

@Module({
  imports: [PrismaModule],
  controllers: [BoardController, PostController, CommentController],
  providers: [
    BoardService,
    PostService,
    CommentService,
    BoardPermissionService,
  ],
  exports: [BoardService, PostService, CommentService, BoardPermissionService],
})
export class BoardModule {}
