/**
 * Wraps a single interactive child (Button, IconButton, etc.) and disables
 * it with a tooltip when the current user lacks `permission`. Render-prop
 * variant lets callers compose more complex disabled states.
 *
 * Usage:
 *   <PermissionGate permission="manage:assets">
 *     <Button onClick={...}>New asset</Button>
 *   </PermissionGate>
 */
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole, deniedReason, type Permission } from "@/hooks/useUserRole";

interface Props {
  permission: Permission;
  children: React.ReactElement;
  /** When true, the gated element is hidden completely instead of disabled. */
  hideWhenDenied?: boolean;
}

export function PermissionGate({ permission, children, hideWhenDenied }: Props) {
  const { isAllowed, role } = useUserRole();
  const allowed = isAllowed(permission);

  if (allowed) return children;
  if (hideWhenDenied) return null;

  // Force-disable the child while preserving its other props.
  const disabledChild = React.cloneElement(children, {
    disabled: true,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    "aria-disabled": true,
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span ensures the tooltip works on disabled elements */}
        <span className="inline-block cursor-not-allowed">{disabledChild}</span>
      </TooltipTrigger>
      <TooltipContent>{deniedReason(permission, role)}</TooltipContent>
    </Tooltip>
  );
}
