import { defineManifest } from '@crxjs/vite-plugin'
import { version } from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'agentsale',
  version,
  icons: {
    '48': 'public/logo.png'
  },
  action: {
    default_icon: {
      '48': 'public/logo.png'
    },
    default_popup: 'src/popup/index.html'
  },
  permissions: [
    'sidePanel',
    'contentSettings',
    'storage'
  ],
  content_scripts: [
    {
      js: ['src/content/main.tsx'],
      matches: ['https://meet.google.com/*']
    }
  ],
  host_permissions: [
    'https://meet.google.com/*',
    'https://docs.paywithlocus.com/*',
    'https://api.llm7.io/*'
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html'
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  web_accessible_resources: [
    {
      matches: ['<all_urls>'],
      resources: ['**/*', '*'],
      use_dynamic_url: false
    }
  ]
})
