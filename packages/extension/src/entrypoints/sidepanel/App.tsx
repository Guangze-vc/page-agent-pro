import { History, Send, Settings, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ConfigPanel } from '@/components/ConfigPanel'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { ActivityCard, EventCard } from '@/components/cards'
import { EmptyState, Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { saveSession } from '@/lib/db'

import { useAgent } from '../../agent/useAgent'

type View =
	| { name: 'chat' }
	| { name: 'config' }
	| { name: 'history' }
	| { name: 'history-detail'; sessionId: string }

export default function App() {
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		configure,
		getChatMessagesFingerprint,
	} = useAgent()

	const statusRef = useRef(status)
	useEffect(() => {
		statusRef.current = status
	}, [status])

	useEffect(() => {
		console.log('[SidePanel] App mounted')
	}, [])

	// Persist session when task finishes
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status

		if (
			prev === 'running' &&
			(status === 'completed' || status === 'error') &&
			history.length > 0 &&
			currentTask
		) {
			saveSession({ task: currentTask, history, status }).catch((err) =>
				console.error('[SidePanel] Failed to save session:', err)
			)
		}
	}, [status, history, currentTask])

	// Auto-scroll to bottom on new events
	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [history, activity])

	const chatWatcherIntervalRef = useRef<number | null>(null)
	const lastChatFingerprintRef = useRef<string>('')

	const stopChatWatcher = useCallback(() => {
		if (chatWatcherIntervalRef.current !== null) {
			window.clearInterval(chatWatcherIntervalRef.current)
			chatWatcherIntervalRef.current = null
		}
		lastChatFingerprintRef.current = ''
	}, [])

	useEffect(() => {
		return () => {
			stopChatWatcher()
		}
	}, [stopChatWatcher])

	// Watch chat for new messages after each agent run completes.
	const prevAgentStatusForWatcherRef = useRef(status)
	useEffect(() => {
		const prev = prevAgentStatusForWatcherRef.current
		prevAgentStatusForWatcherRef.current = status

		console.log('[ChatWatcher] status transition', {
			prev,
			status,
			currentTask,
		})

		if (status === 'running') {
			stopChatWatcher()
			return
		}

		if (prev !== 'running') return
		if (!(status === 'completed' || status === 'error')) return
		if (!currentTask) return

		void (async () => {
			stopChatWatcher()

			try {
				const initial = await getChatMessagesFingerprint()
				console.log('[ChatWatcher] initial fingerprint:', initial)

				if (!initial.success || !initial.fingerprint) {
					console.log('[ChatWatcher] container not ready, skip auto-restart')
					return
				}

				lastChatFingerprintRef.current = initial.fingerprint

				chatWatcherIntervalRef.current = window.setInterval(async () => {
					try {
						if (statusRef.current === 'running') return

						const latest = await getChatMessagesFingerprint()
						if (!latest.success || !latest.fingerprint) return

						if (latest.fingerprint !== lastChatFingerprintRef.current) {
							console.log('[ChatWatcher] detected new message(s):', latest)

							lastChatFingerprintRef.current = latest.fingerprint
							stopChatWatcher()

							void execute(currentTask).catch((error) => {
								console.error('[SidePanel] Failed to auto-execute task:', error)
							})
						}
					} catch (error) {
						console.error('[ChatWatcher] polling error:', error)
					}
				}, 1000)
			} catch (error) {
				console.error('[ChatWatcher] failed to start watcher:', error)
			}
		})()
	}, [status, currentTask, execute, getChatMessagesFingerprint, stopChatWatcher])

	const runTask = useCallback(
		(task: string) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || statusRef.current === 'running') return

			setInputValue('')
			setView({ name: 'chat' })
			stopChatWatcher()

			execute(normalizedTask).catch((error) => {
				console.error('[SidePanel] Failed to execute task:', error)
			})
		},
		[execute, stopChatWatcher]
	)

	const handleSubmit = useCallback(
		(e?: React.SyntheticEvent) => {
			e?.preventDefault()
			runTask(inputValue)
		},
		[inputValue, runTask]
	)

	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
		stopChatWatcher()
	}, [stop, stopChatWatcher])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			handleSubmit()
		}
	}

	// --- View routing ---

	if (view.name === 'config') {
		return (
			<ConfigPanel
				config={config}
				onSave={async (newConfig) => {
					await configure(newConfig)
					setView({ name: 'chat' })
				}}
				onClose={() => setView({ name: 'chat' })}
			/>
		)
	}

	if (view.name === 'history') {
		return (
			<HistoryList
				onSelect={(id) => setView({ name: 'history-detail', sessionId: id })}
				onBack={() => setView({ name: 'chat' })}
				onRerun={runTask}
			/>
		)
	}

	if (view.name === 'history-detail') {
		return (
			<HistoryDetail
				sessionId={view.sessionId}
				onBack={() => setView({ name: 'history' })}
				onRerun={runTask}
			/>
		)
	}

	// --- Chat view ---

	const isRunning = status === 'running'
	const showEmptyState = !currentTask && history.length === 0 && !isRunning

	return (
		<div className="relative flex flex-col h-screen bg-background">
			<MotionOverlay active={isRunning} />
			{/* Header */}
			<header className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-medium">Page Agent Ext</span>
				</div>
				<div className="flex items-center gap-1">
					<StatusDot status={status} />
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'history' })}
						className="cursor-pointer"
					>
						<History className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'config' })}
						className="cursor-pointer"
					>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 overflow-hidden flex flex-col">
				{/* Current task */}
				{currentTask && (
					<div className="border-b px-3 py-2 bg-muted/30">
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">Task</div>
						<div className="text-xs font-medium truncate" title={currentTask}>
							{currentTask}
						</div>
					</div>
				)}

				{/* History */}
				<div ref={historyRef} className="flex-1 overflow-y-auto p-3 space-y-2">
					{showEmptyState && <EmptyState />}

					{history.map((event, index) => (
						// eslint-disable-next-line react-x/no-array-index-key
						<EventCard key={index} event={event} />
					))}

					{/* Activity indicator at bottom */}
					{activity && <ActivityCard activity={activity} />}
				</div>
			</main>

			{/* Input */}
			<footer className="border-t p-3">
				<InputGroup className="relative rounded-lg">
					<InputGroupTextarea
						ref={textareaRef}
						placeholder="Describe your task... (Enter to send)"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isRunning}
						className="text-xs pr-12 min-h-10"
					/>
					<InputGroupAddon align="inline-end" className="absolute bottom-0 right-0">
						{isRunning ? (
							<InputGroupButton
								size="icon-sm"
								variant="destructive"
								onClick={handleStop}
								className="size-7"
							>
								<Square className="size-3" />
							</InputGroupButton>
						) : (
							<InputGroupButton
								size="icon-sm"
								variant="default"
								onClick={() => handleSubmit()}
								disabled={!inputValue.trim()}
								className="size-7 cursor-pointer"
							>
								<Send className="size-3" />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</footer>
		</div>
	)
}
