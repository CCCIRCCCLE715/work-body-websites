// All public-facing content and asset paths live here.
export const portfolio = {
  name: 'HUANGBAI',
  title: 'HUANGBAI',
  role: '3D Creator',
  intro: 'a 3d creator driven by crafting striking and unforgettable projects',
  about: "With more than five years of experience in design, i focus on branding, web design, and user experience, i truly enjoy working with businesses that aim to stand out and present their best image. Let's build something incredible together!",
  // Set your own email before sharing the portfolio as your personal site.
  email: '',
  services: [
    { name: '3D Modeling', description: 'Creation of detailed objects, characters, or environments tailored to specific client needs, ideal for games, products, and visualizations.' },
    { name: 'Rendering', description: 'High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life.' },
    { name: 'Motion Design', description: 'Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences.' },
    { name: 'Branding', description: 'Crafting cohesive visual identities — from logos to full brand systems — that communicate a clear and memorable presence.' },
    { name: 'Web Design', description: 'Designing clean, modern, and conversion-focused websites with attention to layout, typography, and user experience.' },
  ],
  videoCovers: [
    { title: '皇上模拟器', src: '/assets/video-covers/emperor-simulator.webp' },
    { title: '控制手机', src: '/assets/video-covers/phone-control.webp' },
    { title: '人生规划', src: '/assets/video-covers/life-planning.webp' },
    { title: '审美 Skill', src: '/assets/video-covers/aesthetic-skill.webp' },
    { title: 'AI 导师', src: '/assets/video-covers/ai-mentor.webp' },
    { title: '大促设计', src: '/assets/video-covers/sale-design.webp' },
    { title: 'AI 挑战', src: '/assets/video-covers/ai-challenge.webp' },
    { title: 'MiniMax H3', src: '/assets/video-covers/minimax-h3.webp' },
    { title: '千问 9 大玩法', src: '/assets/video-covers/qwen-nine-ideas.webp' },
    { title: 'AIGC 短剧', src: '/assets/video-covers/aigc-drama.webp' },
    { title: 'AI 博主', src: '/assets/video-covers/ai-creator.webp' },
    { title: '视差滚动', src: '/assets/video-covers/parallax-scroll.webp' },
  ],
  decorations: Array.from({ length: 4 }, (_, i) => `/assets/decor/${String(i + 1).padStart(2, '0')}.png`),
  projects: [
    { name: 'Nextlevel Studio', category: 'Client', discipline: '3D / Art direction', url: '', images: ['/assets/projects/01.webp', '/assets/projects/02.webp', '/assets/projects/03.webp'] },
    { name: 'Aura Brand Identity', category: 'Personal', discipline: 'Branding / Visual identity', url: '', images: ['/assets/projects/04.webp', '/assets/projects/05.webp', '/assets/projects/06.webp'] },
    { name: 'Solaris Digital', category: 'Client', discipline: 'Digital / Motion design', url: '', images: ['/assets/projects/07.webp', '/assets/projects/08.webp', '/assets/projects/09.webp'] },
  ],
};
