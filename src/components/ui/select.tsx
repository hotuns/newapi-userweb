'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import {
  Children,
  isValidElement,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

const EMPTY_VALUE_PREFIX = '__select-empty__'

type SelectProps = {
  children: ReactNode
  className?: string
  value?: string | number
  defaultValue?: string | number
  disabled?: boolean
  id?: string
  name?: string
  placeholder?: string
  'aria-label'?: string
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  onValueChange?: (value: string) => void
}

type SelectOption = {
  disabled?: boolean
  label: ReactNode
  internalValue: string
  value: string
}

type NativeOptionProps = {
  children?: ReactNode
  disabled?: boolean
  value?: string | number
}

function normalizeValue(value: string | number | undefined, options: SelectOption[]) {
  if (value === undefined) {
    return undefined
  }

  const stringValue = String(value)
  const option = options.find((item) => item.value === stringValue)
  return option?.internalValue ?? stringValue
}

function toExternalValue(value: string, options: SelectOption[]) {
  const option = options.find((item) => item.internalValue === value)
  return option?.value ?? value
}

function buildOptions(children: ReactNode) {
  return Children.toArray(children).flatMap((child, index) => {
    if (!isValidElement<NativeOptionProps>(child) || child.type !== 'option') {
      return []
    }

    const rawValue = child.props.value ?? ''
    const value = String(rawValue)

    return [
      {
        disabled: Boolean(child.props.disabled),
        label: child.props.children,
        internalValue: value === '' ? `${EMPTY_VALUE_PREFIX}${index}` : value,
        value,
      } satisfies SelectOption,
    ]
  })
}

export function Select({
  children,
  className,
  value,
  defaultValue,
  disabled,
  id,
  name,
  placeholder,
  onChange,
  onValueChange,
  'aria-label': ariaLabel,
}: SelectProps) {
  const options = buildOptions(children)
  const currentValue = normalizeValue(value, options)
  const currentDefaultValue = normalizeValue(defaultValue, options)

  return (
    <SelectPrimitive.Root
      value={currentValue}
      defaultValue={currentDefaultValue}
      disabled={disabled}
      name={name}
      onValueChange={(nextInternalValue) => {
        const nextValue = toExternalValue(nextInternalValue, options)

        onValueChange?.(nextValue)
        onChange?.({
          target: { value: nextValue },
        } as ChangeEvent<HTMLSelectElement>)
      }}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--muted)]',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder ?? '请选择'} />
        <SelectPrimitive.Icon className='shrink-0 text-[var(--muted)]'>
          <ChevronDown className='size-4' />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position='popper'
          sideOffset={8}
          className='z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1 text-[var(--foreground)] shadow-[var(--shadow-soft)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        >
          <SelectPrimitive.Viewport className='p-0'>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.internalValue}
                value={option.internalValue}
                disabled={option.disabled}
                className='relative flex cursor-default select-none items-center rounded-[calc(var(--radius-md)-2px)] py-2.5 pl-3 pr-9 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-[var(--accent-soft)] data-[highlighted]:text-[var(--foreground)] data-[disabled]:opacity-50'
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <span className='absolute right-3 flex size-4 items-center justify-center text-[var(--accent-strong)]'>
                  <SelectPrimitive.ItemIndicator>
                    <Check className='size-4' />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
