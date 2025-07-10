import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { PrismaModule } from '@weaver2/prisma';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BoardController, PostController, CommentController],
  providers: [BoardService, PostService, CommentService],
  exports: [BoardService, PostService, CommentService],
})
export class BoardModule {}
