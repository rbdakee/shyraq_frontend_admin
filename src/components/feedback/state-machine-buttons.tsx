import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Action {
  key: string;
  label: string;
  enabled: boolean;
  disabledReason?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  onClick: () => void;
}

interface StateMachineButtonsProps {
  actions: Action[];
  className?: string;
}

export function StateMachineButtons({ actions, className }: StateMachineButtonsProps) {
  return (
    <TooltipProvider>
      <div className={className ?? 'flex items-center gap-2'}>
        {actions.map((action) =>
          action.enabled ? (
            <Button key={action.key} variant={action.variant ?? 'outline'} onClick={action.onClick}>
              {action.label}
            </Button>
          ) : (
            <Tooltip key={action.key}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex">
                  <Button
                    variant={action.variant ?? 'outline'}
                    disabled
                    className="pointer-events-none"
                  >
                    {action.label}
                  </Button>
                </span>
              </TooltipTrigger>
              {action.disabledReason && <TooltipContent>{action.disabledReason}</TooltipContent>}
            </Tooltip>
          ),
        )}
      </div>
    </TooltipProvider>
  );
}
