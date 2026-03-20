/**
 * content script for RemotePageController
 */
import { PageController } from '@page-agent/page-controller'

export function initPageController() {
	let pageController: PageController | null = null
	let intervalID: number | null = null

	const myTabIdPromise = chrome.runtime
		.sendMessage({ type: 'PAGE_CONTROL', action: 'get_my_tab_id' })
		.then((response) => {
			return (response as { tabId: number | null }).tabId
		})
		.catch((error) => {
			console.error('[RemotePageController.ContentScript]: Failed to get my tab id', error)
			return null
		})

	function getPC(): PageController {
		if (!pageController) {
			pageController = new PageController({ enableMask: false, viewportExpansion: 400 })
		}
		return pageController
	}

	intervalID = window.setInterval(async () => {
		const agentHeartbeat = (await chrome.storage.local.get('agentHeartbeat')).agentHeartbeat
		const now = Date.now()
		const agentInTouch = typeof agentHeartbeat === 'number' && now - agentHeartbeat < 2_000

		const isAgentRunning = (await chrome.storage.local.get('isAgentRunning')).isAgentRunning
		const currentTabId = (await chrome.storage.local.get('currentTabId')).currentTabId

		const shouldShowMask = isAgentRunning && agentInTouch && currentTabId === (await myTabIdPromise)

		if (shouldShowMask) {
			const pc = getPC()
			pc.initMask()
			await pc.showMask()
		} else {
			// await getPC().hideMask()
			if (pageController) {
				pageController.hideMask()
				pageController.cleanUpHighlights()
			}
		}

		if (!isAgentRunning && agentInTouch) {
			if (pageController) {
				pageController.dispose()
				pageController = null
			}
		}
	}, 500)

	chrome.runtime.onMessage.addListener((message, sender, sendResponse): true | undefined => {
		if (message.type !== 'PAGE_CONTROL') {
			// sendResponse({
			// 	success: false,
			// 	error: `[RemotePageController.ContentScript]: Invalid message type: ${message.type}`,
			// })
			return
		}

		const { action, payload } = message
		const methodName = getMethodName(action)

		const pc = getPC() as any

		switch (action) {
			case 'get_chat_messages_fingerprint': {
				void getChatMessagesFingerprint()
					.then((result) => sendResponse(result))
					.catch((error: unknown) =>
						sendResponse({
							success: false,
							fingerprint: '',
							messageCount: 0,
							reason: error instanceof Error ? error.message : String(error),
						})
					)
				break
			}

			case 'get_last_update_time':
			case 'get_browser_state':
			case 'update_tree':
			case 'clean_up_highlights':
			case 'click_element':
			case 'input_text':
			case 'select_option':
			case 'scroll':
			case 'scroll_horizontally':
			case 'execute_javascript':
				pc[methodName](...(payload || []))
					.then((result: any) => sendResponse(result))
					.catch((error: any) =>
						sendResponse({
							success: false,
							error: error instanceof Error ? error.message : String(error),
						})
					)
				break

			default:
				sendResponse({
					success: false,
					error: `Unknown PAGE_CONTROL action: ${action}`,
				})
		}

		return true
	})
}

async function getChatMessagesFingerprint(): Promise<{
	success: boolean
	fingerprint: string
	messageCount: number
	reason?: string
}> {
	const container =
		document.querySelector<HTMLElement>('#imSessionList') ??
		document.querySelector<HTMLElement>('[role="log"]') ??
		document.querySelector<HTMLElement>('[aria-live]')

	if (!container)
		return { success: false, fingerprint: '', messageCount: 0, reason: 'container_not_found' }

	const normalizedText = (container.innerText || '').replace(/\s+/g, ' ').trim()
	const fingerprint = normalizedText ? await sha256Hex(normalizedText) : ''

	const unreadDotNodes = container.querySelectorAll<HTMLElement>('[class*="unreadDot" i]')
	const messageCount = unreadDotNodes.length

	return { success: true, fingerprint, messageCount }
}

async function sha256Hex(text: string): Promise<string> {
	if (globalThis.crypto?.subtle && typeof TextEncoder !== 'undefined') {
		const data = new TextEncoder().encode(text)
		const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
		return Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
	}

	let hash = 0
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) >>> 0
	}
	return `h${hash.toString(16)}`
}

function getMethodName(action: string): string {
	switch (action) {
		case 'get_last_update_time':
			return 'getLastUpdateTime' as const
		case 'get_browser_state':
			return 'getBrowserState' as const
		case 'update_tree':
			return 'updateTree' as const
		case 'clean_up_highlights':
			return 'cleanUpHighlights' as const

		// DOM actions

		case 'click_element':
			return 'clickElement' as const
		case 'input_text':
			return 'inputText' as const
		case 'select_option':
			return 'selectOption' as const
		case 'scroll':
			return 'scroll' as const
		case 'scroll_horizontally':
			return 'scrollHorizontally' as const
		case 'execute_javascript':
			return 'executeJavascript' as const

		default:
			return action
	}
}
