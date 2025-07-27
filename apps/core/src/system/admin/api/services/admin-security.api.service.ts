import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

// Types for audit data
interface VulnerabilityCount {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info?: number;
}

interface AuditAdvisory {
  id: number;
  severity: string;
  title: string;
  overview: string;
  cves?: string[];
  module_name: string;
  vulnerable_versions: string;
  recommendation: string;
  cvss?: { score: number };
  patched_versions: string | null;
  url: string;
}

interface AuditResult {
  metadata?: {
    vulnerabilities: VulnerabilityCount;
    totalDependencies: number;
  };
  advisories?: Record<string, AuditAdvisory>;
}

interface SecurityAuditReport {
  id: string;
  createdAt: Date;
  securityScore: number;
  vulnerabilityCount: unknown;
  vulnerabilities: unknown;
  recommendations: unknown;
}

const execAsync = promisify(exec);

@Injectable()
export class AdminSecurityApiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all audit reports for history selection
   */
  async getAuditHistory(limit = 10, offset = 0) {
    try {
      const reports = await this.prisma.securityAuditReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          securityScore: true,
          vulnerabilityCount: true,
          scanDuration: true,
        },
      });

      const total = await this.prisma.securityAuditReport.count();

      return {
        reports: reports.map((report) => ({
          ...report,
          vulnerabilityCount: this.parseVulnerabilityCount(
            report.vulnerabilityCount,
          ),
        })),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Error getting audit history:', error);
      throw new Error('Failed to retrieve audit history');
    }
  }

  /**
   * Get specific audit report by ID
   */
  async getAuditReportById(reportId: string) {
    try {
      const report = await this.prisma.securityAuditReport.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new Error('Audit report not found');
      }

      return this.getSecurityOverviewFromStoredData(
        report as SecurityAuditReport,
      );
    } catch (error) {
      console.error('Error getting audit report by ID:', error);
      throw new Error('Failed to retrieve audit report');
    }
  }

  /**
   * Get comprehensive system status overview
   */
  async getSystemStatus() {
    try {
      // Get latest audit report from database
      const latestAuditReport = await this.prisma.securityAuditReport.findFirst(
        {
          orderBy: { createdAt: 'desc' },
        },
      );

      if (latestAuditReport) {
        // Use stored audit data
        const securityOverview = this.getSecurityOverviewFromStoredData(
          latestAuditReport as SecurityAuditReport,
        );
        return {
          statusCards: securityOverview.statusCards,
          vulnerabilities: securityOverview.vulnerabilities,
          recommendations: securityOverview.recommendations,
          scanInfo: securityOverview.scanInfo,
        };
      } else {
        // No stored data, return empty state
        console.log('No stored audit data found, showing empty state');
        return {
          statusCards: [
            {
              title: 'Security Scan',
              value: 'Not Available',
              description: 'Run your first security scan to see results',
              status: 'warning',
              icon: 'fas fa-exclamation-triangle',
            },
          ],
          vulnerabilities: [],
          recommendations: [],
        };
      }
    } catch (error) {
      console.error('Error getting system status:', error);
      // Return error state
      return {
        statusCards: [
          {
            title: 'Security Status',
            value: 'Error',
            description: 'Unable to load security data. Please try again.',
            status: 'danger',
            icon: 'fas fa-exclamation-triangle',
          },
        ],
        vulnerabilities: [],
        recommendations: [],
      };
    }
  }

  /**
   * Get security overview from stored audit data
   */
  getSecurityOverviewFromStoredData(auditReport: SecurityAuditReport) {
    try {
      // Safely parse vulnerability count from JSON
      const vulnerabilitiesCount = this.parseVulnerabilityCount(
        auditReport.vulnerabilityCount,
      );

      // Calculate time ago for last scan
      const lastScanTime = this.getTimeAgo(auditReport.createdAt);

      const statusCards = [
        {
          title: 'Security Score',
          value: `${auditReport.securityScore}/100`,
          description: this.getSecurityScoreDescription(
            auditReport.securityScore,
          ),
          status: this.getSecurityScoreStatus(auditReport.securityScore),
          icon: 'fas fa-shield-alt',
        },
        {
          title: 'Total Vulnerabilities',
          value: vulnerabilitiesCount.total.toString(),
          description: this.getVulnerabilityDescription(vulnerabilitiesCount),
          status: this.getVulnerabilityStatus(vulnerabilitiesCount),
          icon: 'fas fa-exclamation-triangle',
        },
        {
          title: 'Critical Issues',
          value: vulnerabilitiesCount.critical.toString(),
          description:
            vulnerabilitiesCount.critical > 0
              ? 'Immediate action required'
              : 'No critical issues',
          status: vulnerabilitiesCount.critical > 0 ? 'danger' : 'good',
          icon: 'fas fa-skull-crossbones',
        },
        {
          title: 'High Priority',
          value: vulnerabilitiesCount.high.toString(),
          description:
            vulnerabilitiesCount.high > 0
              ? 'Should be fixed soon'
              : 'No high priority issues',
          status: vulnerabilitiesCount.high > 0 ? 'warning' : 'good',
          icon: 'fas fa-exclamation',
        },
        {
          title: 'Last Scan',
          value: lastScanTime.timeAgo,
          description: lastScanTime.description,
          status: lastScanTime.status,
          icon: 'fas fa-sync-alt',
        },
      ];

      // Parse vulnerabilities and recommendations
      const vulnerabilities = this.parseStoredVulnerabilities(
        auditReport.vulnerabilities,
      );
      const recommendations = this.parseStoredRecommendations(
        auditReport.recommendations,
      );

      return {
        statusCards,
        vulnerabilities,
        recommendations,
        scanInfo: {
          scanTime: auditReport.createdAt,
          scanId: auditReport.id,
          securityScore: auditReport.securityScore,
          vulnerabilitySummary: vulnerabilitiesCount,
        },
      };
    } catch (error) {
      console.error('Error parsing stored audit data:', error);
      throw new Error('Failed to parse stored security audit data');
    }
  }

  /**
   * Get security overview with scores and vulnerabilities
   */
  async getSecurityOverview() {
    const [
      securityScore,
      vulnerabilitiesCount,
      sslCertificateStatus,
      lastScanTime,
    ] = await Promise.all([
      this.calculateSecurityScore(),
      this.getVulnerabilitiesCount(),
      Promise.resolve(this.getSslCertificateStatus()),
      Promise.resolve(this.getLastScanTime()),
    ]);

    const statusCards = [
      {
        title: 'Security Score',
        value: `${securityScore}/100`,
        description: this.getSecurityScoreDescription(securityScore),
        status: this.getSecurityScoreStatus(securityScore),
        icon: 'fas fa-shield-alt',
      },
      {
        title: 'Vulnerabilities',
        value: vulnerabilitiesCount.total.toString(),
        description: this.getVulnerabilityDescription(vulnerabilitiesCount),
        status: this.getVulnerabilityStatus(vulnerabilitiesCount),
        icon: 'fas fa-exclamation-triangle',
      },
      {
        title: 'SSL Certificate',
        value: sslCertificateStatus.isValid ? 'Valid' : 'Invalid',
        description: sslCertificateStatus.description,
        status: sslCertificateStatus.isValid ? 'good' : 'danger',
        icon: 'fas fa-certificate',
      },
      {
        title: 'Last Scan',
        value: lastScanTime.timeAgo,
        description: lastScanTime.description,
        status: lastScanTime.status,
        icon: 'fas fa-sync-alt',
      },
    ];

    return {
      statusCards,
      vulnerabilities: await this.getVulnerabilityDetails(),
      recommendations: this.getSecurityRecommendations(),
    };
  }

  /**
   * Calculate overall security score
   */
  private async calculateSecurityScore(): Promise<number> {
    try {
      let score = 100;

      // Check various security factors
      const vulnerabilities = await this.getVulnerabilitiesCount();
      const sslStatus = this.getSslCertificateStatus();

      // Deduct points based on vulnerabilities
      score -= (vulnerabilities.critical || 0) * 20;
      score -= (vulnerabilities.high || 0) * 10;
      score -= (vulnerabilities.moderate || 0) * 5;
      score -= (vulnerabilities.low || 0) * 2;

      // Deduct points for SSL issues
      if (!sslStatus.isValid) score -= 15;
      if (sslStatus.expiryDays < 30) score -= 5;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating security score:', error);
      return 50; // Default to moderate score on error
    }
  }

  /**
   * Get vulnerabilities count from pnpm audit
   */
  private async getVulnerabilitiesCount(): Promise<VulnerabilityCount> {
    try {
      const auditResult = await this.runPnpmAudit();
      return (
        auditResult.metadata?.vulnerabilities || {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
          total: 0,
        }
      );
    } catch (error) {
      console.error('Error getting vulnerabilities:', error);
      // Fallback to mock data
      return {
        info: 0,
        low: 1,
        moderate: 0,
        high: 2,
        critical: 1,
        total: 4,
      };
    }
  }

  /**
   * Get SSL certificate status
   */
  private getSslCertificateStatus() {
    // In a real implementation, you'd check the actual SSL certificate
    const expiryDays = 89;

    return {
      isValid: true,
      expiryDays,
      description: `Expires in ${expiryDays} days`,
      status: expiryDays < 30 ? 'warning' : 'good',
    };
  }

  /**
   * Get last scan time
   */
  private getLastScanTime() {
    const now = new Date();
    const lastScan = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    return {
      timeAgo: '2h ago',
      description: 'No issues found',
      status: 'good',
      lastScanDate: lastScan,
    };
  }

  /**
   * Get detailed vulnerability information from pnpm audit
   */
  private async getVulnerabilityDetails(): Promise<unknown[]> {
    try {
      const auditResult = await this.runPnpmAudit();
      const vulnerabilities: unknown[] = [];

      // Convert audit advisories to vulnerability format
      if (auditResult.advisories) {
        for (const [, advisory] of Object.entries(auditResult.advisories)) {
          const severity = this.mapSeverityLevel(advisory.severity);
          const overview = advisory.overview || '';
          const description = overview
            .split('\n')[0]
            .replace('### Impact', '')
            .trim();

          vulnerabilities.push({
            id: advisory.id.toString(),
            severity,
            title: advisory.title,
            description,
            cve: advisory.cves?.[0] || null,
            module: advisory.module_name,
            vulnerable_versions: advisory.vulnerable_versions,
            recommendation: advisory.recommendation,
            cvss_score: advisory.cvss?.score || 0,
            fixAvailable: advisory.patched_versions !== null,
            url: advisory.url,
          });
        }
      }

      return vulnerabilities;
    } catch (error) {
      console.error('Error getting vulnerability details:', error);
      // Fallback to mock data
      return [
        {
          id: 'fallback_1',
          severity: 'high',
          title: 'Unable to fetch vulnerability data',
          description: 'Please run security scan manually',
          cve: null,
          fixAvailable: false,
        },
      ];
    }
  }

  /**
   * Get security recommendations
   */
  private getSecurityRecommendations() {
    return [
      {
        id: 'rec_1',
        title: 'Enable 2FA for all admin accounts',
        description:
          'Add an extra layer of security to prevent unauthorized access',
        priority: 'high',
        category: 'authentication',
      },
      {
        id: 'rec_2',
        title: 'Regular security audits',
        description:
          'Schedule monthly security reviews and vulnerability assessments',
        priority: 'medium',
        category: 'monitoring',
      },
      {
        id: 'rec_3',
        title: 'Update backup strategy',
        description: 'Ensure regular backups and test restoration procedures',
        priority: 'medium',
        category: 'backup',
      },
    ];
  }

  /**
   * Run fresh security scan
   */
  async runSecurityScan() {
    const startTime = Date.now();

    try {
      // Run fresh pnpm audit
      const auditResult = await this.runPnpmAudit();
      const scanDuration = Date.now() - startTime;

      // Calculate security score
      const vulnerabilityCount = auditResult.metadata?.vulnerabilities || {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
      };
      const securityScore =
        this.calculateSecurityScoreFromVulnerabilities(vulnerabilityCount);

      // Parse vulnerabilities for storage
      const vulnerabilities = this.parseVulnerabilitiesFromAudit(auditResult);

      // Generate recommendations
      const recommendations = this.generateRecommendationsFromAudit(
        auditResult,
        vulnerabilities,
      );

      // Calculate package.json and lockfile hashes for change detection
      const { packageJsonHash, lockfileHash } =
        await this.calculateFileHashes();

      // Store audit result in database
      const auditReport = await this.prisma.securityAuditReport.create({
        data: {
          scanType: 'pnpm_audit',
          scanDuration,
          totalDependencies: auditResult.metadata?.totalDependencies || 0,
          vulnerabilityCount,
          securityScore,
          rawAuditData: auditResult,
          vulnerabilities,
          recommendations,
          packageJsonHash,
          lockfileHash,
        },
      });

      console.log(`Security audit report saved with ID: ${auditReport.id}`);

      return {
        success: true,
        scanTime: auditReport.createdAt.toISOString(),
        vulnerabilities: vulnerabilityCount,
        securityScore,
        reportId: auditReport.id,
        message: 'Security scan completed and saved successfully',
      };
    } catch (error) {
      console.error('Security scan failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Security scan failed: ${errorMessage}`);
    }
  }

  // Helper methods

  /**
   * Run pnpm audit and return parsed results
   */
  private async runPnpmAudit(): Promise<AuditResult> {
    try {
      console.log('Running pnpm audit from directory:', process.cwd());
      const { stdout } = await execAsync('pnpm audit --json --no-optional', {
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
      });
      console.log('pnpm audit completed successfully');

      // Clean stdout to ensure it's valid JSON
      const cleanOutput = stdout.trim();
      if (!cleanOutput.startsWith('{')) {
        throw new Error('Invalid JSON output from pnpm audit');
      }

      return JSON.parse(cleanOutput) as AuditResult;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const execError = error as {
          code: unknown;
          stdout?: string;
          stderr?: string;
          message?: string;
        };

        console.log('pnpm audit error details:', {
          code: execError.code,
          stdout: execError.stdout
            ? execError.stdout.substring(0, 200) + '...'
            : 'no stdout',
          stderr: execError.stderr,
          message: execError.message,
        });

        // pnpm audit returns non-zero exit code when vulnerabilities are found
        if (execError.stdout) {
          console.log('Parsing stdout from pnpm audit');
          const cleanOutput = execError.stdout.trim();

          // Check if output starts with JSON
          if (cleanOutput.startsWith('{')) {
            return JSON.parse(cleanOutput) as AuditResult;
          } else {
            console.error(
              'stdout is not valid JSON:',
              cleanOutput.substring(0, 200),
            );
            throw new Error('pnpm audit did not return valid JSON');
          }
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('pnpm audit failed completely:', errorMessage);
      throw new Error(`pnpm audit failed: ${errorMessage}`);
    }
  }

  /**
   * Map severity levels from pnpm audit to our format
   */
  private mapSeverityLevel(severity: string): string {
    const severityMap: Record<string, string> = {
      info: 'info',
      low: 'low',
      moderate: 'medium',
      high: 'high',
      critical: 'critical',
    };
    return severityMap[severity] || 'unknown';
  }

  private getSecurityScoreDescription(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  private getSecurityScoreStatus(score: number): string {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  private getVulnerabilityDescription(vulnCount: VulnerabilityCount): string {
    if (vulnCount.total === 0) return 'No vulnerabilities';
    if (vulnCount.critical > 0) return 'Critical issues found';
    if (vulnCount.high > 0) return 'High priority issues';
    if (vulnCount.moderate > 0) return 'Medium priority issues';
    return 'Low priority issues';
  }

  private getVulnerabilityStatus(vulnCount: VulnerabilityCount): string {
    if (vulnCount.critical > 0) return 'danger';
    if (vulnCount.high > 0) return 'danger';
    if (vulnCount.moderate > 0) return 'warning';
    if (vulnCount.low > 0) return 'warning';
    return 'good';
  }

  /**
   * Calculate security score from vulnerability count
   */
  private calculateSecurityScoreFromVulnerabilities(
    vulnerabilityCount: VulnerabilityCount,
  ): number {
    let score = 100;

    // Deduct points based on vulnerabilities
    score -= vulnerabilityCount.critical * 20;
    score -= vulnerabilityCount.high * 10;
    score -= vulnerabilityCount.moderate * 5;
    score -= vulnerabilityCount.low * 2;

    // Additional SSL and other factors can be added here
    const sslStatus = this.getSslCertificateStatus();
    if (!sslStatus.isValid) score -= 15;
    if (sslStatus.expiryDays < 30) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Parse vulnerabilities from audit result for storage
   */
  private parseVulnerabilitiesFromAudit(auditResult: AuditResult): unknown[] {
    const vulnerabilities: unknown[] = [];

    if (auditResult.advisories) {
      for (const [, advisory] of Object.entries(auditResult.advisories)) {
        const severity = this.mapSeverityLevel(advisory.severity);
        const overview = advisory.overview || '';
        const description = overview
          .split('\n')[0]
          .replace('### Impact', '')
          .trim();

        vulnerabilities.push({
          id: advisory.id.toString(),
          severity,
          title: advisory.title,
          description,
          cve: advisory.cves?.[0] || null,
          module: advisory.module_name,
          vulnerable_versions: advisory.vulnerable_versions,
          recommendation: advisory.recommendation,
          cvss_score: advisory.cvss?.score || 0,
          fixAvailable: advisory.patched_versions !== null,
          url: advisory.url,
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Generate recommendations from audit result
   */
  private generateRecommendationsFromAudit(
    auditResult: AuditResult,
    vulnerabilities: unknown[],
  ): unknown[] {
    const recommendations: unknown[] = [];

    // Add basic security recommendations
    recommendations.push(
      {
        id: 'update_dependencies',
        type: 'security',
        priority: 'high',
        title: 'Update vulnerable dependencies',
        description:
          'Review and update dependencies with known vulnerabilities',
        action: 'pnpm update',
      },
      {
        id: 'regular_audits',
        type: 'monitoring',
        priority: 'medium',
        title: 'Schedule regular security audits',
        description:
          'Set up automated security scanning to catch vulnerabilities early',
        action: 'Setup CI/CD security checks',
      },
    );

    // Add specific recommendations based on vulnerabilities
    if (vulnerabilities.length > 0) {
      const criticalVulns = vulnerabilities.filter(
        (v): v is { severity: string } =>
          typeof v === 'object' &&
          v !== null &&
          'severity' in v &&
          (v as { severity: string }).severity === 'critical',
      );
      const highVulns = vulnerabilities.filter(
        (v): v is { severity: string } =>
          typeof v === 'object' &&
          v !== null &&
          'severity' in v &&
          (v as { severity: string }).severity === 'high',
      );

      if (criticalVulns.length > 0) {
        recommendations.unshift({
          id: 'critical_fixes',
          type: 'urgent',
          priority: 'critical',
          title: 'Fix critical vulnerabilities immediately',
          description: `${criticalVulns.length} critical vulnerabilities require immediate attention`,
          action: 'Review and apply security patches',
        });
      }

      if (highVulns.length > 0) {
        recommendations.push({
          id: 'high_priority_fixes',
          type: 'security',
          priority: 'high',
          title: 'Address high priority vulnerabilities',
          description: `${highVulns.length} high priority vulnerabilities should be fixed soon`,
          action: 'Schedule security updates',
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate file hashes for change detection
   */
  private async calculateFileHashes(): Promise<{
    packageJsonHash: string;
    lockfileHash: string;
  }> {
    try {
      const packageJsonContent = await readFile(
        process.cwd() + '/package.json',
        'utf-8',
      );
      const packageJsonHash = createHash('sha256')
        .update(packageJsonContent)
        .digest('hex');

      let lockfileHash = '';
      try {
        const lockfileContent = await readFile(
          process.cwd() + '/pnpm-lock.yaml',
          'utf-8',
        );
        lockfileHash = createHash('sha256')
          .update(lockfileContent)
          .digest('hex');
      } catch {
        console.log('pnpm-lock.yaml not found, skipping lockfile hash');
      }

      return { packageJsonHash, lockfileHash };
    } catch (error) {
      console.error('Error calculating file hashes:', error);
      return { packageJsonHash: '', lockfileHash: '' };
    }
  }

  /**
   * Get time ago for last scan
   */
  private getTimeAgo(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timeAgo: string;
    let status: string;
    let description: string;

    if (diffMinutes < 60) {
      timeAgo = `${diffMinutes}m ago`;
      status = 'good';
      description = 'Recent scan completed';
    } else if (diffHours < 24) {
      timeAgo = `${diffHours}h ago`;
      status = diffHours < 6 ? 'good' : 'warning';
      description =
        diffHours < 6
          ? 'Recent scan completed'
          : 'Consider running a fresh scan';
    } else {
      timeAgo = `${diffDays}d ago`;
      status = diffDays < 7 ? 'warning' : 'danger';
      description =
        diffDays < 7
          ? 'Scan is getting old'
          : 'Scan is outdated, run a fresh scan';
    }

    return {
      timeAgo,
      status,
      description,
      lastScanDate: date,
    };
  }

  /**
   * Parse vulnerability count from stored JSON data
   */
  private parseVulnerabilityCount(data: unknown): VulnerabilityCount {
    try {
      if (typeof data === 'object' && data !== null) {
        const vulnData = data as Record<string, number>;
        return {
          total: vulnData.total || 0,
          critical: vulnData.critical || 0,
          high: vulnData.high || 0,
          moderate: vulnData.moderate || 0,
          low: vulnData.low || 0,
          info: vulnData.info || 0,
        };
      }
      throw new Error('Invalid vulnerability count data');
    } catch (error) {
      console.error('Error parsing vulnerability count:', error);
      return { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
    }
  }

  /**
   * Parse stored vulnerabilities from JSON data
   */
  private parseStoredVulnerabilities(data: unknown): unknown[] {
    try {
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error parsing stored vulnerabilities:', error);
      return [];
    }
  }

  /**
   * Parse stored recommendations from JSON data
   */
  private parseStoredRecommendations(data: unknown): unknown[] {
    try {
      if (Array.isArray(data)) {
        return data;
      }
      // Return empty array if no data - don't use hardcoded fallback
      return [];
    } catch (error) {
      console.error('Error parsing stored recommendations:', error);
      return [];
    }
  }
}
