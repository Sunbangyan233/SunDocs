
import {themes as prismThemes} from 'prism-react-renderer';



/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'aio-SunDocs',
  tagline: 'All in one for documents',
  favicon: 'img/favicon.ico',

  url: 'https://app.sunimg.top',
  baseUrl: '/',

  organizationName: 'Sunbangyan233', 
  projectName: 'SunDocs', 
  onBrokenLinks: 'ignore',
  onBrokenMarkdownLinks: 'ignore',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Sunbangyan233/SunDocs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Sunbangyan233/SunDocs/tree/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'aio-SunDocs',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'index',
            position: 'left',
            label: 'Docs',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/Sunbangyan233/SunDocs/',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'App下载',
                to: '/docs/index',
              },
              {
                label: 'blbl数字生命',
                to: '/docs/numbili',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: '我们的 Bilibili',
                to: 'https://space.bilibili.com/599959906',
              },         
              {
                label: 'GitHub',
                href: 'https://github.com/Sunbangyan233/SunDocs',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/facebook/docusaurus',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} SunRestik. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
    themes: [
      [
        require.resolve("@easyops-cn/docusaurus-search-local"),
        {
          hashed: true,
          language: ["en", "zh"],
        },
      ],
    ],

    plugins: [
      async function myPlugin() {
        return {
          name: 'manual-last-update',
          configureWebpack() {
            return {
              resolve: {
                alias: {
                  '@site/src/components/ManualLastUpdate': '/src/components/ManualLastUpdate.js',
                },
              },
            };
          },
        };
      },
    ],
};

export default config;
