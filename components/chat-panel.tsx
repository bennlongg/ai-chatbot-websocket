import * as React from 'react'

import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { FooterText } from '@/components/footer'

export interface ChatPanelProps {
  isLoading: boolean
  append: () => void
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  userToSpeak: boolean
}
export function ChatPanel({
  isLoading,
  append,
  input,
  setInput,
  userToSpeak
}: ChatPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% animate-in duration-300 ease-in-out dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
      <ButtonScrollToBottom />
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        {userToSpeak && (
          <div className="flex py-3 mt-10 bg-background shrink-0 select-none items-center justify-center sm:rounded-t-xl border shadow">
            User to speak
          </div>
        )}
        <div
          className={`px-4 py-2 space-y-4 ${userToSpeak ? 'sm:rounded-t-none' : 'sm:rounded-t-xl'} border-t shadow-lg bg-background sm:border md:py-4`}
        >
          <PromptForm
            onSubmit={append}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
          />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
