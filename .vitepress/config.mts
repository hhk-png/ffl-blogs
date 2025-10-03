import { defineConfig } from 'vitepress'
import blogsSideBar from '../blogs'

const base = '/ffl-blogs'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  outDir: './dist',
  base,
  // markdown: {
  //   toc: {
  //     level: [1, 2, 3, 4, 5, 6]
  //   }
  // },
  title: "Fang Fangluo",
  description: "Blogs written by fangfangluo",
  head: [
    ['link', { rel: 'icon', type: 'image/jpeg', href: `${base}/icon.jpg` }],
    ['meta', { name: 'keywords', content: 'fangfangluo, ffl, ffl-blogs, monorepo, vitepress, github, github pages, blog' }],
    ['meta', { name: 'author', content: 'fangfangluo' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Blogs', link: '/blogs/call-python-ocr' }
    ],

    sidebar: {
      '/blogs/': blogsSideBar,
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hhk-png' }
    ]
  },
  sitemap: {
    hostname: 'https://hhk-png.github.io/ffl-blogs/',
  },
})
