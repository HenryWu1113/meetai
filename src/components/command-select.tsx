import { ReactNode, useState } from 'react'
import { ChevronsUpDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

import {
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResponsiveDialog
} from '@/components/ui/command'

interface Props {
  options: Array<{
    id: string
    value: string
    children: ReactNode
  }>
  onSelect: (value: string) => void
  onSearch?: (value: string) => void
  value: string
  placeholder?: string
  isSearchable?: boolean
  className?: string
}

export const CommandSelect = ({
  options,
  onSelect,
  onSearch,
  value,
  placeholder,
  className
}: Props) => {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((option) => option.value === value)

  const handleOpenChange = (open: boolean) => {
    console.log('open', open)
    onSearch?.('')
    setOpen(open)
  }

  return (
    <>
      <Button
        type='button'
        variant='outline'
        className={cn(
          'h-9 font-normal px-2 justify-between',
          !selectedOption && 'text-muted-foreground',
          className
        )}
        onClick={() => setOpen(true)}
      >
        {selectedOption?.children ?? placeholder}
        <ChevronsUpDownIcon className='size-4' />
      </Button>
      <CommandResponsiveDialog
        shouldFilter={!onSearch}
        open={open}
        onOpenChange={handleOpenChange}
      >
        <CommandInput placeholder='Search...' onValueChange={onSearch} />
        <CommandList>
          <CommandEmpty>
            <span className='text-sm text-muted-foreground'>
              No options found
            </span>
          </CommandEmpty>
          {options.map((option) => (
            <CommandItem
              key={option.id}
              value={option.value}
              onSelect={() => {
                onSelect(option.value)
                setOpen(false)
              }}
            >
              {option.children}
            </CommandItem>
          ))}
        </CommandList>
      </CommandResponsiveDialog>
    </>
  )
}
