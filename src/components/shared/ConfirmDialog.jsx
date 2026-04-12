import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfirmDialog({ open, onOpenChange, title, description, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, variant = "default" }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[hsl(var(--foreground))]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[hsl(var(--muted-foreground))]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[hsl(var(--primary))] hover:bg-blue-600 text-white'
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}