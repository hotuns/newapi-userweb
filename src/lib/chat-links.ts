import type { ChatTemplateConfig } from '@/types/api'

const SUPPORTED_PLACEHOLDERS = new Set(['address', 'key'])

export type GenericChatTemplate = {
  name: string
  template: string
}

function extractPlaceholders(template: string) {
  return Array.from(template.matchAll(/\{([^}]+)\}/g)).map((match) => match[1].trim())
}

export function isSupportedGenericChatTemplate(template: string) {
  const placeholders = extractPlaceholders(template)
  return (
    placeholders.length > 0 &&
    placeholders.every((placeholder) => SUPPORTED_PLACEHOLDERS.has(placeholder))
  )
}

export function parseGenericChatTemplates(chats?: ChatTemplateConfig[] | null) {
  const templates: GenericChatTemplate[] = []

  for (const item of chats ?? []) {
    const [entry] = Object.entries(item)
    if (!entry) {
      continue
    }

    const [name, template] = entry
    if (!name || !template) {
      continue
    }

    if (!isSupportedGenericChatTemplate(template)) {
      continue
    }

    templates.push({ name, template })
  }

  return templates
}

export function buildGenericChatLaunchUrl(
  template: string,
  apiBaseUrl: string,
  apiKey: string
) {
  const normalizedBaseUrl = apiBaseUrl.replace(/\/$/, '')
  const normalizedKey = apiKey.startsWith('sk-') ? apiKey : `sk-${apiKey}`

  return template
    .replaceAll('{address}', encodeURIComponent(normalizedBaseUrl))
    .replaceAll('{key}', normalizedKey)
}
