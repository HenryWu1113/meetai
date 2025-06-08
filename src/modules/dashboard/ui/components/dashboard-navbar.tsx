'use client'

import { Button } from '@/components/ui/button'
import { PanelLeftIcon, PanelLeftCloseIcon, SearchIcon } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { DashboardCommand } from './dashboard-command'
import { useState, useEffect } from 'react'

export const DashboardNavbar = () => {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }

    window.addEventListener('keydown', down)
    // 元件卸載時，移除事件監聽
    return () => window.removeEventListener('keydown', down)
  }, []) // [] 保證只跑一次

  return (
    <>
      <DashboardCommand open={commandOpen} setOpen={setCommandOpen} />
      <nav className='flex items-center border-b bg-background px-4 gap-x-2 py-3'>
        <Button
          variant='outline'
          className='size-9'
          onClick={toggleSidebar}
          aria-label='Toggle sidebar'
        >
          {state === 'collapsed' || isMobile ? (
            <PanelLeftIcon className='size-4' />
          ) : (
            <PanelLeftCloseIcon className='size-4' />
          )}
        </Button>
        <Button
          className='h-9 w-[240px] justify-start font-normal text-muted-foreground hover:text-muted-foreground
      '
          onClick={() => setCommandOpen((open) => !open)}
          variant='outline'
          size='sm'
        >
          <SearchIcon />
          Search
          <kbd className='ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'>
            <span className='text-xs'>⌘</span>K
          </kbd>
        </Button>
      </nav>
    </>
  )
}
