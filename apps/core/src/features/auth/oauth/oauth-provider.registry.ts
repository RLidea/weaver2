import { BadRequestException, Injectable } from '@nestjs/common';
import { OAuthProvider } from './interfaces/oauth-provider.interface';

@Injectable()
export class OAuthProviderRegistry {
  private readonly providers = new Map<string, OAuthProvider>();

  register(provider: OAuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): OAuthProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`Unsupported OAuth provider: ${name}`);
    }
    return provider;
  }
}
