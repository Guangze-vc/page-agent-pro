import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'wxt'

const chromeProfile = resolve(process.cwd(), '.wxt/chrome-data')
const devServerHost = '127.0.0.1'
const devServerPort = 3300
const devServerOrigin = `http://${devServerHost}:${devServerPort}`
const sourceIconPath = resolve(process.cwd(), 'src/assets/icon.png')
const publicAssetsDir = resolve(process.cwd(), 'public/assets')
const publicIconPath = resolve(publicAssetsDir, 'icon.png')

mkdirSync(chromeProfile, { recursive: true })
mkdirSync(publicAssetsDir, { recursive: true })
copyFileSync(sourceIconPath, publicIconPath)

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Default installation path for Edge on Windows
const edgeBinary = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	dev: {
		server: {
			host: devServerHost,
			port: devServerPort,
			origin: devServerOrigin,
		},
	},
	webExt: {
		// WXT expects binaries to be in this object to avoid Chrome fallback
		binaries: {
			edge: process.platform === 'win32' ? edgeBinary : undefined,
		},
		chromiumProfile: chromeProfile,
		keepProfileChanges: true,
		chromiumArgs: ['--hide-crash-restore-bubble'],
	},
	vite: () => ({
		plugins: [tailwindcss()],
		define: {
			__VERSION__: JSON.stringify(pkg.version),
		},
		optimizeDeps: {
			force: true,
		},
		build: {
			minify: false,
			chunkSizeWarningLimit: 2000,
			cssCodeSplit: true,
			rollupOptions: {
				onwarn: function (message, handler) {
					if (message.code === 'EVAL') return
					handler(message)
				},
			},
		},
	}),
	zip: {
		artifactTemplate: 'page-agent-ext-{{version}}-{{browser}}.zip',
	},
	manifest: {
		key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqbzT0iTYeYlnCvDJIGDnGU8oarJgZILDzSfLi/ufuSxXEPDKuMyD892GhvrMCZNVHS11Sh6NYUOc/PcUOhtaR2urHtcNkrpSJNV10zUamY7fxBdVEkOucfyLu8INVy+teis62MoRWYPaUPkfZUjrLGW8MsZ9aFzARfu9GGDEp2EAYsWDN6w6vyz9LJ82pm542EWnVT4MjmDPgvYFCWGBtaU/dfHD+GAX6URJFapsCvryVURKJ+76c/GO9/I3EX1IBfbY6dec78bLCMvVxiTmiv36KyGPwX1OpakW8IiCpXWdbAxjm+plbYlp5t5zTyyoE3sOSFeXsBH0Kg27o8GcvQIDAQAB',
		default_locale: 'en',
		name: '__MSG_extName__',
		description: '__MSG_extDescription__',
		homepage_url: 'https://alibaba.github.io/page-agent/',
		permissions: ['tabs', 'tabGroups', 'sidePanel', 'storage'],
		host_permissions: ['<all_urls>'],
		icons: {
			16: 'assets/icon.png',
			32: 'assets/icon.png',
			48: 'assets/icon.png',
			64: 'assets/icon.png',
			128: 'assets/icon.png',
		},
		action: {
			default_title: '__MSG_extActionTitle__',
			default_icon: 'assets/icon.png',
		},
		web_accessible_resources: [
			{
				resources: ['main-world.js'],
				matches: ['*://*/*'],
			},
		],
		side_panel: {
			default_path: 'sidepanel.html',
		},
		externally_connectable: {
			matches: ['http://localhost/*'],
		},
	},
})
