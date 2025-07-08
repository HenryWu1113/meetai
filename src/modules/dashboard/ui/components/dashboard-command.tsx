import {
  CommandResponsiveDialog,
  CommandInput,
  CommandItem,
  CommandList,
  CommandGroup,
  CommandEmpty
} from '@/components/ui/command'
import { Dispatch, SetStateAction, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import { GeneratedAvatar } from '@/components/generated-avatar'

interface Props {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

export const DashboardCommand = ({ open, setOpen }: Props) => {
  const [search, setSearch] = useState('')
  const router = useRouter()
  const trpc = useTRPC()
  const meetings = useQuery(
    trpc.meetings.getMany.queryOptions({
      search,
      pageSize: 100
    })
  )
  const agents = useQuery(
    trpc.agents.getMany.queryOptions({
      search,
      pageSize: 100
    })
  )
  return (
    <CommandResponsiveDialog
      shouldFilter={false}
      open={open}
      onOpenChange={setOpen}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder='Find a meeting or agent...'
      />
      <CommandList>
        <CommandGroup heading='Meetings'>
          <CommandEmpty>
            <span className='text-muted-foreground text-sm'>
              No meetings found
            </span>
          </CommandEmpty>
          {meetings.data?.items.map((meeting) => (
            <CommandItem
              onClick={() => router.push(`/meetings/${meeting.id}`)}
              key={meeting.id}
            >
              {meeting.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading='Agents'>
          <CommandEmpty>
            <span className='text-muted-foreground text-sm'>
              No meetings found
            </span>
          </CommandEmpty>
          {agents.data?.items.map((agent) => (
            <CommandItem
              onClick={() => router.push(`/agents/${agent.id}`)}
              key={agent.id}
            >
              <GeneratedAvatar
                seed={agent.name}
                variant='botttsNeutral'
                className='size-5'
              />
              {agent.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandResponsiveDialog>
  )
}
