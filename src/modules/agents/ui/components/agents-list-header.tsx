'use client'
import { Button } from '@/components/ui/button'
import { PlusIcon, XCircleIcon } from 'lucide-react'
import { NewAgentDialog } from './new-agent-dialog'
import { useState } from 'react'
import { useAgentsFilters } from '../../hooks/use-agents-filters'
import { AgentsSearchFilters } from './agents-search-filters'
import { DEFAULT_PAGE } from '@/constants'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

export const AgentsListHeader = () => {
  const [filters, setFilters] = useAgentsFilters()
  const [open, setOpen] = useState(false)

  const isAnyFilterModified = !!filters.search

  const onClearFilters = () => {
    setFilters({
      search: '',
      page: DEFAULT_PAGE
    })
  }

  return (
    <>
      <NewAgentDialog open={open} onOpenChange={setOpen} />
      <div className='py-4 px-4 md:px-8 flex flex-col gap-y-4'>
        <div className='flex items-center justify-between'>
          <h5 className='text-xl font-medium'>My Agents</h5>
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New Agent
          </Button>
        </div>
        <ScrollArea>
          <div className='flex items-center gap-x-2 p-1'>
            <AgentsSearchFilters />
            {isAnyFilterModified && (
              <Button variant='outline' size='sm' onClick={onClearFilters}>
                <XCircleIcon />
                Clear
              </Button>
            )}
          </div>
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
      </div>
    </>
  )
}
