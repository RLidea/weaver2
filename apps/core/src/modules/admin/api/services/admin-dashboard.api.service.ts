import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class AdminDashboardApiService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const totalUsers = await this.prisma.user.count();
    const todaySignups = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const totalPosts = await this.prisma.post.count();
    const todayPosts = await this.prisma.post.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const totalComments = await this.prisma.comment.count();
    const todayComments = await this.prisma.comment.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    // TODO: Implement activeUsers and bannedUsers logic based on your application's definition
    const activeUsers = 0; // Placeholder
    const bannedUsers = 0; // Placeholder

    return {
      totalUsers,
      todaySignups,
      totalPosts,
      todayPosts,
      totalComments,
      todayComments,
      activeUsers,
      bannedUsers,
    };
  }
}
