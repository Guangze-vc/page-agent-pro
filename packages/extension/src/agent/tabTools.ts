/**
 * Tab control tools for browser extension
 *
 * These tools allow the agent to manage multiple browser tabs:
 * - open_new_tab: Open a new tab and set it as current
 * - switch_to_tab: Switch to an existing tab
 * - close_tab: Close a tab (optionally switch to another)
 * - notify_feishu: Notify human staff via Feishu when manual intervention is needed
 */
import * as z from 'zod/v4'

import type { TabsController } from './TabsController'

const FEISHU_NOTIFY_API = 'http://localhost:3000/api/feishu/notify'

/** Tool definition compatible with PageAgentCore customTools */
interface TabTool {
	description: string
	inputSchema: z.ZodType
	execute: (input: unknown) => Promise<string>
}

/**
 * Create tab control tools bound to a TabsManager instance.
 * These tools are injected into PageAgentCore via customTools config.
 */
export function createTabTools(tabsController: TabsController): Record<string, TabTool> {
	return {
		open_new_tab: {
			description:
				'Open a new browser tab with the specified URL. The new tab becomes the current tab for all subsequent page operations.',
			inputSchema: z.object({
				url: z.string().describe('The URL to open in the new tab'),
			}),
			execute: async (input: unknown) => {
				const { url } = input as { url: string }
				try {
					return await tabsController.openNewTab(url)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},

		switch_to_tab: {
			description:
				'Switch to an existing tab by its ID. After switching, all page operations will target the new current tab. You can only switch to tabs in the tab list shown in browser state.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('The tab ID to switch to'),
			}),
			execute: async (input: unknown) => {
				const { tab_id } = input as { tab_id: number }
				try {
					return await tabsController.switchToTab(tab_id)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},

		close_tab: {
			description:
				'Close a tab by its ID. Cannot close the initial tab. Optionally specify which tab to switch to after closing.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('The tab ID to close'),
			}),
			execute: async (input: unknown) => {
				const { tab_id } = input as { tab_id: number }
				try {
					return await tabsController.closeTab(tab_id)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},

		notify_feishu: {
			description:
				'Notify human staff via Feishu when manual intervention is required (e.g. return/exchange requests, invoice requests, missing shipments, quality issues). Call this tool after identifying the need for human escalation from the chat history.',
			inputSchema: z.object({
				orderNo: z
					.string()
					.describe('Order number, extract from chat history if available, otherwise use "未知"'),
				customerName: z
					.string()
					.describe(
						'Customer name or nickname, extract from chat history if available, otherwise use "未知"'
					),
				product: z.string().describe('Product name and quantity mentioned by the customer'),
				orderTime: z
					.string()
					.describe(
						"Order time in YYYY-MM-DD format, extract from chat history if available, otherwise use today's date"
					),
				afterSalesType: z
					.enum(['用户退货', '用户换货', '用户需要开发票', '漏发货需补发货', '质量问题'])
					.describe('Type of after-sales issue requiring human intervention'),
				remark: z
					.string()
					.describe("Brief summary of the customer's issue based on the chat history"),
				atUserId: z
					.string()
					.optional()
					.describe('Feishu user ID to @ notify, leave empty if unknown'),
			}),
			execute: async (input: unknown) => {
				const payload = input as {
					orderNo: string
					customerName: string
					product: string
					orderTime: string
					afterSalesType: string
					remark: string
					atUserId?: string
				}
				try {
					const response = await fetch(FEISHU_NOTIFY_API, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							accept: '*/*',
						},
						body: JSON.stringify(payload),
					})
					if (!response.ok) {
						const text = await response.text()
						return `❌ 飞书通知发送失败 (${response.status}): ${text}`
					}
					return `✅ 已成功通知人工客服处理（${payload.afterSalesType}），订单号：${payload.orderNo}`
				} catch (error) {
					return `❌ 飞书通知发送失败: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},
	}
}
