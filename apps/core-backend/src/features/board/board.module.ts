import { Module } from '@nestjs/common';
import { PrismaModule } from '@weaver2/prisma';
import { UploadModule as UploadLibModule } from '@weaver2/upload';
import { BoardController } from './controllers/board.controller';
import { PostController } from './controllers/post.controller';
import { CommentController } from './controllers/comment.controller';
import { CategoryController } from './controllers/category.controller';
import { PostAdminController } from './controllers/post-admin.controller';
import { UserPostsController } from './controllers/user-posts.controller';
import { CommentAdminController } from './controllers/comment-admin.controller';
import { UserCommentsController } from './controllers/user-comments.controller';
import { EmojiAdminController } from './controllers/emoji-admin.controller';
import { EmojiController } from './controllers/emoji.controller';
import { PostReactionController } from './controllers/post-reaction.controller';
import { EmojiService } from './services/emoji.service';
import { ReactionService } from './services/reaction.service';
import { BoardService } from './services/board.service';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { BoardPermissionService } from './services/board-permission.service';
import { CategoryService } from './services/category.service';
import { ContentPurgeService } from './services/content-purge.service';
import { ContentPurgeScheduler } from './schedulers/content-purge.scheduler';

@Module({
  imports: [PrismaModule, UploadLibModule],
  controllers: [
    BoardController,
    PostController,
    PostAdminController,
    UserPostsController,
    CommentController,
    CommentAdminController,
    UserCommentsController,
    CategoryController,
    EmojiAdminController,
    EmojiController,
    PostReactionController,
  ],
  providers: [
    BoardService,
    PostService,
    CommentService,
    BoardPermissionService,
    CategoryService,
    ContentPurgeService,
    ContentPurgeScheduler,
    EmojiService,
    ReactionService,
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
