'use client'

import { type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import React from 'react'
import { ChatMessage } from './chat-message'
import { Separator } from './ui/separator'
import { useWebSocket } from '@/lib/hooks/use-web-socket'
import { useChat } from '@/lib/hooks/use-chat'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ className }: ChatProps) {
  const { socket } = useWebSocket('ws://localhost:3000/chat/relay')
  const { messages, sendMessage, userToSpeak, isLoading } = useChat(socket)

  const [input, setInput] = React.useState('')

  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <div className="relative mx-auto max-w-2xl px-4">
              {messages.map((message, index) => {
                return (
                  <div key={index}>
                    <ChatMessage {...message} />
                    {index < messages.length - 1 && (
                      <Separator className="my-4 md:my-8" />
                    )}
                  </div>
                )
              })}
            </div>

            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        userToSpeak={userToSpeak}
        isLoading={isLoading}
        append={() => sendMessage(input)}
        input={input}
        setInput={setInput}
      />
    </>
  )
}
