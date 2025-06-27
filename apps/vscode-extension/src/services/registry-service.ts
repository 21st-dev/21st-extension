import axios from 'axios';
import { compareVersions as compareVersionsUtil } from 'src/utils/lock-file-parsers/version-comparator';

export class RegistryService {
  private static instance: RegistryService;

  private constructor() {}

  public static getInstance() {
    if (!RegistryService.instance) {
      RegistryService.instance = new RegistryService();
    }
    return RegistryService.instance;
  }

  public async getLatestToolbarVersion(): Promise<string | null> {
    try {
      const response = await axios.get(
        'https://registry.npmjs.org/@21st-extension/toolbar/latest',
        { timeout: 5000 },
      );
      return response.data.version;
    } catch (error) {
      console.error('Failed to fetch latest toolbar version:', error);
      return null;
    }
  }

  public async getLatestExtensionVersion(): Promise<string | null> {
    try {
      const versions = await Promise.allSettled([this.fetchFromOpenVSX()]);

      const validVersions = versions
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === 'fulfilled' &&
            result.value !== null &&
            result.value !== undefined &&
            typeof result.value === 'string',
        )
        .map((result) => result.value);

      if (validVersions.length === 0) {
        return null;
      }

      return validVersions.reduce((newest, current) => {
        return this.compareVersions(current, newest) > 0 ? current : newest;
      }, validVersions[0]);
    } catch (error) {
      console.error('Failed to fetch latest extension version:', error);
      return null;
    }
  }

  private async fetchFromOpenVSX(): Promise<string | null> {
    try {
      const response = await axios.get(
        'https://open-vsx.org/api/21st-dev/21st-extension/versions',
        {
          timeout: 5000,
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const versions = response.data?.versions;
      if (!versions || typeof versions !== 'object') {
        return null;
      }

      const versionKeys = Object.keys(versions);
      if (versionKeys.length === 0) {
        return null;
      }

      // Find the highest version using semantic version comparison
      return versionKeys.reduce((newest, current) => {
        return this.compareVersions(current, newest) > 0 ? current : newest;
      }, versionKeys[0]);
    } catch (error) {
      console.error('Failed to fetch from Open VSX Registry:', error);
      return null;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    return compareVersionsUtil(v1, v2);
  }
}
