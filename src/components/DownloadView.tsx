import React from 'react';
import { useI18n } from '../i18n/I18nContext';

interface DownloadVariant {
  labelKey: string;
  metaKey: string;
  url: string;
  icon?: 'download' | 'external';
}

interface DownloadPlatform {
  key: 'macos' | 'windows' | 'linux';
  titleKey: string;
  badgeKey: string;
  descriptionKey: string;
  iconLabel: string;
  variants: DownloadVariant[];
}

const latestVersion = '2.1.0';

const releasePageUrl = 'https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/tag/v2.1.0';
const releasesUrl = 'https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases';
const releaseBaseUrl = 'https://github.com/Z1RO014011/MusicPlayer--Jasmine-/releases/download/v2.1.0';

const platforms: DownloadPlatform[] = [
  {
    key: 'macos',
    titleKey: 'download.platformMac',
    badgeKey: 'download.badgeRecommended',
    descriptionKey: 'download.macDesc',
    iconLabel: 'mac',
    variants: [
      {
        labelKey: 'download.macAppleDmg',
        metaKey: 'download.dmgMeta',
        url: `${releaseBaseUrl}/Jasmine-2.1.0-arm64.dmg`,
      },
      {
        labelKey: 'download.macIntelDmg',
        metaKey: 'download.dmgMeta',
        url: `${releaseBaseUrl}/Jasmine-2.1.0.dmg`,
      },
      {
        labelKey: 'download.macZip',
        metaKey: 'download.zipMeta',
        url: `${releaseBaseUrl}/Jasmine-2.1.0-arm64-mac.zip`,
      },
      {
        labelKey: 'download.macIntelZip',
        metaKey: 'download.zipMeta',
        url: `${releaseBaseUrl}/Jasmine-2.1.0-mac.zip`,
      },
    ],
  },
  {
    key: 'windows',
    titleKey: 'download.platformWindows',
    badgeKey: 'download.badgeInstaller',
    descriptionKey: 'download.windowsDesc',
    iconLabel: 'win',
    variants: [
      {
        labelKey: 'download.windowsInstaller',
        metaKey: 'download.windowsMeta',
        url: `${releaseBaseUrl}/Jasmine.Setup.2.1.0.exe`,
      },
    ],
  },
  {
    key: 'linux',
    titleKey: 'download.platformLinux',
    badgeKey: 'download.badgeBuild',
    descriptionKey: 'download.linuxDesc',
    iconLabel: 'linux',
    variants: [
      {
        labelKey: 'download.linuxReleasePage',
        metaKey: 'download.linuxMeta',
        url: releasePageUrl,
        icon: 'external',
      },
    ],
  },
];

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export function DownloadView() {
  const { t } = useI18n();

  return (
    <div className="download-view">
      <section className="download-hero">
        <div className="download-hero-copy">
          <div className="download-eyebrow">{t('download.eyebrow')}</div>
          <h1 className="download-title">{t('download.title')}</h1>
          <p className="download-subtitle">{t('download.subtitle')}</p>
          <div className="download-hero-actions">
            <a
              className="download-primary-btn"
              href={`${releaseBaseUrl}/Jasmine-2.1.0-arm64.dmg`}
              target="_blank"
              rel="noreferrer"
            >
              <DownloadIcon />
              <span>{t('download.primaryCta')}</span>
            </a>
            <a
              className="download-secondary-btn"
              href={releasesUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>{t('download.allReleases')}</span>
              <ExternalIcon />
            </a>
          </div>
        </div>

        <div className="download-version-panel" aria-label={t('download.versionLabel')}>
          <div className="download-version-mark">
            <DownloadIcon />
          </div>
          <div>
            <div className="download-version-label">{t('download.versionLabel')}</div>
            <div className="download-version-number">v{latestVersion}</div>
          </div>
          <div className="download-version-note">{t('download.versionNote')}</div>
        </div>
      </section>

      <section className="download-platform-grid" aria-label={t('download.platformsLabel')}>
        {platforms.map(platform => (
          <article className={`download-platform-card ${platform.key}`} key={platform.key}>
            <div className="download-platform-header">
              <div className="download-platform-icon" aria-hidden="true">{platform.iconLabel}</div>
              <div>
                <h2>{t(platform.titleKey)}</h2>
                <p>{t(platform.descriptionKey)}</p>
              </div>
              <span className="download-platform-badge">{t(platform.badgeKey)}</span>
            </div>

            <div className="download-variant-list">
              {platform.variants.map(variant => (
                <a
                  className="download-variant"
                  href={variant.url}
                  target="_blank"
                  rel="noreferrer"
                  key={variant.labelKey}
                >
                  <span>
                    <strong>{t(variant.labelKey)}</strong>
                    <small>{t(variant.metaKey)}</small>
                  </span>
                  {variant.icon === 'external' ? <ExternalIcon /> : <DownloadIcon />}
                </a>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="download-note-panel">
        <div>
          <h2>{t('download.installTitle')}</h2>
          <p>{t('download.installDesc')}</p>
        </div>
        <div className="download-note-steps">
          <span>{t('download.stepDownload')}</span>
          <span>{t('download.stepInstall')}</span>
          <span>{t('download.stepPlay')}</span>
        </div>
      </section>
    </div>
  );
}
