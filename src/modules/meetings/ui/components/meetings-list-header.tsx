'use client'
import { Button } from '@/components/ui/button'
import { PlusIcon, XCircleIcon } from 'lucide-react'
import { NewMeetingDialog } from './new-meeting-dialog'
import { useState } from 'react'
import { MeetingsSearchFilters } from './meetings-search-filters'
import { StatusFilter } from './status-filter'
import { AgentIdFilter } from './agent-id-filter'
import { useMeetingsFilters } from '../../hooks/use-meetings-filters'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { DEFAULT_PAGE } from '@/constants'

export const MeetingsListHeader = () => {
  const [filters, setFilters] = useMeetingsFilters()
  const [open, setOpen] = useState(false)

  const isAnyFilterModified =
    !!filters.agentId || !!filters.status || !!filters.search

  const onClearFilters = () => {
    setFilters({
      status: null,
      agentId: '',
      search: '',
      page: DEFAULT_PAGE
    })
  }

  return (
    <>
      <NewMeetingDialog open={open} onOpenChange={setOpen} />
      <div className='py-4 px-4 md:px-8 flex flex-col gap-y-4'>
        <div className='flex items-center justify-between'>
          <h5 className='text-xl font-medium'>My Meetings</h5>
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New Meeting
          </Button>
        </div>
        <ScrollArea>
          <div className='flex items-center gap-x-2 p-1'>
            <MeetingsSearchFilters />
            <StatusFilter />
            <AgentIdFilter />
            {isAnyFilterModified && (
              <Button variant='outline' onClick={onClearFilters}>
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
