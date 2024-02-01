'use client'

import { type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useCallback, useEffect, useState } from 'react'
import React from 'react'
import { ChatMessage } from './chat-message'
import { Separator } from './ui/separator'
import { useWebSocket } from '@/lib/hooks/use-web-socket'
import { useChat } from '@/lib/hooks/use-chat'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

/**
 * Type definition for a segment of a message.
 */
type MessageSegment = {
  content: string
  index: number
  name: string
  id: string
}

/**
 * Type definition for a notice indicating the next speaker.
 */
type SpeakerNotice = {
  nextSpeaker: string
}

/**
 * Union type for incoming data, which can be either a message segment or a speaker notice.
 */
type IncomingData = MessageSegment | SpeakerNotice

/**
 * Type definition for a full message.
 */
type FullMessage = {
  type: 'MESSAGE'
  content: string
  name: string
  id: string
}

/**
 * Custom hook for managing a WebSocket connection and handling messages.
 * @param {string} url - The WebSocket URL to connect to.
 * @returns An object containing the sendMessage function and various state values.
 */
const useWebSocketWithReducer = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<FullMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState<MessageSegment[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [userToSpeak, setUserToSpeak] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Initialize WebSocket connection.
  useEffect(() => {
    const webSocket = new WebSocket(url)
    webSocket.onopen = () => console.log('WebSocket Connected')
    webSocket.onerror = () => setError(new Error('WebSocket Error'))
    webSocket.onclose = () => console.log('WebSocket Disconnected')

    setSocket(webSocket)

    return () => {
      webSocket.close()
    }
  }, [url])

  /**
   * Sends a message through the WebSocket and updates the local message state.
   * @param {string} message - The message to send.
   */
  const sendMessage = useCallback(
    (message: string) => {
      setUserToSpeak(false)
      setMessages(prevMessages => [
        ...prevMessages,
        { type: 'MESSAGE', content: message, name: 'User', id: 'user' }
      ])
      if (socket) {
        socket.send(message)
      }
    },
    [socket]
  )

  /**
   * Combines message segments into a full message.
   * @param {MessageSegment[]} segments - An array of message segments.
   * @returns {FullMessage[]} An array containing the combined full message.
   */
  const combineMessageSegments = (
    segments: MessageSegment[]
  ): FullMessage[] => {
    if (segments.length === 0) {
      return []
    }
    const sortedSegments = segments.sort((a, b) => a.index - b.index)
    const content = sortedSegments.map(segment => segment.content).join('')
    const name = sortedSegments[0].name
    const id = sortedSegments[0].id
    return [{ type: 'MESSAGE', content, name, id }]
  }

  // Handle incoming WebSocket messages.
  useEffect(() => {
    if (socket) {
      socket.onmessage = event => {
        try {
          setIsLoading(true)
          const data: IncomingData = JSON.parse(event.data)

          if ('content' in data) {
            setUserToSpeak(false)
            setCurrentMessage(prevSegments => [...prevSegments, data])
          } else if ('nextSpeaker' in data) {
            const fullMessage = combineMessageSegments(currentMessage)

            setUserToSpeak(data.nextSpeaker === 'User')
            setIsLoading(data.nextSpeaker !== 'User')
            setMessages(prevMessages => [...prevMessages, ...fullMessage])

            setCurrentMessage([])
          }
        } catch (error) {
          setError(new Error('Failed to parse incoming message'))
        }
      }
    }
  }, [socket, currentMessage])

  return {
    sendMessage,
    messages: [...messages, ...combineMessageSegments(currentMessage)],
    error,
    userToSpeak,
    isLoading
  }
}

export function Chat({ className }: ChatProps) {
  // const { messages, sendMessage, userToSpeak, isLoading } =
  //   useWebSocketWithReducer('ws://localhost:3000/chat/relay')

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
