import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { BoardController } from './controllers/board.controller';
import { PostController } from './controllers/post.controller';
import { CommentController } from './controllers/comment.controller';
import { CategoryController } from './controllers/category.controller';
import { BoardService } from './services/board.service';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { BoardPermissionService } from './services/board-permission.service';
import { CategoryService } from './services/category.service';
import { ContentPurgeService } from './services/content-purge.service';
import { ContentPurgeScheduler } from './schedulers/content-purge.scheduler';

@Module({
  imports: [PrismaModule],
  controllers: [
    BoardController,
    PostController,
    CommentController,
    CategoryController,
  ],
  providers: [
    BoardService,
    PostService,
    CommentService,
    BoardPermissionService,
    CategoryService,
    ContentPurgeService,
    ContentPurgeScheduler,
  ],
  exports: [
    BoardService,
    PostService,
    CommentService,
    BoardPermissionService,
    CategoryService,
    ContentPurgeService,
  ],
})
export class BoardModule {}
