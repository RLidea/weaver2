import { Injectable } from '@nestjs/common';
import { PrismaService } from '@weaver2/prisma';

@Injectable()
export class AdminSecurityApiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive system status overview
   */
  async getSystemStatus() {
    const securityOverview = await this.getSecurityOverview();

    return {
      statusCards: securityOverview.statusCards,
      vulnerabilities: securityOverview.vulnerabilities,
      recommendations: securityOverview.recommendations,
    };
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
      this.getSslCertificateStatus(),
      this.getLastScanTime(),
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
      recommendations: await this.getSecurityRecommendations(),
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
      const sslStatus = await this.getSslCertificateStatus();
      
      // Deduct points based on vulnerabilities
      score -= vulnerabilities.critical * 20;
      score -= vulnerabilities.high * 10;
      score -= vulnerabilities.medium * 5;
      score -= vulnerabilities.low * 2;
      
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
   * Get vulnerabilities count
   */
  private async getVulnerabilitiesCount() {
    // In a real implementation, this would scan for actual vulnerabilities
    return {
      total: 2,
      critical: 0,
      high: 0,
      medium: 0,
      low: 2,
    };
  }

  /**
   * Get SSL certificate status
   */
  private async getSslCertificateStatus() {
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
  private async getLastScanTime() {
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
   * Get detailed vulnerability information
   */
  private async getVulnerabilityDetails() {
    return [
      {
        id: 'vuln_1',
        severity: 'low',
        title: 'Outdated jQuery version',
        description: 'Consider updating to latest version for security patches',
        cve: null,
        fixAvailable: true,
      },
      {
        id: 'vuln_2',
        severity: 'low',
        title: 'Missing security headers',
        description: 'Some HTTP security headers are not configured',
        cve: null,
        fixAvailable: true,
      },
    ];
  }

  /**
   * Get security recommendations
   */
  private async getSecurityRecommendations() {
    return [
      {
        id: 'rec_1',
        title: 'Enable 2FA for all admin accounts',
        description: 'Add an extra layer of security to prevent unauthorized access',
        priority: 'high',
        category: 'authentication',
      },
      {
        id: 'rec_2',
        title: 'Regular security audits',
        description: 'Schedule monthly security reviews and vulnerability assessments',
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

  // Helper methods

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

  private getVulnerabilityDescription(vulnCount: any): string {
    if (vulnCount.total === 0) return 'No vulnerabilities';
    if (vulnCount.critical > 0) return 'Critical issues found';
    if (vulnCount.high > 0) return 'High priority issues';
    if (vulnCount.medium > 0) return 'Medium priority issues';
    return 'Low priority issues';
  }

  private getVulnerabilityStatus(vulnCount: any): string {
    if (vulnCount.critical > 0) return 'danger';
    if (vulnCount.high > 0) return 'danger';
    if (vulnCount.medium > 0) return 'warning';
    if (vulnCount.low > 0) return 'warning';
    return 'good';
  }
}