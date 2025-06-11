import { ResponsiveDialog } from '@/components/responsive-dialog'
import { AgentsForm } from './agents-form'

interface NewAgentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const NewAgentsDialog = ({
  open,
  onOpenChange
}: NewAgentsDialogProps) => {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title='New Agent'
      description='Create a new agent'
    >
      <AgentsForm
        onSuccess={() => {
          onOpenChange(false)
        }}
        onCancel={() => {
          onOpenChange(false)
        }}
      />
    </ResponsiveDialog>
  )
}
