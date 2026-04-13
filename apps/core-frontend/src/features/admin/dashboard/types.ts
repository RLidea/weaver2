export interface DashboardSummary {
  totalUsers: number;
  todaySignups: number;
  totalPosts: number;
  todayPosts: number;
  totalComments: number;
  todayComments: number;
  activeUsers: number;
}

export interface SignupTrendItem {
  date: string;
  count: number;
}

export interface UserActivityItem {
  date: string;
  activeUsers: number;
}

export interface UsersByGroupItem {
  group: string;
  count: number;
}

export interface RetentionRate {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface UserAnalytics {
  signupTrends: SignupTrendItem[];
  usersByGroup: UsersByGroupItem[];
  userActivity: UserActivityItem[];
  retentionRate: RetentionRate;
}

export interface PostTrendItem {
  date: string;
  posts: number;
  comments: number;
}

export interface TopBoardItem {
  boardName: string;
  postCount: number;
  commentCount: number;
}

export interface ContentQuality {
  avgPostLength: number;
  avgCommentsPerPost: number;
  postsWithImages: number;
}

export interface ContentAnalytics {
  postTrends: PostTrendItem[];
  topBoards: TopBoardItem[];
  contentQuality: ContentQuality;
}

export interface AnalyticsTimeRange {
  from?: string;
  to?: string;
}
